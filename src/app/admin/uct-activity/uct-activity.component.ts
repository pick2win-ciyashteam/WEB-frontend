import { Component, OnInit } from '@angular/core';
import { forkJoin } from 'rxjs';
import {
  AdminUctActivityDaily,
  AdminUctGameBreakdown,
  AdminUctActivityListReports,
  AdminUctBuildPoint,
  AdminUctGeneration,
  AdminUctMatchDrilldownReports,
  AdminUctOverviewReports,
  AdminUctTodayMatch
} from 'src/app/core/interfaces/admin';
import { AdminService } from 'src/app/core/services/admin.service';

@Component({
  selector: 'app-uct-activity',
  templateUrl: './uct-activity.component.html',
  styleUrls: ['./uct-activity.component.css']
})
export class UctActivityComponent implements OnInit {
  loading = false;
  errorMessage = '';
  overview: AdminUctOverviewReports | null = null;
  drilldown: AdminUctMatchDrilldownReports | null = null;
  activity: AdminUctActivityListReports | null = null;
  selectedMatchId: number | null = null;

  period = 'today';
  selectedYear = new Date().getFullYear();
  selectedMonth = new Date().getMonth() + 1;
  page = 1;
  limit = 20;

  readonly countryColors = ['#f4b400', '#0bcc8e', '#5bb0e6', '#b768e6', '#ff6b5b', '#8da0b5'];
  readonly years = [2025, 2026, 2027];
  readonly months = [
    { value: 1, label: 'Jan' },
    { value: 2, label: 'Feb' },
    { value: 3, label: 'Mar' },
    { value: 4, label: 'Apr' },
    { value: 5, label: 'May' },
    { value: 6, label: 'Jun' },
    { value: 7, label: 'Jul' },
    { value: 8, label: 'Aug' },
    { value: 9, label: 'Sep' },
    { value: 10, label: 'Oct' },
    { value: 11, label: 'Nov' },
    { value: 12, label: 'Dec' }
  ];

  constructor(private adminService: AdminService) { }

  ngOnInit(): void {
    this.loadPage();
  }

  get matches(): AdminUctTodayMatch[] {
    const matches = Array.isArray(this.activity?.fixtures_today?.matches)
      ? this.activity!.fixtures_today!.matches
      : (Array.isArray(this.overview?.today_matches?.matches) ? this.overview!.today_matches.matches : []);

    return matches.map(match => ({
      ...match,
      id: Number(match.id ?? match.match_id),
      ucts_used: Number(match.ucts_used ?? match.users_used_uct ?? 0),
      teams_generated: Number(match.teams_generated || 0)
    }));
  }

  get dailyBreakdown(): AdminUctActivityDaily[] {
    return Array.isArray(this.activity?.daily_breakdown) ? this.activity!.daily_breakdown : [];
  }

  get recentGenerations(): AdminUctGeneration[] {
    return Array.isArray(this.activity?.recent_generations) ? this.activity!.recent_generations : [];
  }

  get gameBreakdown(): AdminUctGameBreakdown[] {
    return Array.isArray(this.activity?.by_game)
      ? this.activity!.by_game!
      : (Array.isArray(this.overview?.game_breakdown) ? this.overview!.game_breakdown : []);
  }

  get totalPages(): number {
    return Math.max(1, Number(this.activity?.pagination?.total_pages || 1));
  }

  get totalGenerations(): number {
    return Number(this.activity?.pagination?.total || this.recentGenerations.length);
  }

  get buildPoints(): AdminUctBuildPoint[] {
    return Array.isArray(this.drilldown?.lineouts_to_kickoff) ? this.drilldown!.lineouts_to_kickoff : [];
  }

  get totalFixtureTeams(): number {
    return this.matches.reduce((sum, match) => sum + Number(match.teams_generated || 0), 0);
  }

  get totalFixtureDraftKings(): number {
    return this.matches.reduce((sum, match) => sum + this.draftKingsValue(match), 0);
  }

