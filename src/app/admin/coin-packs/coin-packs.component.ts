import { Component, OnInit } from '@angular/core';
import { AdminService } from 'src/app/core/services/admin.service';
import { AdminSubscription } from 'src/app/core/interfaces/admin';

type Period = 'today' | 'monthly' | 'yearly';
@Component({ selector: 'app-coin-packs', templateUrl: './coin-packs.component.html', styleUrls: ['./coin-packs.component.css', './coin-packs-extra.component.css', './coin-packs-modal.component.css'] })
export class CoinPacksComponent implements OnInit {
  loading = false; saving = false; errorMessage = ''; successMessage = '';
  period: Period = 'monthly'; month = new Date().getMonth() + 1; year = new Date().getFullYear(); country = '';
  packsReport: any = null; countryReport: any = null;
  availableCountries: Array<{ name: string }> = [];
  subscriptions: AdminSubscription[] = [];
  editingId: number | null = null;
  deleteConfirmPack: AdminSubscription | null = null;
  readonly months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  newPack: any = { name: '', coins: null, price: null };
  constructor(private adminService: AdminService) { }
  ngOnInit(): void { this.loadReports(); this.loadCountries(); this.loadSubscriptions(); }
  get packs(): any[] { return this.packsReport?.packs || []; }
  get toastMessage(): string { return this.errorMessage || this.successMessage; }
  get toastType(): 'success' | 'error' { return this.errorMessage ? 'error' : 'success'; }
  get countries(): any[] { return this.countryReport?.by_country || []; }
  get packColumns(): string[] { return Object.keys(this.countryReport?.totals?.packs || {}); }
  usersPurchasedFor(planId: number): number { return Number(this.packs.find(pack => Number(pack.plan_id) === Number(planId))?.users_purchased || 0); }
  setPeriod(period: Period): void { this.period = period; this.loadReports(); }
  loadReports(): void {
    this.loading = true; this.errorMessage = '';
    const params: any = { period: this.period }; if (this.period === 'monthly') { params.month = this.month; params.year = this.year; } if (this.period === 'yearly') params.year = this.year;
    this.adminService.getAdminReportsCoinPacks(params).subscribe({ next: res => { this.packsReport = res?.data || res; this.loadCountryReport(params); }, error: err => { this.loading = false; this.errorMessage = err?.error?.message || 'Unable to load coin packs.'; } });
  }
  loadCountryReport(params: any): void { const query = this.country ? { ...params, country: this.country } : params; this.adminService.getAdminReportsCountrywiseCoin(query).subscribe({ next: res => { this.countryReport = res?.data || res; this.loading = false; }, error: err => { this.loading = false; this.errorMessage = err?.error?.message || 'Unable to load country purchases.'; } }); }
  setCountry(country: string): void { this.country = country; this.loadReports(); }
  showAllCountries(): void { this.country = ''; this.loadReports(); }
  selectMonth(month: number): void { this.month = month; this.loadReports(); }
  loadCountries(): void { this.adminService.getCountries().subscribe({ next: res => { const data = res?.data || res || []; const rows = Array.isArray(data) ? data : (data?.countries || res?.countries || []); this.availableCountries = Array.isArray(rows) ? rows.map((item: any) => ({ name: item?.name || item?.country || item?.country_name || String(item || '') })).filter(item => item.name) : []; }, error: err => console.log('get countries for coin packs error:', err) }); }
  createPack(): void {
    if (!this.newPack.name?.trim() || !Number(this.newPack.coins) || this.newPack.price === null) { this.errorMessage = 'Pack name, coins, and price are required.'; return; }
    this.saving = true; this.errorMessage = '';
    this.adminService.createSubscription({ name: this.newPack.name.trim(), subtitle: '', coins: Number(this.newPack.coins), matches: Number(this.newPack.coins), price: Number(this.newPack.price), currency: 'DOLLAR', currency_symbol: '$', validity_days: 365, is_popular: 0, is_pro: 0, sort_order: this.subscriptions.length + 1 }).subscribe({ next: res => { this.saving = false; this.successMessage = res?.message || 'Coin pack added successfully.'; this.newPack = { name: '', coins: null, price: null }; this.loadReports(); this.loadSubscriptions(); }, error: err => { this.saving = false; this.errorMessage = err?.error?.message || 'Unable to add coin pack.'; } });
  }
  loadSubscriptions(): void { this.adminService.getSubscriptions().subscribe({ next: res => { const rows = res?.data || res || []; this.subscriptions = Array.isArray(rows) ? rows : []; }, error: err => this.errorMessage = err?.error?.message || 'Unable to load coin packs.' }); }
  editPack(item: AdminSubscription): void { this.editingId = item.id; }
  savePack(item: AdminSubscription): void { this.saving = true; this.adminService.updateSubscription(item.id, { name: item.name, coins: Number(item.coins), matches: Number(item.matches || item.coins), price: Number(item.price) }).subscribe({ next: res => { this.saving = false; this.editingId = null; this.successMessage = res?.message || 'Coin pack updated successfully.'; this.loadReports(); this.loadSubscriptions(); }, error: err => { this.saving = false; this.errorMessage = err?.error?.message || 'Unable to update coin pack.'; } }); }
  openDeleteConfirm(item: AdminSubscription): void { this.deleteConfirmPack = item; }
  closeDeleteConfirm(): void { if (!this.saving) this.deleteConfirmPack = null; }
  deletePack(): void { const item = this.deleteConfirmPack; if (!item) return; this.saving = true; this.adminService.deleteSubscription(item.id).subscribe({ next: res => { this.saving = false; this.deleteConfirmPack = null; this.successMessage = res?.message || 'Coin pack deleted successfully.'; this.loadReports(); this.loadSubscriptions(); }, error: err => { this.saving = false; this.errorMessage = err?.error?.message || 'Unable to delete coin pack.'; } }); }
  downloadCsv(country = false): void { const rows = country ? [['Country', ...this.packColumns, 'Total'], ...this.countries.map(row => [row.country, ...this.packColumns.map(name => row.packs?.[name] || 0), row.total])] : [['Coin pack', 'Coins', 'Users purchased', 'Share'], ...this.packs.map(row => [row.name, row.coins, row.users_purchased, `${row.share_pct}%`])]; const csv = rows.map(row => row.map(value => `"${String(value ?? '').replace(/"/g, '""')}"`).join(',')).join('\r\n'); const link = document.createElement('a'); link.href = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' })); link.download = country ? 'pick2win-pack-country.csv' : 'pick2win-pack-purchases.csv'; link.click(); URL.revokeObjectURL(link.href); }
  format(value: any): string { return Number(value || 0).toLocaleString(); }
}
