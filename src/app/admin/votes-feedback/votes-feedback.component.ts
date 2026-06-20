import { Component, OnInit } from '@angular/core';
import { forkJoin, of } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import {
  AdminVotesFeedbackItem,
  AdminVotesListReports,
  AdminVotesSummaryReports
} from 'src/app/core/interfaces/admin';
import { AdminService } from 'src/app/core/services/admin.service';

interface VoteOption {
  value: string;
  label: string;
}

@Component({
  selector: 'app-votes-feedback',
  templateUrl: './votes-feedback.component.html',
  styleUrls: ['./votes-feedback.component.css']
})
export class VotesFeedbackComponent implements OnInit {
  loading = false;
  errorMessage = '';
  successMessage = '';
  toastMessage = '';
  toastType: 'success' | 'error' = 'success';
  summary: any = null;
  list: any = null;
  detailedSummary: any = null;
  detailedList: any = null;
  updatingDetailedId: number | null = null;
  selectedVote = '';
  activeView: 'survey' | 'feedback' = 'survey';
  page = 1;
  limit = 20;

  readonly voteOptions: VoteOption[] = [
    { value: '', label: 'All' },
    { value: 'like_uct', label: 'Like UCT' },
    { value: 'want_changes', label: 'Want changes' },
    { value: 'dislike', label: 'Dislike' }
  ];

  readonly colors = ['#0bcc8e', '#f4b400', '#ff6b5b', '#5bb0e6', '#b768e6'];
  selectedDetailedFilter = 'all';