  get totalFixtureFanDuel(): number {
    return this.matches.reduce((sum, match) => sum + this.fanDuelValue(match), 0);
  }

  get totalActivityDraftKings(): number {
    const summaryValue = this.gameUcts('draftkings');
    return summaryValue || this.dailyBreakdown.reduce((sum, row) => sum + this.draftKingsValue(row), 0);
  }

  get totalActivityFanDuel(): number {
    const summaryValue = this.gameUcts('fanduel');
    return summaryValue || this.dailyBreakdown.reduce((sum, row) => sum + this.fanDuelValue(row), 0);
  }

  get totalFixtureShare(): number {
    return this.matches.reduce((sum, match) => sum + Number(match.share_pct || 0), 0);
  }

  get selectedMonthLabel(): string {
    return this.months.find(month => month.value === this.selectedMonth)?.label || 'Month';
  }

  get coinsPurchased(): number {
    return Number(this.overview?.coins_reconciliation?.coins_purchased || 0);
  }

  get consumedPct(): number {
    return Number(this.overview?.coins_reconciliation?.breakdown_pct?.consumed_pct || 0);
  }

  get expiredPct(): number {
    return Number(this.overview?.coins_reconciliation?.breakdown_pct?.expired_pct || 0);
  }

  get walletsPct(): number {
    return Number(this.overview?.coins_reconciliation?.breakdown_pct?.wallets_pct || 0);
  }

  loadPage(): void {
    this.loading = true;
    this.errorMessage = '';

    forkJoin({
      overview: this.adminService.getAdminReportsUctOverview(),
      activity: this.adminService.getAdminReportsUctActivityList(this.activityParams())
    }).subscribe({
      next: ({ overview, activity }) => {
        this.overview = overview?.data || overview || null;
        this.activity = activity?.data || activity || null;
        const firstMatch = this.matches[0];
        this.loading = false;

        if (firstMatch) {
          this.selectMatch(firstMatch);
        }
      },
      error: (err) => {
        console.log('get uct reports error:', err);
        this.loading = false;
        this.errorMessage = err?.error?.message || err?.error?.error || 'Unable to load UCT reports.';
      }
    });
  }

  selectMatch(match: AdminUctTodayMatch): void {
    this.selectedMatchId = match.id;
    this.adminService.getAdminReportsUctMatchDrilldown(match.id).subscribe({
      next: (res) => {
        this.drilldown = res?.data || res || null;
      },
      error: (err) => {
        console.log('get uct match drilldown error:', err);
        this.errorMessage = err?.error?.message || err?.error?.error || 'Unable to load fixture drill-down.';
      }
    });
  }

  setPeriod(period: string): void {
    this.period = period;
    this.page = 1;
    this.loadActivity();
  }

  loadActivity(): void {
    this.errorMessage = '';
    this.adminService.getAdminReportsUctActivityList(this.activityParams()).subscribe({
      next: (res) => {
        this.activity = res?.data || res || null;
      },
      error: (err) => {
        console.log('get uct activity list error:', err);
        this.errorMessage = err?.error?.message || err?.error?.error || 'Unable to load UCT activity list.';
      }
    });
  }

  previousPage(): void {
    if (this.page > 1) {
      this.page--;
      this.loadActivity();
    }
  }

  nextPage(): void {
    if (this.page < this.totalPages) {
      this.page++;
      this.loadActivity();
    }
  }

  downloadFixturesCsv(): void {
    const rows = [
      ['Match', 'League / Series', 'Status', 'Users used UCT', 'DraftKings', 'FanDuel', 'Teams generated', 'Share'],
      ...this.matches.map(match => [
        match.match,
        match.series,
        match.status,
        String(match.ucts_used),
        String(this.draftKingsValue(match)),
        String(this.fanDuelValue(match)),
        String(match.teams_generated),
        `${match.share_pct}%`
      ])
    ];
    this.downloadText(this.toCsv(rows), `pick2win-uct-fixtures-${this.todayStamp()}.csv`);
  }

