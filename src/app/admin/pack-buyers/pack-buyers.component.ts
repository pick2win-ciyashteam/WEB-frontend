import { Component, OnInit } from '@angular/core';
import { AdminPackBuyersReports, AdminPackCurrencyStats } from 'src/app/core/interfaces/admin';
import { AdminService } from 'src/app/core/services/admin.service';

interface PackCurrencyRow {
  plan_name: string;
  plan_coins: number;
  currency: string;
  buyers: number;
  revenue: string;
}

@Component({
  selector: 'app-pack-buyers',
  templateUrl: './pack-buyers.component.html',
  styleUrls: ['./pack-buyers.component.css']
})
export class PackBuyersComponent implements OnInit {
  loading = false;
  errorMessage = '';
  reports: AdminPackBuyersReports | null = null;
  currencyRows: PackCurrencyRow[] = [];

  constructor(private adminService: AdminService) { }

  ngOnInit(): void {
    this.loadPackBuyers();
  }

  loadPackBuyers(): void {
    this.loading = true;
    this.errorMessage = '';

    this.adminService.getAdminReportsPackBuyers().subscribe({
      next: (res) => {
        this.reports = {
          summary: res?.summary || {
            unique_buyers: 0,
            total_purchases: 0,
            total_coins_sold: 0,
            coins_consumed: 0,
            coins_remaining: 0,
            usage_pct: '0.0',
            total_revenue: '0.00'
          },
          plan_performance: Array.isArray(res?.plan_performance) ? res.plan_performance : [],
          revenue_by_currency: Array.isArray(res?.revenue_by_currency) ? res.revenue_by_currency : [],
          recent_purchases: Array.isArray(res?.recent_purchases) ? res.recent_purchases : []
        };
        this.currencyRows = this.buildCurrencyRows();
        this.loading = false;
      },
      error: (err) => {
        console.log('get pack buyers report error:', err);
        this.reports = null;
        this.currencyRows = [];
        this.loading = false;
        this.errorMessage = err?.error?.message || err?.error?.error || 'Unable to load pack buyers report.';
      }
    });
  }

  formatMoney(value?: string | number): string {
    const amount = Number(value || 0);
    return amount.toFixed(2);
  }

  formatPercentage(value?: string | number): string {
    return `${value || '0'}%`;
  }

  displayValue(value?: string | null): string {
    return value || '-';
  }

  private buildCurrencyRows(): PackCurrencyRow[] {
    if (!this.reports?.revenue_by_currency?.length) {
      return [];
    }

    return this.reports.revenue_by_currency.flatMap((item) => {
      const currencies = item.currencies || {};

      return Object.entries(currencies).map(([currency, stats]: [string, AdminPackCurrencyStats]) => ({
        plan_name: item.plan_name,
        plan_coins: item.plan_coins,
        currency,
        buyers: stats.buyers,
        revenue: stats.revenue
      }));
    });
  }
}
