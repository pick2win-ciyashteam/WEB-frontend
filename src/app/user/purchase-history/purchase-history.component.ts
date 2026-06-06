import { Component, OnInit } from '@angular/core';
import { ApiService } from 'src/app/core/services/api.service';

interface PurchaseHistory {
  id: number;
  coins: number;
  amount: string;
  opening_coins: number;
  closing_coins: number;
  reference_id: string;
  status: string;
  created_at: string;
  transaction_type: string;
  plan_name: string;
  plan_subtitle: string;
  expiry_date?: string;
  expires_at?: string;
  package_expiry_date?: string;
  plan_expiry_date?: string;
  subscription_expiry_date?: string;
  valid_until?: string;
  [key: string]: any;
}

@Component({
  selector: 'app-purchase-history',
  templateUrl: './purchase-history.component.html',
  styleUrls: ['./purchase-history.component.css']
})
export class PurchaseHistoryComponent implements OnInit {
  history: PurchaseHistory[] = [];
  loading = false;
  errorMessage = '';

  totalPacks = 0;
  totalCoins = 0;

  constructor(private api: ApiService) {}

  ngOnInit(): void {
    this.getPurchaseHistory();
  }

  getPurchaseHistory(): void {
    this.loading = true;
    this.errorMessage = '';

    this.api.GetPurchaseHistory().subscribe({
      next: (res: any) => {
        const history: PurchaseHistory[] = Array.isArray(res?.data) ? res.data : [];
        this.history = history.filter(item => this.isPurchaseTransaction(item));
        this.history.forEach(item => this.logMissingExpiryDate(item));

        this.totalPacks = this.history.length;
        this.totalCoins = this.history.reduce(
          (sum, item) => sum + Number(item.coins || 0),
          0
        );

        this.loading = false;
      },
      error: () => {
        this.history = [];
        this.totalPacks = 0;
        this.totalCoins = 0;
        this.errorMessage = 'Unable to load purchase history.';
        this.loading = false;
      }
    });
  }

  formatDate(value: string): string {
    if (!value) return '-';

    return new Intl.DateTimeFormat('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(value));
  }

  packageExpiryDate(item: PurchaseHistory): string {
    const expiryDate =
      item.expiry_date ||
      item.expires_at ||
      item.package_expiry_date ||
      item.plan_expiry_date ||
      item.subscription_expiry_date ||
      item.valid_until;

    return expiryDate ? this.formatDate(expiryDate) : '-';
  }

  shortPaymentId(value: string): string {
    if (!value) return '-';
    return value.length > 16 ? `${value.slice(0, 14)}...` : value;
  }

  statusLabel(status: string): string {
    return status?.toLowerCase() === 'success' ? 'Paid' : status || '-';
  }

  downloadHistoryCSV(): void {
    if (!this.history.length) return;

    const rows = this.history.map((item, index) => ({
      SNo: index + 1,
      PurchaseDate: this.formatDate(item.created_at),
      Pack: item.plan_name,
      Subtitle: item.plan_subtitle,
      PackageExpiryDate: this.packageExpiryDate(item),
      CoinsAdded: item.coins,
      AmountUSD: item.amount,
      OpeningCoins: item.opening_coins,
      ClosingCoins: item.closing_coins,
      PaymentID: item.reference_id,
      Status: this.statusLabel(item.status)
    }));

    this.downloadCSV(rows, 'Pick2Win-Coin-Purchase-History.csv');
  }

  private downloadCSV(rows: any[], fileName: string): void {
    const headers = Object.keys(rows[0]);

    const csv = [
      headers.join(','),
      ...rows.map(row =>
        headers
          .map(header => `"${String(row[header] ?? '').replace(/"/g, '""')}"`)
          .join(',')
      )
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');

    link.href = URL.createObjectURL(blob);
    link.download = fileName;
    link.click();

    URL.revokeObjectURL(link.href);
  }

  private logMissingExpiryDate(item: PurchaseHistory): void {
    if (this.packageExpiryDate(item) !== '-') {
      return;
    }

    console.log('Purchase history item missing package expiry date:', item);
  }

  private isPurchaseTransaction(item: PurchaseHistory): boolean {
    return String(item.transaction_type || '').toLowerCase() === 'purchase';
  }
}