  downloadActivityCsv(): void {
    const rows = [
      ['Date', 'UCTs / coins consumed', 'DraftKings', 'FanDuel', 'Teams generated', 'Retries', 'Cancelled', 'Completion rate'],
      ...this.dailyBreakdown.map(row => [
        this.dateOnly(row.date),
        String(row.ucts),
        String(this.activityGameValue(row, 'draftkings')),
        String(this.activityGameValue(row, 'fanduel')),
        String(row.teams_generated),
        '0',
        String(row.failed_refunded),
        `${row.success_rate_pct}%`
      ])
    ];
    this.downloadText(this.toCsv(rows), `pick2win-uct-activity-${this.period}-${this.todayStamp()}.csv`);
  }

  downloadLatestCsv(): void {
    const rows = [
      ['UCT ID', 'User', 'Match', 'Country', 'Game', 'Teams', 'Coins used', 'Time ago', 'Status', 'Created at'],
      ...this.recentGenerations.map(item => [
        item.uct_id,
        item.fullname,
        item.match,
        item.country,
        this.gameLabel(item),
        String(item.teams),
        String(item.coins_used),
        this.timeAgo(item.time_ago_sec),
        item.status,
        item.created_at
      ])
    ];
    this.downloadText(this.toCsv(rows), `pick2win-uct-latest-generations-${this.todayStamp()}.csv`);
  }

  downloadLedgerCsv(): void {
    const ledger = this.overview?.coins_reconciliation;
    const rows = [
      ['Metric', 'Value', 'Share'],
      ['Coins purchased', String(ledger?.coins_purchased || 0), '100%'],
      ['Coins consumed', String(ledger?.coins_consumed || 0), `${ledger?.breakdown_pct?.consumed_pct || 0}%`],
      ['Coins expired', String(ledger?.coins_expired || 0), `${ledger?.breakdown_pct?.expired_pct || 0}%`],
      ['Coins in wallets', String(ledger?.coins_in_wallets || 0), `${ledger?.breakdown_pct?.wallets_pct || 0}%`],
      ['Balanced', ledger?.is_balanced ? 'Yes' : 'No', '']
    ];
    this.downloadText(this.toCsv(rows), `pick2win-uct-coins-reconciliation-${this.todayStamp()}.csv`);
  }

  downloadFullReportCsv(): void {
    const rows: string[][] = [
      ['PICK2WIN UCT Activity Report'],
      ['Generated', new Date().toISOString()],
      [],
      ['KPI', 'Value'],
      ['UCTs used today', String(this.overview?.kpis?.ucts_used_today || 0)],
      ['Teams generated', String(this.overview?.kpis?.teams_generated || 0)],
      ['Active fixtures', String(this.overview?.kpis?.active_fixtures || 0)],
      ['Failed / refunded', String(this.overview?.kpis?.failed_refunded || 0)],
      [],
      ['Today Fixtures'],
      ['Match', 'Series', 'Status', 'UCTs used', 'DraftKings', 'FanDuel', 'Teams generated', 'Share'],
      ...this.matches.map(match => [match.match, match.series, match.status, String(match.ucts_used), String(this.draftKingsValue(match)), String(this.fanDuelValue(match)), String(match.teams_generated), `${match.share_pct}%`]),
      [],
      ['Activity Over Time'],
      ['Date', 'UCTs', 'DraftKings', 'FanDuel', 'Teams generated', 'Failed / refunded', 'Success rate'],
      ...this.dailyBreakdown.map(row => [this.dateOnly(row.date), String(row.ucts), String(this.activityGameValue(row, 'draftkings')), String(this.activityGameValue(row, 'fanduel')), String(row.teams_generated), String(row.failed_refunded), `${row.success_rate_pct}%`]),
      [],
      ['Latest Generations'],
      ['UCT ID', 'User', 'Match', 'Country', 'Game', 'Teams', 'Coins used', 'Status', 'Created at'],
      ...this.recentGenerations.map(item => [item.uct_id, item.fullname, item.match, item.country, this.gameLabel(item), String(item.teams), String(item.coins_used), item.status, item.created_at])
    ];
    this.downloadText(this.toCsv(rows), `pick2win-uct-full-report-${this.todayStamp()}.csv`);
  }

