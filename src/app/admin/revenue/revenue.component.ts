import { Component, OnInit } from '@angular/core';
import { AdminRevenuePack, AdminRevenueReports, AdminRevenueTab } from 'src/app/core/interfaces/admin';
import { AdminService } from 'src/app/core/services/admin.service';

@Component({ selector: 'app-revenue', templateUrl: './revenue.component.html', styleUrls: ['./revenue.component.css'] })
export class RevenueComponent implements OnInit {
  loading = false; errorMessage = ''; currencyRate = 0; tab: AdminRevenueTab = 'today'; month = new Date().getMonth() + 1; year = new Date().getFullYear(); reports: AdminRevenueReports | null = null;
  readonly months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  constructor(private adminService: AdminService) { }
  ngOnInit(): void { this.loadRevenue(); this.loadCurrencyRate(); }
  private loadCurrencyRate(): void { this.adminService.getAdminProfile().subscribe({ next: response => { this.currencyRate = Number((response?.data || response || {}).currency || 0); }, error: () => { this.currencyRate = 0; } }); }
  loadRevenue(): void {
    this.loading = true; this.errorMessage = '';
    const params: { tab: AdminRevenueTab; month?: number; year?: number } = { tab: this.tab };
    if (this.tab === 'by_month') { params.month = this.month; params.year = this.year; }
    if (this.tab === 'fy_report') params.year = this.year;
    this.adminService.getAdminReportsRevenue(params).subscribe({
      next: res => { this.reports = { kpis: res?.kpis || { revenue_today_usd: '0.00', revenue_month_usd: '0.00', revenue_fy_usd: '0.00', month_label: '', fy_label: '' }, tab: res?.tab || this.tab, label: res?.label || '', month: res?.month, year: res?.year, by_pack: { packs: Array.isArray(res?.by_pack?.packs) ? res.by_pack.packs : [], total_usd: res?.by_pack?.total_usd || '0.00' } }; this.loading = false; },
      error: err => { this.loading = false; this.reports = null; this.errorMessage = err?.error?.message || err?.error?.error || 'Unable to load revenue report.'; }
    });
  }
  setTab(tab: AdminRevenueTab): void { if (this.tab !== tab) { this.tab = tab; this.loadRevenue(); } }
  setMonth(month: number): void { this.month = month; if (this.tab === 'by_month') this.loadRevenue(); }
  get packs(): AdminRevenuePack[] { return this.reports?.by_pack?.packs || []; }
  total(): number { return Number(this.reports?.by_pack?.total_usd || 0); }
  share(pack: AdminRevenuePack): string { const total = this.total(); return total ? `${((Number(pack.revenue_usd || 0) / total) * 100).toFixed(1)}%` : '0.0%'; }
  /** Keeps the exact amount returned by the backend; do not round or compact revenue. */
  money(value: string | number): string { return `$${String(value ?? '0.00')}`; }
  inr(value: string | number): string { return this.currencyRate ? `₹${(Number(value || 0) * this.currencyRate).toLocaleString('en-IN', { maximumFractionDigits: 0 })}` : '—'; }
  packIcon(index: number): string { return ['🎯', '⭐', '🚀', '👑', '💎'][index % 5]; }
  exportCsv(): void { const rows = [['Coin Pack', 'Coins', 'Revenue (USD)', 'Revenue (INR)', 'Share'], ...this.packs.map(pack => [pack.name, pack.coins, pack.revenue_usd, this.inr(pack.revenue_usd), this.share(pack)]), ['All packs', '', this.reports?.by_pack?.total_usd || '0.00', this.inr(this.reports?.by_pack?.total_usd || '0.00'), '100%']]; const csv = rows.map(row => row.map(value => `"${String(value ?? '').replace(/"/g, '""')}"`).join(',')).join('\r\n'); const link = document.createElement('a'); link.href = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' })); link.download = `pick2win-revenue-${this.tab}-${new Date().toISOString().slice(0, 10)}.csv`; link.click(); URL.revokeObjectURL(link.href); }
}
