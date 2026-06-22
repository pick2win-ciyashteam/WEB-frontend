import { Component, OnInit } from '@angular/core';
import { AdminProfitMonth, AdminProfitReports } from 'src/app/core/interfaces/admin';
import { AdminService } from 'src/app/core/services/admin.service';

@Component({ selector: 'app-profit', templateUrl: './profit.component.html', styleUrls: ['./profit.component.css'] })
export class ProfitComponent implements OnInit {
  loading = false; errorMessage = ''; currencyRate = 0; year = new Date().getFullYear(); reports: AdminProfitReports | null = null; selectedMonth: AdminProfitMonth | null = null;
  constructor(private adminService: AdminService) { }
  ngOnInit(): void { this.loadProfit(); this.loadCurrencyRate(); }
  private loadCurrencyRate(): void { this.adminService.getAdminProfile().subscribe({ next: response => { this.currencyRate = Number((response?.data || response || {}).currency || 0); }, error: () => { this.currencyRate = 0; } }); }
  loadProfit(): void { this.loading = true; this.errorMessage = ''; this.adminService.getAdminReportsProfitFy(this.year).subscribe({ next: res => { this.reports = { ...res, months: Array.isArray(res?.months) ? res.months : [], kpis: res?.kpis || {}, totals: res?.totals || {} } as AdminProfitReports; this.selectedMonth = this.reports.months.find(month => month.is_current) || this.reports.months[0] || null; this.loading = false; }, error: err => { this.loading = false; this.errorMessage = err?.error?.message || err?.error?.error || 'Unable to load profit report.'; } }); }
  get months(): AdminProfitMonth[] { return this.reports?.months || []; }
  money(value: string | number | undefined): string { return `$${String(value ?? '0.00')}`; }
  /** INR is always calculated from USD using the current admin profile currency rate. */
  inr(usdValue: string | number | undefined): string { return this.currencyRate ? `₹${(Number(usdValue || 0) * this.currencyRate).toLocaleString('en-IN', { maximumFractionDigits: 2 })}` : '—'; }
  pct(value: number | undefined): string { return `${Number(value || 0).toFixed(1)}%`; }
  isLoss(value: AdminProfitMonth | any): boolean { return Boolean(value?.is_loss) || Number(value?.profit_usd || 0) < 0; }
  selectMonth(month: AdminProfitMonth): void { this.selectedMonth = month; }
  barWidth(value: string | number | undefined): number { const total = Number(this.selectedMonth?.revenue_usd || 0); return total ? Math.max(0, Math.min(100, Number(value || 0) / total * 100)) : 0; }
  exportCsv(): void { const rows = [['Month', 'Revenue (USD)', 'Revenue (INR)', 'Expenses (USD)', 'Expenses (INR)', 'Profit (USD)', 'Profit (INR)', 'Margin'], ...this.months.map(m => [m.month_label, m.revenue_usd, m.revenue_inr, m.expenses_usd, m.expenses_inr, m.profit_usd, m.profit_inr, this.pct(m.margin_pct)]), [this.fyLabel + ' total', this.reports?.totals?.revenue_usd || '0.00', this.reports?.totals?.revenue_inr || '0.00', this.reports?.totals?.expenses_usd || '0.00', this.reports?.totals?.expenses_inr || '0.00', this.reports?.totals?.profit_usd || '0.00', this.reports?.totals?.profit_inr || '0.00', this.pct(this.reports?.totals?.margin_pct)]]; const csv = rows.map(row => row.map(value => `"${String(value ?? '').replace(/"/g, '""')}"`).join(',')).join('\r\n'); const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' })); a.download = `pick2win-profit-${this.year}.csv`; a.click(); URL.revokeObjectURL(a.href); }
  get fyLabel(): string { const start = this.reports?.fy_start ? new Date(this.reports.fy_start).getFullYear() : this.year; return `FY ${start}-${String(start + 1).slice(-2)}`; }
}
