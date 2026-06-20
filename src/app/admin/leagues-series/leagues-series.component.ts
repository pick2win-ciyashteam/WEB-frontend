import { Component, OnInit } from '@angular/core';
import { AdminLeague, AdminLeagueCreatePayload, AdminLeaguesReports } from 'src/app/core/interfaces/admin';
import { AdminService } from 'src/app/core/services/admin.service';

type SeriesStatus = 'all' | 'live' | 'upcoming' | 'completed';

@Component({
  selector: 'app-leagues-series',
  templateUrl: './leagues-series.component.html',
  styleUrls: ['./leagues-series.component.css']
})
export class LeaguesSeriesComponent implements OnInit {
  loading = false;
  saving = false;
  errorMessage = '';
  successMessage = '';
  toastMessage = '';
  toastType: 'success' | 'error' = 'success';
  reports: AdminLeaguesReports | null = null;
  leagues: AdminLeague[] = [];
  newLeague: AdminLeagueCreatePayload = this.emptyLeague();
  editingLeague: AdminLeague | null = null;
  confirmDeleteLeague: AdminLeague | null = null;
  seriesLoading = false;
  seriesStatus: SeriesStatus = 'all';
  seriesReport: any = null;

  constructor(private adminService: AdminService) { }

  ngOnInit(): void { this.loadLeagues(); this.loadSeries(); }

  get totalLeagues(): number { return Number(this.reports?.kpis?.total_leagues ?? this.leagues.length); }
  get shownOnWebsite(): number { return Number(this.reports?.kpis?.shown_on_website ?? this.leagues.filter(item => item.is_visible).length); }
  get hiddenLeagues(): number { return Number(this.reports?.kpis?.hidden ?? this.leagues.filter(item => !item.is_visible).length); }
  get matches30d(): number { return Number(this.reports?.kpis?.matches_30d ?? this.leagues.reduce((sum, item) => sum + Number(item.matches_30d || 0), 0)); }

  loadLeagues(): void {
    this.loading = true;
    this.errorMessage = '';
    this.adminService.getAdminReportsLeagues().subscribe({
      next: (response) => {
        const data = response?.data || response;
        this.reports = data || null;
        this.leagues = Array.isArray(data?.leagues) ? data.leagues : [];
        this.loading = false;
      },
      error: (error) => {
        console.log('get admin leagues error:', error);
        this.leagues = [];
        this.loading = false;
        this.showError(error?.error?.message || error?.error?.error || 'Unable to load leagues.');
      }
    });
  }

  loadSeries(status: SeriesStatus = this.seriesStatus): void {
    this.seriesStatus = status;
    this.seriesLoading = true;
    this.adminService.getAdminReportsSeries(status).subscribe({
      next: response => { this.seriesReport = response?.data || response || null; this.seriesLoading = false; },
      error: error => { this.seriesReport = null; this.seriesLoading = false; this.showError(error?.error?.message || error?.error?.error || 'Unable to load series history.'); }
    });
  }

  get series(): any[] { return Array.isArray(this.seriesReport?.series_list?.series) ? this.seriesReport.series_list.series : []; }
  get seriesCounts(): Record<SeriesStatus, number> { return this.seriesReport?.tab_counts || { all: 0, live: 0, upcoming: 0, completed: 0 }; }
  get seriesTotals(): any { return this.seriesReport?.series_list?.totals || { matches: 0, participants: 0, ucts_used: 0 }; }
  seriesWindow(series: any): string {
    const start = series?.series_window?.start_date || series?.match_window?.first_match_date;
    const end = series?.series_window?.end_date || series?.match_window?.last_match_date;
    return start || end ? `${this.dateOnly(start)} – ${this.dateOnly(end)}` : '-';
  }