  readonly surveyBars: Record<string, Array<{ label: string; count: number; pct: number; color: string }>> = {
    q4: [{ label: '🔥 Very likely', count: 1180, pct: 63.4, color: '#0bcc8e' }, { label: '😐 Maybe', count: 520, pct: 28.0, color: '#f4b400' }, { label: '👎 Unlikely', count: 160, pct: 8.6, color: '#ff6b5b' }],
    q5: [{ label: '20 teams', count: 980, pct: 52.7, color: '#5bb0e6' }, { label: '40 teams', count: 520, pct: 28.0, color: '#f4b400' }, { label: '60 teams', count: 240, pct: 12.9, color: '#0bcc8e' }, { label: '80 teams', count: 120, pct: 6.5, color: '#b768e6' }],
    q7: [{ label: '🏏 Cricket', count: 760, pct: 40.9, color: '#5bb0e6' }, { label: '🏀 Basketball', count: 430, pct: 23.1, color: '#f4b400' }, { label: '🏈 American football', count: 300, pct: 16.1, color: '#0bcc8e' }, { label: '⚾ Baseball', count: 180, pct: 9.7, color: '#b768e6' }, { label: 'Football only is fine', count: 190, pct: 10.2, color: '#ff6b5b' }],
    q8: [{ label: 'Current Coin Packs', count: 680, pct: 36.6, color: '#5bb0e6' }, { label: 'League / Series basis packs', count: 520, pct: 28.0, color: '#f4b400' }, { label: 'Pay per match (coins)', count: 380, pct: 20.4, color: '#0bcc8e' }, { label: 'Monthly subscription', count: 280, pct: 15.1, color: '#b768e6' }],
    q3: [{ label: 'Every matchday', count: 740, pct: 39.8, color: '#5bb0e6' }, { label: 'A few times a week', count: 690, pct: 37.1, color: '#f4b400' }, { label: 'Very rare', count: 280, pct: 15.1, color: '#0bcc8e' }, { label: 'Only FIFA WC', count: 150, pct: 8.1, color: '#b768e6' }],
    q9: [{ label: '📱 Mobile browser', count: 1410, pct: 75.8, color: '#5bb0e6' }, { label: '💻 Desktop', count: 450, pct: 24.2, color: '#f4b400' }]
  };
  readonly competitionTags = ['Champions League knockouts · 540', 'Women’s Super League · 230', 'FIFA World Cup · 210', 'Europa League · 180', 'Indian Super League · 150', 'Copa Libertadores · 120', 'AFCON · 90', 'MLS Playoffs · 80'];
  readonly detailedCategory = [{ label: '⚙ Feature suggestion', count: 4, pct: 29, color: '#5bb0e6' }, { label: '🏆 League / coverage request', count: 3, pct: 21, color: '#f4b400' }, { label: '🐛 Bug report', count: 3, pct: 21, color: '#0bcc8e' }, { label: '🖊 Engine accuracy feedback', count: 2, pct: 14, color: '#b768e6' }, { label: '♥ What you love', count: 1, pct: 7, color: '#ff6b5b' }, { label: '🎯 UCT tuning request', count: 1, pct: 7, color: '#f4b400' }];
  readonly detailedImportance = [{ label: 'Stopping me using it', count: 3, pct: 21, color: '#5bb0e6' }, { label: 'Would really help', count: 7, pct: 50, color: '#f4b400' }, { label: 'Nice to have', count: 4, pct: 29, color: '#0bcc8e' }];
  readonly detailedLocation = [{ label: 'Series / Leagues', count: 3, pct: 21, color: '#5bb0e6' }, { label: 'UCT Config Screens', count: 3, pct: 21, color: '#f4b400' }, { label: 'Pricing / packs', count: 2, pct: 14, color: '#0bcc8e' }, { label: 'Run UCT', count: 1, pct: 7, color: '#b768e6' }, { label: 'Teams Download', count: 1, pct: 7, color: '#ff6b5b' }, { label: 'Anywhere / general', count: 1, pct: 7, color: '#f4b400' }, { label: 'Payment Gateway', count: 1, pct: 7, color: '#a7b9ca' }, { label: 'Mobile browser view', count: 1, pct: 7, color: '#5bb0e6' }, { label: 'My Space', count: 1, pct: 7, color: '#f4b400' }];
  readonly detailedItems: any[] = [
    { subject: 'Let me lock 4–5 core players before generating', body: 'It would save time if I could pin my must-have players.', category: '⚙ Feature suggestion', importance: 'Would really help', where: 'Run UCT', user: 'Arjun Mehta', email: 'arjun@pick2win.io', status: 'New', date: '2026-06-09' },
    { subject: 'Champions League knockout coverage', body: 'I only play on UCL nights — without knockout extras I can’t use the site those weeks.', category: '🏆 League / coverage request', importance: 'Stopping me using it', where: 'Series / Leagues', user: 'Sofia Rossi', email: 'sofia@pick2win.io', status: 'Resolved', date: '2026-06-09' },
    { subject: 'Teams download fails on mobile Safari', body: 'The download button does nothing on iOS Safari; it works fine on desktop.', category: '🐛 Bug report', importance: 'Stopping me using it', where: 'Teams Download', user: 'Liam Walsh', email: 'liam@pick2win.io', status: 'Reviewing', date: '2026-06-08' },
    { subject: 'Cheaper entry pack for casual players', body: 'A small 5-coin pack would get more of my friends in.', category: '⚙ Feature suggestion', importance: 'Would really help', where: 'Pricing / packs', user: 'Carlos Mendez', email: 'no follow-up', status: 'Reviewing', date: '2026-06-08' },
    { subject: 'UCT picks too many defenders', body: 'Generated teams skew defensive — a balance toggle would help a lot.', category: '🖊 Engine accuracy feedback', importance: 'Would really help', where: 'UCT Config Screens', user: 'Grace Okoro', email: 'grace@pick2win.io', status: 'Planned', date: '2026-06-07' },
    { subject: 'Love the one-tap 20 teams!', body: 'Just wanted to say UCT is brilliant — keep it up.', category: '♥ What you love', importance: 'Nice to have', where: 'Anywhere / general', user: 'Mia Tanaka', email: 'no follow-up', status: 'Resolved', date: '2026-06-07' }
  ];

  constructor(private adminService: AdminService) {
    Object.values(this.surveyBars).forEach(rows => rows.splice(0, rows.length));
    this.competitionTags.splice(0, this.competitionTags.length);
    this.detailedCategory.splice(0, this.detailedCategory.length);
    this.detailedImportance.splice(0, this.detailedImportance.length);
    this.detailedLocation.splice(0, this.detailedLocation.length);
    this.detailedItems.splice(0, this.detailedItems.length);
  }

  ngOnInit(): void {
    this.loadPage();
  }

  get filteredDetailedItems(): typeof this.detailedItems {
    return this.selectedDetailedFilter === 'all' ? this.detailedItems : this.detailedItems.filter(item => item.status.toLowerCase() === this.selectedDetailedFilter);
  }