  statusClass(status: string): string {
    const value = String(status || '').toLowerCase();
    if (value.includes('live')) return 'bad';
    if (value.includes('result') || value.includes('complete')) return 'ok';
    return 'info';
  }

  timeAgo(seconds?: number | null): string {
    const totalSeconds = Math.max(0, Number(seconds || 0));
    const minutes = Math.floor(totalSeconds / 60);
    const hours = Math.floor(minutes / 60);
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'just now';
  }

  maxBuildCount(): number {
    return Math.max(1, ...this.buildPoints.map(point => Number(point.count || 0)));
  }

  buildPointX(index: number): number {
    const total = Math.max(1, this.buildPoints.length - 1);
    return 40 + (index / total) * 820;
  }

  buildPointY(point: AdminUctBuildPoint): number {
    return 210 - (Number(point.count || 0) / this.maxBuildCount()) * 150;
  }

  buildPolyline(): string {
    return this.buildPoints.map((point, index) => `${this.buildPointX(index)},${this.buildPointY(point)}`).join(' ');
  }

  buildAreaPolygon(): string {
    const points = this.buildPolyline();
    if (!points) return '';
    return `40,210 ${points} 860,210`;
  }

  setYear(year: number): void {
    this.selectedYear = year;
    this.period = 'year';
    this.page = 1;
    this.loadActivity();
  }

  setMonth(month: number): void {
    this.selectedMonth = month;
    this.period = 'month';
    this.page = 1;
    this.loadActivity();
  }

  countryColor(index: number): string {
    return this.countryColors[index % this.countryColors.length];
  }

  formatNumber(value?: number | string | null): string {
    return Number(value || 0).toLocaleString();
  }

  draftKingsValue(row: any): number {
    return Number(row?.['draftkings'] ?? row?.['draft_kings'] ?? row?.['draftKings'] ?? 0);
  }

  fanDuelValue(row: any): number {
    return Number(row?.['fanduel'] ?? row?.['fan_duel'] ?? row?.['fanDuel'] ?? 0);
  }

  gameUcts(game: string): number {
    const row = this.gameBreakdown.find(item => String(item.game).toLowerCase() === game.toLowerCase());
    return Number(row?.ucts ?? row?.total_ucts ?? 0);
  }

  activityGameValue(row: AdminUctActivityDaily, game: 'draftkings' | 'fanduel'): number {
    const rowValue = game === 'draftkings' ? this.draftKingsValue(row) : this.fanDuelValue(row);
    return rowValue || (this.dailyBreakdown.length === 1 ? this.gameUcts(game) : 0);
  }

  gameLabel(row: any): string {
    const value = row?.game ?? row?.game_type ?? row?.fantasy_game ?? row?.platform ?? '-';
    return String(value || '-');
  }

  dateOnly(value: string): string {
    if (!value) return '-';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : date.toISOString().slice(0, 10);
  }

  formatTime(value: string): string {
    if (!value) return '-';
    return new Intl.DateTimeFormat(undefined, { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(value));
  }

  private toCsv(rows: string[][]): string {
    return rows.map(row => row.map(cell => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(',')).join('\r\n');
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

  private activityParams(): { period: string; page: number; limit: number; year: number; month: number } {
    return {
      period: this.period,
      page: this.page,
      limit: this.limit,
      year: this.selectedYear,
      month: this.selectedMonth
    };
  }
}
