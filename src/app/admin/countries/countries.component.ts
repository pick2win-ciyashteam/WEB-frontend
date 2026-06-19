import { Component, OnInit } from '@angular/core';
import { forkJoin, Observable } from 'rxjs';
import {
  AdminCountriesReportRow,
  AdminCountriesReports,
  AdminCountry,
  AdminCountryCreatePayload
} from 'src/app/core/interfaces/admin';
import { AdminService } from 'src/app/core/services/admin.service';

@Component({
  selector: 'app-countries',
  templateUrl: './countries.component.html',
  styleUrls: ['./countries.component.css']
})
export class CountriesComponent implements OnInit {
  loading = false;
  actionLoading = false;
  errorMessage = '';
  actionMessage = '';
  reports: AdminCountriesReports | null = null;
  countries: AdminCountry[] = [];
  editingCountry: AdminCountry | null = null;
  confirmDialog: { title: string; message: string; confirmText: string; danger?: boolean; action: () => void } | null = null;

  newCountry: AdminCountryCreatePayload = {
    name: '',
    code: '',
    dial_code: '',
    flag: '',
    is_active: 1
  };

  readonly colors = [
    '#f4b400', '#5bb0e6', '#0bcc8e', '#b768e6', '#ff6b5b',
    '#ffc42e', '#8da0b5', '#22d39f', '#c061e8', '#6cc8ff'
  ];

  constructor(private adminService: AdminService) { }

  ngOnInit(): void {
    this.loadCountriesPage();
  }

  get breakdown(): AdminCountriesReportRow[] {
    return Array.isArray(this.reports?.breakdown) ? this.reports!.breakdown : [];
  }

  get topCountries(): AdminCountriesReportRow[] {
    return Array.isArray(this.reports?.by_country) ? this.reports!.by_country : [];
  }

  get managedCountries(): Array<AdminCountry & { users: number }> {
    return this.countries.map(country => ({
      ...country,
      users: this.reportUsersForCountry(country.name)
    }));
  }

  get donutGradient(): string {
    if (!this.topCountries.length) {
      return 'conic-gradient(#0b3c5d 0deg 360deg)';
    }

    let acc = 0;
    const total = this.topCountries.reduce((sum, row) => sum + Number(row.total_users || 0), 0) || 1;
    const segments = this.topCountries.map((row, index) => {
      const start = (acc / total) * 360;
      acc += Number(row.total_users || 0);
      const end = (acc / total) * 360;
      return `${this.colorAt(index)} ${start}deg ${end}deg`;
    });

    return `conic-gradient(${segments.join(',')})`;
  }

  loadCountriesPage(): void {
    this.loading = true;
    this.errorMessage = '';

    forkJoin({
      reports: this.adminService.getAdminReportsCountries(),
      countries: this.adminService.getCountries()
    }).subscribe({
      next: ({ reports, countries }) => {
        this.reports = reports?.data || reports || null;
        this.countries = Array.isArray(countries?.data) ? countries.data : [];
        this.loading = false;
      },
      error: (err) => {
        console.log('get admin countries page error:', err);
        this.loading = false;
        this.errorMessage = err?.error?.message || err?.error?.error || 'Unable to load countries.';
      }
    });
  }

  createCountry(): void {
    if (!this.newCountry.name.trim() || !this.newCountry.code.trim()) {
      this.errorMessage = 'Country name and code are required.';
      return;
    }

    this.runAction(this.adminService.createCountry({
      ...this.newCountry,
      code: this.newCountry.code.toUpperCase(),
      flag: this.newCountry.flag || this.newCountry.code.toUpperCase(),
      is_active: 1
    }), 'Country added successfully.');
  }

  editCountry(country: AdminCountry): void {
    this.editingCountry = { ...country };
  }

  saveCountry(): void {
    if (!this.editingCountry) {
      return;
    }

    this.runAction(this.adminService.updateCountry(this.editingCountry.id, {
      name: this.editingCountry.name,
      code: this.editingCountry.code,
      dial_code: this.editingCountry.dial_code,
      flag: this.editingCountry.flag,
      is_active: Number(this.editingCountry.is_active ?? 1)
    }), 'Country updated successfully.');
  }

  toggleCountry(country: AdminCountry): void {
    this.runAction(this.adminService.toggleCountry(country.id), 'Country status updated.');
  }

  deleteCountry(country: AdminCountry): void {
    this.confirmDialog = {
      title: 'Remove country',
      message: `Remove ${country.name}? The website will stop offering this country.`,
      confirmText: 'Remove',
      danger: true,
      action: () => this.runAction(this.adminService.deleteCountry(country.id), 'Country removed successfully.')
    };
  }

  closeModal(): void {
    this.editingCountry = null;
    this.confirmDialog = null;
  }

  confirmAction(): void {
    const action = this.confirmDialog?.action;
    this.confirmDialog = null;
    action?.();
  }

  downloadCsv(): void {
    const rows = [
      ['Country', 'Total users', 'Coin buyers', 'No pack', 'Share'],
      ...this.breakdown.map(row => [
        row.country,
        String(row.total_users ?? 0),
        String(row.coin_buyers ?? 0),
        String(row.no_pack ?? 0),
        `${row.share_pct ?? 0}%`
      ]),
      [
        `Total · ${this.reports?.total_countries || this.breakdown.length} countries`,
        String(this.reports?.totals?.total_users ?? 0),
        String(this.reports?.totals?.coin_buyers ?? 0),
        String(this.reports?.totals?.no_pack ?? 0),
        `${this.reports?.totals?.share_pct ?? 100}%`
      ]
    ];

    this.downloadText(this.toCsv(rows), `pick2win-countries-${this.todayStamp()}.csv`);
  }

  colorAt(index: number): string {
    return this.colors[index % this.colors.length];
  }

  countryCode(country: string): string {
    const found = this.countries.find(item => item.name === country);
    return (found?.code || country.slice(0, 2)).toUpperCase();
  }

  reportUsersForCountry(country: string): number {
    return this.reports?.manage_countries?.find(item => item.country === country)?.users || 0;
  }

  formatNumber(value?: number | string | null): string {
    return Number(value || 0).toLocaleString();
  }

  private runAction(request$: Observable<any>, successMessage: string): void {
    this.actionLoading = true;
    this.errorMessage = '';
    this.actionMessage = '';

    request$.subscribe({
      next: () => {
        this.actionLoading = false;
        this.actionMessage = successMessage;
        this.editingCountry = null;
        this.newCountry = { name: '', code: '', dial_code: '', flag: '', is_active: 1 };
        this.loadCountriesPage();
      },
      error: (err) => {
        console.log('country action error:', err);
        this.actionLoading = false;
        this.errorMessage = err?.error?.message || err?.error?.error || 'Country action failed.';
      }
    });
  }

  private toCsv(rows: string[][]): string {
    return rows
      .map(row => row.map(cell => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','))
      .join('\r\n');
  }

  private downloadText(content: string, fileName: string): void {
    const blob = new Blob([`\uFEFF${content}`], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');

    link.href = URL.createObjectURL(blob);
    link.download = fileName;
    link.click();

    URL.revokeObjectURL(link.href);
  }

  private todayStamp(): string {
    return new Date().toISOString().slice(0, 10);
  }
}