  setDetailedFilter(filter: string): void { this.selectedDetailedFilter = filter; }

  get detailedRows(): any[] { return Array.isArray(this.detailedList?.submissions) ? this.detailedList.submissions : []; }
  get detailedCategoryRows(): Array<{ label: string; count: number; pct: number; color: string }> { return this.toBars(this.detailedSummary?.by_category, 'category'); }
  get detailedImportanceRows(): Array<{ label: string; count: number; pct: number; color: string }> { return this.toBars(this.detailedSummary?.by_importance, 'importance'); }
  get detailedLocationRows(): Array<{ label: string; count: number; pct: number; color: string }> { return this.toBars(this.detailedSummary?.by_location, 'location'); }
  get detailedStatusFilters(): string[] { return ['all', ...Array.from(new Set(this.detailedRows.map(item => this.statusValue(item.status))))]; }
  get filteredDetailedRows(): any[] { return this.selectedDetailedFilter === 'all' ? this.detailedRows : this.detailedRows.filter(item => this.statusValue(item.status) === this.selectedDetailedFilter); }
  get competitionTagsFromApi(): string[] { return (this.summary as any)?.q6_competitions_requested?.top_requested?.map((item: any) => `${item.text} · ${item.count}`) || []; }

  surveyBarsFor(question: string): Array<{ label: string; count: number; pct: number; color: string }> {
    const keyMap: Record<string, string> = { q3: 'q3_usage_frequency', q4: 'q4_recommend_likelihood', q5: 'q5_teams_per_match', q7: 'q7_next_sport', q8: 'q8_preferred_pricing', q9: 'q9_device' };
    return this.toBars((this.summary as any)?.[keyMap[question]]?.options);
  }

  updateDetailedStatus(item: any, event: Event): void {
    const status = this.apiStatus((event.target as HTMLSelectElement).value);
    this.updatingDetailedId = item.id;
    this.adminService.updateAdminDetailedFeedback(item.id, status).subscribe({
      next: () => { item.status = status; this.updatingDetailedId = null; this.showToast('Feedback status updated successfully.', 'success'); this.loadPage(); },
      error: err => { this.updatingDetailedId = null; this.showToast(err?.error?.message || err?.error?.error || 'Unable to update feedback status.', 'error'); }
    });
  }

  get feedback(): AdminVotesFeedbackItem[] {
    const rows = (this.list as any)?.submissions || this.list?.feedback;
    return Array.isArray(rows) ? rows.map((item: any) => ({ ...item, region: item.region || item.country || '' })) : [];
  }

  get feelBreakdown(): Array<{ label: string; count: number; pct: number }> {
    const rows = (this.summary as any)?.q1_overall_feeling?.breakdown || this.summary?.how_users_feel?.breakdown;
    return Array.isArray(rows) ? rows : [];
  }

  get requestedChanges(): Array<{ label?: string; title?: string; change?: string; count?: number; pct?: number; [key: string]: any }> {
    const rows = (this.summary as any)?.q2_most_requested?.options || this.summary?.most_requested_changes;
    return Array.isArray(rows) ? rows : [];
  }

  get totalResponses(): number {
    return Number((this.summary as any)?.kpis?.total_responses || this.summary?.kpis?.feedback_responses || this.list?.pagination?.total || 0);
  }

  get donutStyle(): string {
    const like = Number((this.summary as any)?.q1_overall_feeling?.breakdown?.[0]?.pct || this.summary?.kpis?.like_uct?.pct || 0);
    const changes = Number((this.summary as any)?.q1_overall_feeling?.breakdown?.[1]?.pct || this.summary?.kpis?.want_changes?.pct || 0);
    const dislike = Number((this.summary as any)?.q1_overall_feeling?.breakdown?.[2]?.pct || this.summary?.kpis?.dislike?.pct || 0);
    return `conic-gradient(#0bcc8e 0 ${like}%, #f4b400 ${like}% ${like + changes}%, #ff6b5b ${like + changes}% ${like + changes + dislike}%, rgba(255,255,255,.08) 0)`;
  }

