import { Component, OnInit } from '@angular/core';
import { AdminService } from 'src/app/core/services/admin.service';

type PaymentTab = 'today' | 'by_month' | 'fy_report';
@Component({ selector: 'app-payments', templateUrl: './payments.component.html', styleUrls: ['./payments.component.css'] })
export class PaymentsComponent implements OnInit {
  tab: PaymentTab = 'today'; month = new Date().getMonth() + 1; year = new Date().getFullYear(); status = 'all'; loading = false; loadingTransactions = false; errorMessage = ''; currencyRate = 0; summary: any = null; transactions: any[] = []; statusCounts: Record<string, number> = {}; pagination: any = { page: 1, total_pages: 1, total: 0 };
  readonly months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  readonly filters = [{ key: 'all', label: 'All' }, { key: 'success', label: 'Success' }, { key: 'failed_declined', label: 'Failed · declined' }, { key: 'failed_charged', label: 'Failed · charged' }, { key: 'refunded', label: 'Refunded' }, { key: 'pending', label: 'Pending' }];
  constructor(private adminService: AdminService) { }
  ngOnInit(): void { this.loadSummary(); this.loadTransactions(); this.loadCurrencyRate(); }
  private loadCurrencyRate(): void { this.adminService.getAdminProfile().subscribe({ next: response => { this.currencyRate = Number((response?.data || response || {}).currency || 0); }, error: () => { this.currencyRate = 0; } }); }
  loadSummary(): void { this.loading = true; const params: any = { tab: this.tab }; if (this.tab === 'by_month') { params.month = this.month; params.year = this.year; } if (this.tab === 'fy_report') params.year = this.year; this.adminService.getAdminPaymentsSummary(params).subscribe({ next: res => { this.summary = res?.data || res; this.loading = false; }, error: err => { this.loading = false; this.errorMessage = err?.error?.message || 'Unable to load payment summary.'; } }); }
  loadTransactions(page = 1): void { this.loadingTransactions = true; this.adminService.getAdminPaymentTransactions({ tab: this.status, page, limit: 20 }).subscribe({ next: res => { const data = res?.data || res; this.transactions = Array.isArray(data?.transactions) ? data.transactions : []; this.statusCounts = data?.status_counts || {}; this.pagination = data?.pagination || { page: 1, total_pages: 1, total: 0 }; this.loadingTransactions = false; }, error: err => { this.loadingTransactions = false; this.errorMessage = err?.error?.message || 'Unable to load transactions.'; } }); }
  setTab(tab: PaymentTab): void { if (this.tab !== tab) { this.tab = tab; this.loadSummary(); } }
  setMonth(month: number): void { this.month = month; if (this.tab === 'by_month') this.loadSummary(); }
  setStatus(status: string): void { this.status = status; this.loadTransactions(1); }
  page(delta: number): void { const next = Number(this.pagination.page || 1) + delta; if (next >= 1 && next <= Number(this.pagination.total_pages || 1)) this.loadTransactions(next); }
  money(value: any): string { return value === null || value === undefined ? '—' : `$${value}`; }
  inr(usdValue: any): string { return !this.currencyRate || usdValue === null || usdValue === undefined ? '—' : `₹${(Number(usdValue) * this.currencyRate).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`; }
  statusLabel(status: string): string { return String(status || '').replace(/_/g, ' ').replace(/\b\w/g, char => char.toUpperCase()); }
  date(value: string): string { const date = new Date(value); return isNaN(date.getTime()) ? value : date.toLocaleString('en-GB', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }); }
  statusClass(status: string): string { return String(status || '').replace(/_/g, '-'); }
  exportCsv(): void { const rows = [['Transaction', 'User', 'Country', 'Pack', 'Coins', 'Amount (USD)', 'Amount (INR)', 'Status', 'When'], ...this.transactions.map(t => [t.tx_id, t.fullname, t.country, t.pack, t.coins, t.amount_usd, t.amount_inr, t.status, t.date])]; const csv = rows.map(row => row.map(value => `"${String(value ?? '').replace(/"/g, '""')}"`).join(',')).join('\r\n'); const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' })); a.download = `pick2win-payments-${this.status}-${new Date().toISOString().slice(0, 10)}.csv`; a.click(); URL.revokeObjectURL(a.href); }
}