  private dateOnly(value: string | null | undefined): string {
    if (!value) return '-';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  createLeague(): void {
    this.errorMessage = '';
    this.successMessage = '';
    const payload = { name: this.newLeague.name.trim(), region: this.newLeague.region.trim(), tier: this.newLeague.tier, matches_30d: Number(this.newLeague.matches_30d || 0) };
    if (!payload.name || !payload.region || !payload.tier) {
      this.showError('Name, region, and tier are required.');
      return;
    }
    this.saving = true;
    this.adminService.createAdminLeague(payload).subscribe({
      next: (response) => {
        this.saving = false;
        this.showSuccess(response?.message || 'League added successfully.');
        this.newLeague = this.emptyLeague();
        this.loadLeagues();
      },
      error: (error) => {
        console.log('create admin league error:', error);
        this.saving = false;
        this.showError(error?.error?.message || error?.error?.error || 'Unable to add league.');
      }
    });
  }

  editLeague(league: AdminLeague): void {
    this.errorMessage = '';
    this.successMessage = '';
    this.editingLeague = { ...league };
  }

  saveLeague(): void {
    if (!this.editingLeague) {
      return;
    }

    const payload = {
      name: this.editingLeague.name.trim(),
      region: this.editingLeague.region.trim(),
      tier: this.editingLeague.tier,
      matches_30d: Number(this.editingLeague.matches_30d || 0)
    };

    if (!payload.name || !payload.region || !payload.tier) {
      this.showError('Name, region, and tier are required.');
      return;
    }

    this.saving = true;
    this.adminService.updateAdminLeague(this.editingLeague.id, payload).subscribe({
      next: (response) => {
        this.saving = false;
        this.editingLeague = null;
        this.showSuccess(response?.message || 'League updated successfully.');
        this.loadLeagues();
      },
      error: (error) => {
        console.log('update admin league error:', error);
        this.saving = false;
        this.showError(error?.error?.message || error?.error?.error || 'Unable to update league.');
      }
    });
  }

  toggleVisibility(league: AdminLeague): void {
    if (this.saving) {
      return;
    }

    this.saving = true;
    this.errorMessage = '';
    this.successMessage = '';
    this.adminService.toggleAdminLeagueVisibility(league.id).subscribe({
      next: (response) => {
        this.saving = false;
        this.showSuccess(response?.message || `${league.name} visibility updated.`);
        this.loadLeagues();
      },
      error: (error) => {
        console.log('toggle league visibility error:', error);
        this.saving = false;
        this.showError(error?.error?.message || error?.error?.error || 'Unable to update league visibility.');
      }
    });
  }

  openDeleteConfirm(league: AdminLeague): void {
    this.errorMessage = '';
    this.successMessage = '';
    this.confirmDeleteLeague = league;
  }

  deleteLeague(): void {
    const league = this.confirmDeleteLeague;
    if (!league) {
      return;
    }

    this.saving = true;
    this.adminService.deleteAdminLeague(league.id).subscribe({
      next: (response) => {
        this.saving = false;
        this.confirmDeleteLeague = null;
        this.showSuccess(response?.message || 'League deleted successfully.');
        this.loadLeagues();
      },
      error: (error) => {
        console.log('delete admin league error:', error);
        this.saving = false;
        this.showError(error?.error?.message || error?.error?.error || 'Unable to delete league.');
      }
    });
  }

  closeModal(): void {
    if (!this.saving) {
      this.editingLeague = null;
      this.confirmDeleteLeague = null;
    }
  }

  downloadCsv(): void {
    const rows = [['ID', 'League / competition', 'Region', 'Tier', 'Matches (30d)', 'Shown on website'], ...this.leagues.map(item => [item.league_code, item.name, item.region, item.tier, String(item.matches_30d ?? 0), item.is_visible ? 'Yes' : 'No'])];
    const csv = rows.map(row => row.map(value => `"${String(value ?? '').replace(/"/g, '""')}"`).join(',')).join('\r\n');
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' }));
    link.download = `pick2win-leagues-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  downloadSeriesCsv(): void {
    const rows = [
      ['Series code', 'Series', 'League', 'Window', 'Matches', 'Participants', 'UCTs used', 'Status'],
      ...this.series.map(item => [
        item.series_code || '', item.name || '', item.league || '', this.seriesWindow(item), String(item.matches ?? 0),
        String(item.participants ?? 0), String(item.ucts_used ?? 0), item.status || ''
      ])
    ];
    const csv = rows.map(row => row.map(value => `"${String(value ?? '').replace(/"/g, '""')}"`).join(',')).join('\r\n');
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' }));
    link.download = `pick2win-series-${this.seriesStatus}-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  formatNumber(value: number): string { return Number(value || 0).toLocaleString(); }

  private showSuccess(message: string): void {
    this.successMessage = message;
    this.errorMessage = '';
    this.showToast(message, 'success');
  }

  private showError(message: string): void {
    this.errorMessage = message;
    this.successMessage = '';
    this.showToast(message, 'error');
  }

  private showToast(message: string, type: 'success' | 'error'): void {
    this.toastMessage = message;
    this.toastType = type;
    window.setTimeout(() => this.toastMessage = '', 3500);
  }

  private emptyLeague(): AdminLeagueCreatePayload { return { name: '', region: '', tier: 'Tier 1', matches_30d: 0 }; }
}
