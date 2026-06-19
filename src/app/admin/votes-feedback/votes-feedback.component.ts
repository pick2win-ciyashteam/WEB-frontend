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
  summary: AdminVotesSummaryReports | null = null;
  list: AdminVotesListReports | null = null;
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
  readonly detailedItems = [
    { subject: 'Let me lock 4–5 core players before generating', body: 'It would save time if I could pin my must-have players.', category: '⚙ Feature suggestion', importance: 'Would really help', where: 'Run UCT', user: 'Arjun Mehta', email: 'arjun@pick2win.io', status: 'New', date: '2026-06-09' },
    { subject: 'Champions League knockout coverage', body: 'I only play on UCL nights — without knockout extras I can’t use the site those weeks.', category: '🏆 League / coverage request', importance: 'Stopping me using it', where: 'Series / Leagues', user: 'Sofia Rossi', email: 'sofia@pick2win.io', status: 'Resolved', date: '2026-06-09' },
    { subject: 'Teams download fails on mobile Safari', body: 'The download button does nothing on iOS Safari; it works fine on desktop.', category: '🐛 Bug report', importance: 'Stopping me using it', where: 'Teams Download', user: 'Liam Walsh', email: 'liam@pick2win.io', status: 'Reviewing', date: '2026-06-08' },
    { subject: 'Cheaper entry pack for casual players', body: 'A small 5-coin pack would get more of my friends in.', category: '⚙ Feature suggestion', importance: 'Would really help', where: 'Pricing / packs', user: 'Carlos Mendez', email: 'no follow-up', status: 'Reviewing', date: '2026-06-08' },
    { subject: 'UCT picks too many defenders', body: 'Generated teams skew defensive — a balance toggle would help a lot.', category: '🖊 Engine accuracy feedback', importance: 'Would really help', where: 'UCT Config Screens', user: 'Grace Okoro', email: 'grace@pick2win.io', status: 'Planned', date: '2026-06-07' },
    { subject: 'Love the one-tap 20 teams!', body: 'Just wanted to say UCT is brilliant — keep it up.', category: '♥ What you love', importance: 'Nice to have', where: 'Anywhere / general', user: 'Mia Tanaka', email: 'no follow-up', status: 'Resolved', date: '2026-06-07' }
  ];

  constructor(private adminService: AdminService) { }

  ngOnInit(): void {
    this.useScreenMockData();
  }

  get filteredDetailedItems(): typeof this.detailedItems {
    return this.selectedDetailedFilter === 'all' ? this.detailedItems : this.detailedItems.filter(item => item.status.toLowerCase() === this.selectedDetailedFilter);
  }

  setDetailedFilter(filter: string): void { this.selectedDetailedFilter = filter; }

  get feedback(): AdminVotesFeedbackItem[] {
    return Array.isArray(this.list?.feedback) ? this.list!.feedback : [];
  }

  get feelBreakdown(): Array<{ label: string; count: number; pct: number }> {
    return Array.isArray(this.summary?.how_users_feel?.breakdown) ? this.summary!.how_users_feel.breakdown : [];
  }

  get requestedChanges(): Array<{ label?: string; title?: string; change?: string; count?: number; pct?: number; [key: string]: any }> {
    return Array.isArray(this.summary?.most_requested_changes) ? this.summary!.most_requested_changes : [];
  }

  get totalResponses(): number {
    return Number(this.summary?.kpis?.feedback_responses || this.list?.pagination?.total || 0);
  }

  get donutStyle(): string {
    const like = Number(this.summary?.kpis?.like_uct?.pct || 0);
    const changes = Number(this.summary?.kpis?.want_changes?.pct || 0);
    const dislike = Number(this.summary?.kpis?.dislike?.pct || 0);
    return `conic-gradient(#0bcc8e 0 ${like}%, #f4b400 ${like}% ${like + changes}%, #ff6b5b ${like + changes}% ${like + changes + dislike}%, rgba(255,255,255,.08) 0)`;
  }

  get ratingRows(): Array<{ rating: number; count: number; pct: number }> {
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
      list: this.adminService.getAdminReportsVotesList({ vote: this.selectedVote, page: this.page, limit: this.limit })
    }).subscribe({
      next: ({ summary, list }) => {
        this.summary = summary?.data || summary || null;
        this.list = list?.data || list || null;
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
    this.activeView = 'feedback';
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

  private useScreenMockData(): void {
    this.summary = {
      success: true,
      kpis: { feedback_responses: 1860, like_uct: { count: 1120, pct: 60.2 }, want_changes: { count: 560, pct: 30.1 }, dislike: { count: 180, pct: 9.7 } },
      insight: { sentiment_score: 41, likes_vs_last_period: 250, trend: 'positive', avg_rating: 4.1 },
      how_users_feel: { like_uct_pct: 60, breakdown: [{ label: '👍 Like UCT', count: 1120, pct: 60.2 }, { label: '👌 Like it, want changes', count: 560, pct: 30.1 }, { label: '👎 Dislike', count: 180, pct: 9.7 }] },
      most_requested_changes: [{ label: '🏆 More leagues / series', count: 1290, pct: 69.4 }, { label: '🟣 Let me choose my 18–22 players', count: 1040, pct: 55.9 }, { label: '🎮 Add more sports', count: 880, pct: 47.3 }, { label: '💰 Better coin packs', count: 760, pct: 40.9 }, { label: '💻 Website / UI improvements', count: 540, pct: 29.0 }, { label: '⚡ Remove Sub, Mandate options', count: 430, pct: 23.1 }]
    } as AdminVotesSummaryReports;
    this.list = { success: true, pagination: { page: 1, limit: 20, total: 12, total_pages: 1 }, filters: { vote: '' }, feedback: [
      { id: 1, feedback_code: 'FB-2041', fullname: 'Nadia Khan', region: 'United Kingdom', vote: 'like_uct', vote_label: '👍 Like UCT', rating: 5, comment: 'Love generating 20 teams in one tap — UCT is the best part.', date: '2026-06-09' },
      { id: 2, feedback_code: 'FB-2040', fullname: 'Arjun Mehta', region: 'Canada', vote: 'want_changes', vote_label: '👌 Want changes', rating: 4, comment: 'Great, but please add Champions League knockouts and let me pick my core players.', date: '2026-06-09' },
      { id: 3, feedback_code: 'FB-2039', fullname: 'Sofia Rossi', region: 'Italy', vote: 'like_uct', vote_label: '👍 Like UCT', rating: 5, comment: 'UCT keeps me coming back daily. Cricket next please!', date: '2026-06-08' },
      { id: 4, feedback_code: 'FB-2038', fullname: 'Hugo Martin', region: 'France', vote: 'dislike', vote_label: '👎 Dislike', rating: 2, comment: 'Coins burn too fast — a monthly subscription would suit me better.', date: '2026-06-08' }
    ] } as AdminVotesListReports;
  }
}
