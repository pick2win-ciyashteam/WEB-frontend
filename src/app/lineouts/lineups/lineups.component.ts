import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { Match, Series } from '../../core/interfaces/content';
import { ApiService } from '../../core/services/api.service';
import { AuthModalService } from '../../core/services/auth-modal.service';
import { AuthService } from '../../core/services/auth.service';
import { ProfileService } from '../../core/services/profile.service';

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
  status: string;
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
  coinBalance = 0;
  showSeriesCoverage = false;

  constructor(
    private api: ApiService,
    private authModal: AuthModalService,
    private authService: AuthService,
    private profileService: ProfileService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.generatedMatchIds = this.readGeneratedMatchIds();
    this.loadSeriesMatches();

    this.loggedIn$
      .pipe(takeUntil(this.destroy$))
      .subscribe(isLoggedIn => {
        this.isLoggedIn = isLoggedIn;

        if (isLoggedIn) {
          this.profileService.loadProfile().pipe(takeUntil(this.destroy$)).subscribe();
        } else {
          this.coinBalance = 0;
        }
      });

    this.profileService.profile$
      .pipe(takeUntil(this.destroy$))
      .subscribe(profile => {
        this.coinBalance = Number(profile?.coins ?? 0);
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get visibleMatches(): LineoutMatch[] {
    const nowMs = Date.now();
    return this.matches.filter(match => this.isLive(match) || new Date(match.kickoffISO).getTime() > nowMs);
  }

  get todayMatches(): LineoutMatch[] {
    const todayStr = this.localDateKey(new Date());
    return this.visibleMatches
      .filter(match => this.isLive(match) || this.localDateKey(match.kickoffISO) === todayStr)
      .sort((a, b) => this.sortTodayMatches(a, b));
  }

  get upcomingGroups(): MatchDayGroup[] {
    const todayStr = this.localDateKey(new Date());
    const groups = new Map<string, MatchDayGroup>();

    this.visibleMatches
      .filter(match => !this.isLive(match) && this.localDateKey(match.kickoffISO) !== todayStr)
      .sort((a, b) => new Date(a.kickoffISO).getTime() - new Date(b.kickoffISO).getTime())
      .forEach(match => {
        const date = new Date(match.kickoffISO);
        const key = this.localDateKey(date);
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

  get timezoneLabel(): string {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'your local timezone';
  }

  isGenerated(match: LineoutMatch): boolean {
    return this.generatedMatchIds.has(match.id);
  }

  statusLabel(match: LineoutMatch): string {
    if (this.isGenerated(match)) {
      return 'UCT Generated';
    }

    if (this.isLive(match)) {
      return match.lineupReady ? 'Live - lineups released' : 'Live';
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

  kickoffInfo(match: LineoutMatch): string {
    if (this.isLive(match)) {
      return `Live now - ${match.venue}`;
    }

    const kickoffMs = new Date(match.kickoffISO).getTime();
    const diffMs = kickoffMs - Date.now();

    if (diffMs <= 0) {
      return `Started - ${match.venue}`;
    }

    const totalMinutes = Math.ceil(diffMs / 60000);
    const days = Math.floor(totalMinutes / 1440);
    const hours = Math.floor((totalMinutes % 1440) / 60);
    const minutes = totalMinutes % 60;

    let label = '';

    if (days > 0) {
      label = `Kicks off in ${days}d ${hours}h`;
    } else if (hours > 0) {
      label = `Kicks off in ${hours}h ${minutes}m`;
    } else {
      label = `Kicks off in ${minutes}m`;
    }

    return `${label} - ${match.venue}`;
  }

  openMatch(match: LineoutMatch): void {
    this.router.navigate(['/lineouts/matches', match.id]);
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

  toggleSeriesCoverage(): void {
    this.showSeriesCoverage = !this.showSeriesCoverage;
  }

  trackByMatchId(_: number, match: LineoutMatch): string {
    return match.id;
  }

  trackByGroupLabel(_: number, group: MatchDayGroup): string {
    return group.label;
  }

  formatKickoff(match: LineoutMatch): string {
    if (this.isLive(match)) {
      return 'LIVE';
    }

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

    if (this.localDateKey(date) === this.localDateKey(tomorrow)) {
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
      lineupReady: this.isLineupAvailable(match),
      lineupJustReleased: this.isLineupAvailable(match),
      venue: match.status || 'Scheduled',
      status: match.status || 'Scheduled'
    };
  }

  isLive(match: LineoutMatch): boolean {
    return String(match.status || '').toUpperCase() === 'LIVE';
  }

  private isLineupAvailable(match: Match): boolean {
    const lineupFlag = String(match.lineupavailable).toLowerCase();
    const lineupStatus = String(match.lineup_status || '').toLowerCase();

    return lineupFlag === '1' || lineupFlag === 'true' || lineupStatus === 'available' || lineupStatus === 'released' || lineupStatus === 'confirmed';
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

  private localDateKey(value: Date | string): string {
    const date = value instanceof Date ? value : new Date(value);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  }

}
