import { Component, OnInit } from '@angular/core';
import { AdminService } from 'src/app/core/services/admin.service';
import { AdminSubscription } from 'src/app/core/interfaces/admin';

type Period = 'today' | 'monthly' | 'yearly';
@Component({ selector: 'app-coin-packs', templateUrl: './coin-packs.component.html', styleUrls: ['./coin-packs.component.css', './coin-packs-extra.component.css', './coin-packs-modal.component.css', './coin-packs-offer.component.css'] })
export class CoinPacksComponent implements OnInit {
  loading = false; saving = false; errorMessage = ''; successMessage = '';
  period: Period = 'monthly'; month = new Date().getMonth() + 1; year = new Date().getFullYear(); country = '';
  packsReport: any = null; countryReport: any = null;
  availableCountries: Array<{ name: string }> = [];
  subscriptions: AdminSubscription[] = [];
  editingId: number | null = null;
  deleteConfirmPack: AdminSubscription | null = null;
  readonly months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  newPack: any = { name: '', subtitle: '', coins: null, price: null, regular_price: null, offer_price: null, offer_label: '', is_offer_active: 0 };
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
    if (!this.newPack.name?.trim() || !Number(this.newPack.coins) || this.newPack.regular_price === null || this.newPack.regular_price === '') { this.errorMessage = 'Pack name, coins, and regular price are required.'; return; }
    this.saving = true; this.errorMessage = '';
    this.adminService.createSubscription({ name: this.newPack.name.trim(), subtitle: this.newPack.subtitle?.trim() || '', coins: Number(this.newPack.coins), matches: Number(this.newPack.coins), price: Number(this.newPack.offer_price || this.newPack.regular_price), currency: 'USD', currency_symbol: '$', validity_days: 365, is_popular: 0, is_pro: 0, is_active: 1, sort_order: this.subscriptions.length + 1, regular_price: Number(this.newPack.regular_price), offer_price: Number(this.newPack.offer_price || this.newPack.regular_price), offer_label: this.newPack.offer_label || '', is_offer_active: Number(this.newPack.is_offer_active || 0) }).subscribe({ next: res => { this.saving = false; this.successMessage = res?.message || 'Coin pack added successfully.'; this.newPack = { name: '', subtitle: '', coins: null, price: null, regular_price: null, offer_price: null, offer_label: '', is_offer_active: 0 }; this.loadReports(); this.loadSubscriptions(); }, error: err => { this.saving = false; this.errorMessage = err?.error?.message || 'Unable to add coin pack.'; } });
  }
  loadSubscriptions(): void { this.adminService.getSubscriptions().subscribe({ next: res => { const rows = res?.data || res || []; this.subscriptions = Array.isArray(rows) ? rows : []; }, error: err => this.errorMessage = err?.error?.message || 'Unable to load coin packs.' }); }
  editPack(item: AdminSubscription): void { this.editingId = item.id; }
  savePack(item: AdminSubscription): void { this.saving = true; this.adminService.updateSubscription(item.id, { name: item.name, subtitle: item.subtitle || '', coins: Number(item.coins), matches: Number(item.matches || item.coins), price: Number(item.offer_price || item.regular_price || item.price), sort_order: Number(item.sort_order || 0), regular_price: Number(item.regular_price ?? item.price), offer_price: Number(item.offer_price ?? item.regular_price ?? item.price), offer_label: item.offer_label || '', is_offer_active: Number(item.is_offer_active || 0), is_active: Number(item.is_active ?? 1) }).subscribe({ next: res => { this.saving = false; this.editingId = null; this.successMessage = res?.message || 'Coin pack updated successfully.'; this.loadReports(); this.loadSubscriptions(); }, error: err => { this.saving = false; this.errorMessage = err?.error?.message || 'Unable to update coin pack.'; } }); }
  openDeleteConfirm(item: AdminSubscription): void { this.deleteConfirmPack = item; }
  closeDeleteConfirm(): void { if (!this.saving) this.deleteConfirmPack = null; }
  deletePack(): void { const item = this.deleteConfirmPack; if (!item) return; this.saving = true; this.adminService.deleteSubscription(item.id).subscribe({ next: res => { this.saving = false; this.deleteConfirmPack = null; this.successMessage = res?.message || 'Coin pack deleted successfully.'; this.loadReports(); this.loadSubscriptions(); }, error: err => { this.saving = false; this.errorMessage = err?.error?.message || 'Unable to delete coin pack.'; } }); }
  downloadCsv(country = false): void { const rows = country ? [['Country', ...this.packColumns, 'Total'], ...this.countries.map(row => [row.country, ...this.packColumns.map(name => row.packs?.[name] || 0), row.total])] : [['Coin pack', 'Coins', 'Users purchased', 'Share'], ...this.packs.map(row => [row.name, row.coins, row.users_purchased, `${row.share_pct}%`])]; const csv = rows.map(row => row.map(value => `"${String(value ?? '').replace(/"/g, '""')}"`).join(',')).join('\r\n'); const link = document.createElement('a'); link.href = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' })); link.download = country ? 'pick2win-pack-country.csv' : 'pick2win-pack-purchases.csv'; link.click(); URL.revokeObjectURL(link.href); }
  format(value: any): string { return Number(value || 0).toLocaleString(); }
  private mountOfferFields(): void {
    const addRow = document.querySelector<HTMLElement>('.manage-panel .add-row');
    if (addRow && !addRow.querySelector('[data-offer-fields]')) {
      const wrap = document.createElement('div'); wrap.dataset['offerFields'] = 'true'; wrap.className = 'offer-fields'; wrap.style.cssText = 'display:grid;grid-template-columns:repeat(4,minmax(150px,1fr));gap:14px;align-items:end;width:100%;margin-top:4px;';
      wrap.innerHTML = '<label>Regular price<input type="number" step="0.01" placeholder="e.g. 15"></label><label>Offer price<input type="number" step="0.01" placeholder="e.g. 10.50"></label><label>Offer label<input type="text" placeholder="e.g. FIFA World Cup Offer"></label><label>Offer active<select><option value="0">Offer off</option><option value="1">Offer on</option></select></label>';
      const labels = wrap.querySelectorAll<HTMLLabelElement>('label'); labels.forEach(label => label.style.cssText = 'display:grid;gap:6px;color:#8da0b5;font:10px "JetBrains Mono",monospace;letter-spacing:1px;text-transform:uppercase;');
      const inputs = wrap.querySelectorAll<HTMLInputElement | HTMLSelectElement>('input,select'); inputs.forEach(input => (input as HTMLElement).style.cssText = 'box-sizing:border-box;width:100%;min-height:40px;padding:8px 11px;border:1px solid rgba(141,160,181,.28);border-radius:9px;color:#fff;background:#051a2a;font:700 12px "JetBrains Mono",monospace;');
      inputs[0].addEventListener('input', () => this.newPack.regular_price = inputs[0].value); inputs[1].addEventListener('input', () => this.newPack.offer_price = inputs[1].value); inputs[2].addEventListener('input', () => this.newPack.offer_label = inputs[2].value); inputs[3].addEventListener('change', () => this.newPack.is_offer_active = Number(inputs[3].value)); addRow.insertBefore(wrap, addRow.querySelector('button'));
    }
    if (this.editingId) { const index = this.subscriptions.findIndex(pack => pack.id === this.editingId); const item = this.subscriptions[index] as any; const row = document.querySelectorAll<HTMLTableRowElement>('.manage-panel tbody tr')[index]; const cell = row?.querySelector('td'); if (item && cell && !cell.querySelector('[data-edit-offer]')) { const fields = document.createElement('div'); fields.dataset['editOffer'] = 'true'; fields.style.cssText = 'display:grid;grid-template-columns:1fr 1fr;gap:7px;margin-top:9px;min-width:320px;'; fields.innerHTML = '<label>Regular price<input type="number" step="0.01"></label><label>Offer price<input type="number" step="0.01"></label><label>Offer label<input type="text"></label><label>Offer active<select><option value="0">Off</option><option value="1">On</option></select></label>'; const labels = fields.querySelectorAll<HTMLLabelElement>('label'); labels.forEach(label => label.style.cssText = 'display:grid;gap:4px;color:#8da0b5;font:9px "JetBrains Mono",monospace;letter-spacing:.7px;text-transform:uppercase;'); const inputs = fields.querySelectorAll<HTMLInputElement | HTMLSelectElement>('input,select'); inputs.forEach(input => (input as HTMLElement).style.cssText = 'box-sizing:border-box;width:100%;min-height:30px;padding:5px 8px;border:1px solid rgba(244,180,0,.3);border-radius:7px;color:#fff;background:#051a2a;font:700 11px "JetBrains Mono",monospace;'); inputs[0].value = item.regular_price || item.price || ''; inputs[1].value = item.offer_price || ''; inputs[2].value = item.offer_label || ''; inputs[3].value = String(item.is_offer_active || 0); inputs[0].addEventListener('input', () => item.regular_price = inputs[0].value); inputs[1].addEventListener('input', () => item.offer_price = inputs[1].value); inputs[2].addEventListener('input', () => item.offer_label = inputs[2].value); inputs[3].addEventListener('change', () => item.is_offer_active = Number(inputs[3].value)); cell.appendChild(fields); } }
  }
}
