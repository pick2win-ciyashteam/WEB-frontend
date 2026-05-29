import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { Match, Series } from '../../core/interfaces/content';
import { ApiService } from '../../core/services/api.service';
import { AuthModalService } from '../../core/services/auth-modal.service';
import { AuthService } from '../../core/services/auth.service';

interface LineoutTeam {
  code: string;
  name: string;
  color: string;
  logo?: string;
}

interface LineoutMatch {
  id: string;
  league: string;
  country: string;
  home: LineoutTeam;
  away: LineoutTeam;
  kickoffISO: string;
  lineupReady: boolean;
  lineupJustReleased?: boolean;
  venue: string;
}

interface MatchDayGroup {
  label: string;
  date: Date;
  matches: LineoutMatch[];
}

@Component({
  selector: 'app-lineups',
  templateUrl: './lineups.component.html',
  styleUrls: ['./lineups.component.css']
})
export class LineupsComponent implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();
  private readonly generatedStorageKey = 'pick2win_generated_match_ids';

  readonly loggedIn$ = this.authService.loggedIn$;
  isLoggedIn = this.authService.isLoggedIn();
  generatedMatchIds = new Set<string>();
  matches: LineoutMatch[] = [];
  loadingMatches = true;
  matchesError = '';
  readonly coinBalance = 47;

  constructor(
    private api: ApiService,
    private authModal: AuthModalService,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.generatedMatchIds = this.readGeneratedMatchIds();
    this.loadSeriesMatches();

    this.loggedIn$
      .pipe(takeUntil(this.destroy$))
      .subscribe(isLoggedIn => {
        this.isLoggedIn = isLoggedIn;
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get visibleMatches(): LineoutMatch[] {
    const nowMs = Date.now();
    return this.matches.filter(match => new Date(match.kickoffISO).getTime() > nowMs);
  }

  get todayMatches(): LineoutMatch[] {
    const todayStr = new Date().toDateString();
    return this.visibleMatches
      .filter(match => new Date(match.kickoffISO).toDateString() === todayStr)
      .sort((a, b) => this.sortTodayMatches(a, b));
  }

  get upcomingGroups(): MatchDayGroup[] {
    const todayStr = new Date().toDateString();
    const groups = new Map<string, MatchDayGroup>();

    this.visibleMatches
      .filter(match => new Date(match.kickoffISO).toDateString() !== todayStr)
      .sort((a, b) => new Date(a.kickoffISO).getTime() - new Date(b.kickoffISO).getTime())
      .forEach(match => {
        const date = new Date(match.kickoffISO);
        const key = date.toDateString();
        const group = groups.get(key) ?? {
          label: this.dayLabel(date),
          date,
          matches: []
        };

        group.matches.push(match);
        groups.set(key, group);
      });

    return Array.from(groups.values()).sort((a, b) => a.date.getTime() - b.date.getTime());
  }

  get readyAndNotGeneratedCount(): number {
    return this.todayMatches.filter(match => match.lineupReady && !this.isGenerated(match)).length;
  }

  get upcomingMatchCount(): number {
    return this.upcomingGroups.reduce((total, group) => total + group.matches.length, 0);
  }

  isGenerated(match: LineoutMatch): boolean {
    return this.generatedMatchIds.has(match.id);
  }

  statusLabel(match: LineoutMatch): string {
    if (this.isGenerated(match)) {
      return 'UCT Generated';
    }

    if (match.lineupReady) {
      return match.lineupJustReleased ? 'Lineups just dropped' : 'Lineups ready';
    }

    return 'Waiting for lineups';
  }

  actionLabel(match: LineoutMatch): string {
    if (this.isGenerated(match)) {
      return 'See in My Teams';
    }

    if (!match.lineupReady) {
      return 'Waiting for lineups';
    }

    return this.isLoggedIn ? 'Generate UCT' : 'Sign in to generate';
  }

  handleMatchAction(match: LineoutMatch): void {
    if (this.isGenerated(match)) {
      this.router.navigate(['/user/profile']);
      return;
    }

    if (!match.lineupReady) {
      return;
    }

    if (!this.isLoggedIn) {
      this.authModal.open('login');
      return;
    }

    this.generatedMatchIds.add(match.id);
    this.saveGeneratedMatchIds();
  }

  openLogin(): void {
    this.authModal.open('login');
  }

  openSignup(): void {
    this.authModal.open('signup');
  }

  trackByMatchId(_: number, match: LineoutMatch): string {
    return match.id;
  }

  trackByGroupLabel(_: number, group: MatchDayGroup): string {
    return group.label;
  }

  formatKickoff(match: LineoutMatch): string {
    return new Intl.DateTimeFormat('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }).format(new Date(match.kickoffISO));
  }

  dateStamp(match: LineoutMatch): string {
    return new Intl.DateTimeFormat('en-GB', {
      weekday: 'short',
      day: '2-digit',
      month: 'short'
    }).format(new Date(match.kickoffISO));
  }

  daysUntil(date: Date): number {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const target = new Date(date);
    target.setHours(0, 0, 0, 0);
    return Math.max(1, Math.round((target.getTime() - start.getTime()) / 86400000));
  }

  private sortTodayMatches(a: LineoutMatch, b: LineoutMatch): number {
    const aGenerated = this.isGenerated(a);
    const bGenerated = this.isGenerated(b);
    const aActionable = a.lineupReady && !aGenerated;
    const bActionable = b.lineupReady && !bGenerated;

    if (aActionable !== bActionable) {
      return aActionable ? -1 : 1;
    }

    if (aGenerated !== bGenerated) {
      return aGenerated ? 1 : -1;
    }

    return new Date(a.kickoffISO).getTime() - new Date(b.kickoffISO).getTime();
  }

  private dayLabel(date: Date): string {
    const today = new Date();
    const tomorrow = new Date();
    tomorrow.setDate(today.getDate() + 1);

    if (date.toDateString() === tomorrow.toDateString()) {
      return 'Tomorrow';
    }

    return new Intl.DateTimeFormat('en-GB', {
      weekday: 'long',
      day: '2-digit',
      month: 'short'
    }).format(date);
  }

  private loadSeriesMatches(): void {
    this.loadingMatches = true;
    this.matchesError = '';

    this.api.getSeriesMatches()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.matches = res?.success && Array.isArray(res.data)
            ? this.mapSeriesMatches(res.data)
            : [];

          if (!this.matches.length) {
            this.matchesError = 'No upcoming matches in our coverage right now.';
          }

          this.loadingMatches = false;
        },
        error: () => {
          this.matches = [];
          this.matchesError = 'Unable to load matches. Please try again later.';
          this.loadingMatches = false;
        }
      });
  }

  private mapSeriesMatches(seriesList: Series[]): LineoutMatch[] {
    return seriesList
      .flatMap(series => (series.matches ?? []).map(match => this.mapMatch(series, match)))
      .filter((match): match is LineoutMatch => !!match)
      .sort((a, b) => new Date(a.kickoffISO).getTime() - new Date(b.kickoffISO).getTime());
  }

  private mapMatch(series: Series, match: Match): LineoutMatch | null {
    const kickoffISO = match.start_time || match.matchdate;

    if (!kickoffISO || !match.is_active) {
      return null;
    }

    return {
      id: String(match.id || match.provider_match_id),
      league: series.name,
      country: series.season || series.status || 'Football',
      home: this.createTeam(match.home_team_name, match.home_team_logo),
      away: this.createTeam(match.away_team_name, match.away_team_logo),
      kickoffISO,
      lineupReady: match.lineupavailable === 1 || match.lineup_status === 'available',
      lineupJustReleased: match.lineup_status === 'available',
      venue: match.status || 'Scheduled'
    };
  }

  private createTeam(name: string, logo?: string): LineoutTeam {
    return {
      code: this.teamCode(name),
      name,
      color: this.teamColor(name),
      logo
    };
  }

  private teamCode(name: string): string {
    return (name || 'TBD').trim().slice(0, 3).toUpperCase();
  }

  private teamColor(name: string): string {
    const palette = ['#6CABDD', '#EF0107', '#FEBE10', '#00A3E0', '#0BCC8E', '#CB3524', '#C39E6D', '#5D9731'];
    const total = (name || '').split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
    return palette[total % palette.length];
  }

  private readGeneratedMatchIds(): Set<string> {
    try {
      const raw = localStorage.getItem(this.generatedStorageKey);
      const ids = raw ? JSON.parse(raw) : [];
      return new Set(Array.isArray(ids) ? ids : []);
    } catch {
      return new Set<string>();
    }
  }

  private saveGeneratedMatchIds(): void {
    localStorage.setItem(this.generatedStorageKey, JSON.stringify(Array.from(this.generatedMatchIds)));
  }

}