  get ratingRows(): Array<{ rating: number; count: number; pct: number }> {
    const distribution = (this.summary as any)?.q11_rating?.distribution;
    if (Array.isArray(distribution)) {
      return distribution.map((item: any) => ({ rating: Number(item.stars), count: Number(item.count), pct: Number(item.pct) }));
    }
    const total = Math.max(1, this.feedback.length);
    return [5, 4, 3, 2, 1].map(rating => {
      const count = this.feedback.filter(item => Number(item.rating) === rating).length;
      return { rating, count, pct: Number(((count / total) * 100).toFixed(1)) };
    });
  }

  get regionRows(): Array<{ region: string; count: number; pct: number }> {
    const map = this.feedback.reduce((acc, item) => {
      const region = item.region || 'Unknown';
      acc[region] = (acc[region] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    const total = Math.max(1, this.feedback.length);
    return Object.entries(map)
      .map(([region, count]) => ({ region, count, pct: Number(((count / total) * 100).toFixed(1)) }))
      .sort((a, b) => b.count - a.count);
  }

  get infoText(): string {
    if (this.activeView === 'feedback') {
      return 'Detailed feedback - free-form submissions from the website feedback form. Category, importance, location, and status will display when the backend sends those fields.';
    }

    return 'Voice of users - results of the required Votes survey. Every question answers are aggregated below, ending with the UCT star rating.';
  }

  get detailedTotal(): number {
    return Number(this.list?.pagination?.total || this.feedback.length || 0);
  }

  get detailedNew(): number {
    return this.feedback.length;
  }

  get detailedBlockers(): number {
    return Number(this.summary?.kpis?.dislike?.count || 0);
  }

  get detailedResolved(): number {
    return 0;
  }

  loadPage(): void {
    this.loading = true;
    this.errorMessage = '';

    forkJoin({
      summary: this.adminService.getAdminReportsVotesSummary(),
      list: this.adminService.getAdminReportsVotesList({ vote: this.selectedVote, page: this.page, limit: this.limit }),
      detailedSummary: this.adminService.getAdminReportsDetailedSummary(),
      detailedList: this.adminService.getAdminReportsDetailedList()
    }).subscribe({
      next: ({ summary, list, detailedSummary, detailedList }) => {
        this.summary = summary?.data || summary || null;
        this.list = list?.data || list || null;
        this.detailedSummary = detailedSummary?.data || detailedSummary || null;
        this.detailedList = detailedList?.data || detailedList || null;
        this.hydrateScreenData();
        this.loading = false;
      },
      error: (err) => {
        console.log('get votes feedback reports error:', err);
        this.loading = false;
        this.errorMessage = err?.error?.message || err?.error?.error || 'Unable to load votes and feedback.';
      }
    });
  }

  setVote(vote: string): void {
    this.selectedVote = vote;
    this.page = 1;
    this.loadList();
  }

  setView(view: 'survey' | 'feedback'): void {
    this.activeView = view;
  }

  loadList(): void {
    this.adminService.getAdminReportsVotesList({ vote: this.selectedVote, page: this.page, limit: this.limit }).subscribe({
      next: (res) => {
        this.list = res?.data || res || null;
      },
      error: (err) => {
        console.log('get votes list error:', err);
        this.errorMessage = err?.error?.message || err?.error?.error || 'Unable to load feedback rows.';
      }
    });
  }

  downloadCsv(): void {
    this.adminService.getAdminReportsVotesList({ vote: this.selectedVote, page: 1, limit: this.limit }).pipe(
      switchMap((firstRes) => {
        const first = firstRes?.data || firstRes || null;
        const totalPages = Number(first?.pagination?.total_pages || 1);
        if (totalPages <= 1) {
          return of([first]);
        }
        const calls = Array.from({ length: totalPages }, (_, index) =>
          this.adminService.getAdminReportsVotesList({ vote: this.selectedVote, page: index + 1, limit: this.limit })
        );
        return forkJoin(calls);
      })
    ).subscribe({
      next: (pages) => {
        const allRows = pages.flatMap((page: any) => (page?.data || page || {})?.feedback || []);
        const rows = [
          ['Feedback Code', 'User', 'Region', 'Vote', 'Rating', 'Comment', 'Date'],
          ...allRows.map((item: AdminVotesFeedbackItem) => [
            item.feedback_code,
            item.fullname,
            item.region,
            item.vote_label,
            String(item.rating),
            item.comment,
            this.dateOnly(item.date)
          ])
        ];
        this.downloadText(this.toCsv(rows), `pick2win-votes-feedback-${this.selectedVote || 'all'}-${this.todayStamp()}.csv`);
      },
      error: (err) => {
        console.log('download votes csv error:', err);
        this.errorMessage = err?.error?.message || err?.error?.error || 'Unable to download feedback CSV.';
      }
    });
  }

  voteClass(vote: string): string {
    if (vote === 'like_uct') return 'ok';
    if (vote === 'want_changes') return 'warn';
    if (vote === 'dislike') return 'bad';
    return 'info';
  }

  importanceLabel(rating: number): string {
    const value = Number(rating || 0);
    if (value <= 2) return 'Stopping me using it';
    if (value >= 4) return 'Would really help';
    return 'Nice to have';
  }

  importanceClass(rating: number): string {
    const value = Number(rating || 0);
    if (value <= 2) return 'bad';
    if (value >= 4) return 'warn';
    return 'info';
  }

  stars(rating: number): string {
    const safe = Math.max(0, Math.min(5, Number(rating || 0)));
    return '★★★★★'.slice(0, safe) + '☆☆☆☆☆'.slice(0, 5 - safe);
  }

  formatNumber(value?: number | string | null): string {
    return Number(value || 0).toLocaleString();
  }

  dateOnly(value: string): string {
    if (!value) return '-';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : date.toISOString().slice(0, 10);
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

  private toBars(rows: any[] | undefined, field = 'label'): Array<{ label: string; count: number; pct: number; color: string }> {
    return (rows || []).map((item, index) => ({ label: this.humanize(item.label || item[field]), count: Number(item.count || 0), pct: Number(item.pct || 0), color: this.colors[index % this.colors.length] }));
  }

  humanize(value: string | null | undefined): string {
    return String(value || 'Not specified').replace(/_/g, ' ').replace(/\b\w/g, char => char.toUpperCase());
  }

  statusValue(value: string | null | undefined): string {
    return String(value || 'new').toLowerCase().trim() || 'new';
  }

  apiStatus(value: string): string {
    const normalized = String(value || '').trim().toLowerCase();
    const statuses: Record<string, string> = {
      new: 'New',
      reviewing: 'Reviewing',
      planned: 'Planned',
      resolved: 'Resolved',
      declined: 'Declined'
    };
    return statuses[normalized] || 'New';
  }

  private showToast(message: string, type: 'success' | 'error'): void {
    this.toastMessage = message;
    this.toastType = type;
    this.successMessage = type === 'success' ? message : '';
    this.errorMessage = type === 'error' ? message : '';
    window.setTimeout(() => this.toastMessage = '', 3500);
  }

  private hydrateScreenData(): void {
    const surveyMap: Record<string, string> = { q3: 'q3_usage_frequency', q4: 'q4_recommend_likelihood', q5: 'q5_teams_per_match', q7: 'q7_next_sport', q8: 'q8_preferred_pricing', q9: 'q9_device' };
    Object.entries(surveyMap).forEach(([viewKey, apiKey]) => {
      this.surveyBars[viewKey].splice(0, this.surveyBars[viewKey].length, ...this.toBars((this.summary as any)?.[apiKey]?.options));
    });
    const tags = (this.summary as any)?.q6_competitions_requested?.top_requested || [];
    this.competitionTags.splice(0, this.competitionTags.length, ...tags.map((item: any) => `${item.text} · ${item.count}`));
    this.detailedCategory.splice(0, this.detailedCategory.length, ...this.detailedCategoryRows);
    this.detailedImportance.splice(0, this.detailedImportance.length, ...this.detailedImportanceRows);
    this.detailedLocation.splice(0, this.detailedLocation.length, ...this.detailedLocationRows);
    const items = this.detailedItems as any[];
    items.splice(0, items.length, ...this.detailedRows.map(item => ({
      subject: item.subject || 'No subject', body: item.suggestion || '-', category: this.humanize(item.category),
      importance: this.humanize(item.importance), where: this.humanize(item.location), user: item.from_name || 'Unknown',
      email: item.from_email || 'no follow-up', status: this.statusValue(item.status), date: item.date, id: item.id
    })));
  }

  
}
