import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { EMPTY, Subject, catchError, interval, switchMap, takeUntil } from 'rxjs';
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
  teamsGenerated: boolean;
  generatedTeamsCount?: number;
  generatedAt?: string | null;
  venue: string;
  status: string;
  active: boolean;
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
  private readonly todayRefreshMs = 60000;
  private balanceFocusTimer: ReturnType<typeof setTimeout> | null = null;

  readonly loggedIn$ = this.authService.loggedIn$;
  isLoggedIn = this.authService.isLoggedIn();
  matches: LineoutMatch[] = [];
  loadingMatches = true;
  matchesError = '';
  coinBalance = 0;
  showBalanceRequired = false;
  showSeriesCoverage = false;
  readonly showUctButtonForTesting = false;

  constructor(
    private api: ApiService,
    private authModal: AuthModalService,
    private authService: AuthService,
    private profileService: ProfileService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadSeriesMatches();
    this.startTodayMatchesRefresh();

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
        this.coinBalance = Number(profile?.coins?.coins ?? 0);
      });
  }

  ngOnDestroy(): void {
    if (this.balanceFocusTimer) {
      clearTimeout(this.balanceFocusTimer);
    }

    this.destroy$.next();
    this.destroy$.complete();
  }

  get visibleMatches(): LineoutMatch[] {
    return this.matches.filter(match => this.isVisibleMatch(match));
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
    return this.todayMatches.filter(match => this.canRunUct(match)).length;
  }

  get upcomingMatchCount(): number {
    return this.upcomingGroups.reduce((total, group) => total + group.matches.length, 0);
  }

  get timezoneLabel(): string {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'your local timezone';
  }

  isGenerated(match: LineoutMatch): boolean {
    return match.teamsGenerated;
  }

  statusLabel(match: LineoutMatch): string {
    if (this.isGenerated(match)) {
      return 'Teams Generated';
    }

    return match.lineupReady ? 'Lineup Ready' : 'Waiting for lineup';
  }

  actionLabel(match: LineoutMatch): string {
    if (this.isGenerated(match)) {
      return 'View Team';
    }

    if (!this.canRunUct(match)) {
      return 'UCT Locked';
    }

    return 'Run UCT';
  }

  kickoffInfo(match: LineoutMatch): string {
    const countdown = this.kickoffCountdown(match);

    if (countdown) {
      return `Kicks off ${countdown}`;
    }

    return this.kickoffStartedLabel(match);
  }

  kickoffStartedLabel(match: LineoutMatch): string {
    const kickoffMs = new Date(match.kickoffISO).getTime();
    const diffMs = kickoffMs - Date.now();

    if (diffMs <= 0) {
      return this.isLive(match) ? 'In progress' : 'Match started';
    }

    return '';
  }

  kickoffCountdown(match: LineoutMatch): string {
    const kickoffMs = new Date(match.kickoffISO).getTime();
    const diffMs = kickoffMs - Date.now();

    if (diffMs <= 0) {
      return '';
    }

    const totalMinutes = Math.ceil(diffMs / 60000);
    const days = Math.floor(totalMinutes / 1440);
    const hours = Math.floor((totalMinutes % 1440) / 60);
    const minutes = totalMinutes % 60;

    if (days > 0) {
      return `${days}d ${hours}h`;
    }

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }

    return `${minutes}m`;
  }

  openMatch(match: LineoutMatch): void {
    if (!this.canOpenMatch(match)) {
      return;
    }

    if (!this.isLoggedIn) {
      this.authModal.open('login');
      return;
    }

    this.openMatchDestination(match);
  }

  canOpenMatch(match: LineoutMatch): boolean {
    return this.isGenerated(match) || this.canRunUct(match);
  }

canRunUct(match: LineoutMatch): boolean {
  const kickoffTime = new Date(match.kickoffISO).getTime();
  const matchStarted = Number.isFinite(kickoffTime) && Date.now() >= kickoffTime;

  return !this.isGenerated(match)
    && !this.isLive(match)
    && !matchStarted
    && (this.showUctButtonForTesting || match.lineupReady);
}

  handleMatchAction(match: LineoutMatch): void {
    if (!this.canOpenMatch(match)) {
      return;
    }

    if (!this.isLoggedIn) {
      this.authModal.open('login');
      return;
    }

    this.openMatchDestination(match);
  }

  openCreateUct(match: LineoutMatch): void {
    this.storeCreateUctContext(match);
    this.router.navigate(['/lineouts/create-uct', match.id], {
      state: {
        lineoutMatch: this.createUctContext(match)
      }
    });
  }

  openViewTeams(match: LineoutMatch): void {
    this.router.navigate(['/user/profile'], {
      queryParams: {
        tab: 'teams',
        match: match.id
      }
    });
  }

  private openMatchDestination(match: LineoutMatch): void {
    if (this.isGenerated(match)) {
      this.openViewTeams(match);
      return;
    }

    if (!this.hasCoinsForUct()) {
      this.focusBalanceCard();
      return;
    }

    this.openCreateUct(match);
  }

  private hasCoinsForUct(): boolean {
    return Number(this.coinBalance || 0) > 0;
  }

  private focusBalanceCard(): void {
    this.showBalanceRequired = true;

    setTimeout(() => {
      document.getElementById('lineoutsBalanceCard')?.scrollIntoView({
        behavior: 'smooth',
        block: 'center'
      });
    });

    if (this.balanceFocusTimer) {
      clearTimeout(this.balanceFocusTimer);
    }

    this.balanceFocusTimer = setTimeout(() => {
      this.showBalanceRequired = false;
      this.balanceFocusTimer = null;
    }, 4200);
  }

  private storeCreateUctContext(match: LineoutMatch): void {
    try {
      sessionStorage.setItem(`lineout-match-${match.id}`, JSON.stringify(this.createUctContext(match)));
    } catch {
      // Non-critical; create UCT still loads core match details by id.
    }
  }

  private createUctContext(match: LineoutMatch): Record<string, string> {
    return {
      id: match.id,
      homeName: match.home.name,
      awayName: match.away.name,
      homeCode: match.home.code,
      awayCode: match.away.code,
      venue: match.venue,
      series: match.league,
      kickoffISO: match.kickoffISO
    };
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

  matchDayStamp(match: LineoutMatch): string {
    return this.shortDayLabel(new Date(match.kickoffISO));
  }

  matchDetailLine(match: LineoutMatch): string {
    return [this.kickoffInfo(match), match.venue].filter(Boolean).join(' - ');
  }

  todayGroupLabel(): string {
    return this.fullDayLabel(new Date());
  }

  daysUntil(date: Date): number {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const target = new Date(date);
    target.setHours(0, 0, 0, 0);
    return Math.max(1, Math.round((target.getTime() - start.getTime()) / 86400000));
  }

  private sortTodayMatches(a: LineoutMatch, b: LineoutMatch): number {
    const aActionable = a.lineupReady;
    const bActionable = b.lineupReady;

    if (aActionable !== bActionable) {
      return aActionable ? -1 : 1;
    }

    return new Date(a.kickoffISO).getTime() - new Date(b.kickoffISO).getTime();
  }

  private dayLabel(date: Date): string {
    return this.fullDayLabel(date);
  }

  private fullDayLabel(date: Date): string {
    const relative = this.shortDayLabel(date);

    return `${relative} \u2022 ${new Intl.DateTimeFormat('en-GB', {
      weekday: 'long',
      day: 'numeric',
      month: 'short'
    }).format(date)}`.toUpperCase();
  }

  private shortDayLabel(date: Date): string {
    const today = new Date();
    const tomorrow = new Date();
    tomorrow.setDate(today.getDate() + 1);

    if (this.localDateKey(date) === this.localDateKey(today)) {
      return 'Today';
    }

    if (this.localDateKey(date) === this.localDateKey(tomorrow)) {
      return 'Tomorrow';
    }

    return new Intl.DateTimeFormat('en-GB', {
      weekday: 'short'
    }).format(date);
  }

  private loadSeriesMatches(): void {
    this.loadingMatches = true;
    this.matchesError = '';

    this.api.getSeriesMatches()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          console.log('Lineups series response:', res);

          this.matches = res?.success && Array.isArray(res.data)
            ? this.mapSeriesMatches(res.data)
            : [];

          // console.log('Lineups mapped matches:', this.matches);

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

  private startTodayMatchesRefresh(): void {
    interval(this.todayRefreshMs)
      .pipe(
        takeUntil(this.destroy$),
        switchMap(() => this.api.getSeriesMatches().pipe(catchError(() => EMPTY)))
      )
      .subscribe(res => {
        if (res?.success && Array.isArray(res.data)) {
          this.refreshTodayMatches(this.mapSeriesMatches(res.data));
        }
      });
  }

  private refreshTodayMatches(freshMatches: LineoutMatch[]): void {
    const existingNonTodayMatches = this.matches.filter(match => !this.isTodayMatch(match));
    const freshTodayMatches = freshMatches.filter(match => this.isTodayMatch(match));

    this.matches = [...existingNonTodayMatches, ...freshTodayMatches]
      .sort((a, b) => new Date(a.kickoffISO).getTime() - new Date(b.kickoffISO).getTime());
  }

  private mapSeriesMatches(seriesList: Series[]): LineoutMatch[] {
    return seriesList
      .flatMap(series => (series.matches ?? []).map(match => this.mapMatch(series, match)))
      .filter((match): match is LineoutMatch => !!match)
      .sort((a, b) => new Date(a.kickoffISO).getTime() - new Date(b.kickoffISO).getTime());
  }

  private mapMatch(series: Series, match: Match): LineoutMatch | null {
    const kickoffISO = match.start_time || match.matchdate;

    if (!kickoffISO || this.isInactiveMatch(match)) {
      return null;
    }

    const homeName = this.teamDisplayName(match, 'home');
    const awayName = this.teamDisplayName(match, 'away');

    return {
      id: String(match.id || match.provider_match_id),
      league: match.seriesname || series.name,
      country: series.season || series.status || 'Football',
      home: this.createTeam(
        homeName,
        match.home_team_logo,
        match.home_team_name || match.hometeamname
      ),
      away: this.createTeam(
        awayName,
        match.away_team_logo,
        match.away_team_name || match.awayteamname
      ),
      kickoffISO,
      lineupReady: this.isLineupAvailable(match),
      lineupJustReleased: this.isLineupAvailable(match),
      teamsGenerated: this.hasGeneratedTeams(match),
      generatedTeamsCount: Number(match.generated_teams_count ?? 0),
      generatedAt: match.generated_at ?? null,
      venue: this.formatVenue(match),
      status: match.status || 'Scheduled',
      active: true
    };
  }

  isLive(match: LineoutMatch): boolean {
    return String(match.status || '').toUpperCase() === 'LIVE';
  }

  private isTodayMatch(match: LineoutMatch): boolean {
    return this.isLive(match) || this.localDateKey(match.kickoffISO) === this.localDateKey(new Date());
  }

  private isVisibleMatch(match: LineoutMatch): boolean {
    const status = String(match.status || '').toUpperCase();

    if (['LIVE', 'UPCOMING', 'SCHEDULED', 'NOT_STARTED', 'NS'].includes(status)) {
      return true;
    }

    if (['FINISHED', 'FT', 'ENDED', 'CANCELLED', 'POSTPONED'].includes(status)) {
      return false;
    }

    return match.active;
  }

  private isInactiveMatch(match: Match): boolean {
    const value = this.firstMatchValue(match, ['is_active', 'isActive', 'active']);

    if (value === undefined || value === null) {
      return false;
    }

    if (typeof value === 'boolean') {
      return !value;
    }

    if (typeof value === 'number') {
      return value === 0;
    }

    return ['0', 'false', 'no', 'inactive', 'disabled'].includes(this.normalizedText(value));
  }

  private formatVenue(match: Match): string {
    const venueName = String(this.firstMatchValue(match, ['venue_name', 'venueName', 'venue']) || '').trim();
    const venueCity = String(this.firstMatchValue(match, ['venue_city', 'venueCity', 'city']) || '').trim();

    return [venueName, venueCity].filter(Boolean).join(', ');
  }

  private teamDisplayName(match: Match, side: 'home' | 'away'): string {
    const directName = String(
      side === 'home'
        ? this.firstMatchValue(match, ['hometeamname', 'homeTeamNameFull', 'home_full_name'])
        : this.firstMatchValue(match, ['awayteamname', 'awayTeamNameFull', 'away_full_name'])
    ).trim();

    if (directName && directName !== 'undefined' && directName !== 'null') {
      return directName;
    }

    const matchName = String(this.firstMatchValue(match, ['match_name', 'matchName']) || '').trim();
    const teams = matchName.split(/\s+vs\s+/i).map(team => team.trim()).filter(Boolean);

    if (teams.length >= 2) {
      return side === 'home' ? teams[0] : teams[1];
    }

    const shortName = String(
      side === 'home'
        ? this.firstMatchValue(match, ['home_team_name', 'homeTeamName'])
        : this.firstMatchValue(match, ['away_team_name', 'awayTeamName'])
    ).trim();

    return shortName || 'TBD';
  }

  private isLineupAvailable(match: Match): boolean {
    const flag = this.firstMatchValue(match, [
      'lineupavailable',
      'lineup_available',
      'lineups_available',
      'is_lineup_available',
      'lineupReady',
      'lineup_ready'
    ]);
    const status = this.normalizedText(this.firstMatchValue(match, [
      'lineup_status',
      'lineupStatus',
      'lineups_status'
    ]));

    return this.isAvailableFlag(flag)
      || ['available', 'released', 'confirmed', 'ready', 'lineupavailable', 'lineupsavailable', 'lineupreleased', 'lineupsreleased', 'lineupconfirmed', 'lineupsconfirmed'].includes(status)
      || this.hasStartingLineupCounts(match);
  }

  private hasGeneratedTeams(match: Match): boolean {
    const generated = this.firstMatchValue(match, [
      'teams_generated',
      'teamsGenerated',
      'uct_generated',
      'is_uct_generated'
    ]);

    return this.isTruthyFlag(generated);
  }

  private hasStartingLineupCounts(match: Match): boolean {
    const homeCount = Math.max(
      this.numericMatchValue(match, ['home_playing_xi', 'home_playing_xi_count', 'home_lineup_count']),
      this.arrayLengthAtPath(match, ['home_team', 'playing_xi']),
      this.arrayLengthAtPath(match, ['homeTeam', 'playing_xi'])
    );
    const awayCount = Math.max(
      this.numericMatchValue(match, ['away_playing_xi', 'away_playing_xi_count', 'away_lineup_count']),
      this.arrayLengthAtPath(match, ['away_team', 'playing_xi']),
      this.arrayLengthAtPath(match, ['awayTeam', 'playing_xi'])
    );
    const totalCount = Math.max(
      this.numericMatchValue(match, ['playing_xi_count', 'starting_players_count', 'lineup_players_count']),
      this.totalNestedLineupPlayers(match)
    );

    return (homeCount >= 11 && awayCount >= 11) || totalCount >= 22;
  }

  private numericMatchValue(match: Match, keys: string[]): number {
    const value = this.firstMatchValue(match, keys);
    const numeric = Number(value);

    return Number.isFinite(numeric) ? numeric : 0;
  }

  private firstMatchValue(match: Match, keys: string[]): unknown {
    const source = match as unknown as Record<string, unknown>;

    return keys.map(key => source[key]).find(value => value !== undefined && value !== null);
  }

  private isTruthyFlag(value: unknown): boolean {
    if (typeof value === 'boolean') {
      return value;
    }

    if (typeof value === 'number') {
      return value === 1;
    }

    const text = this.normalizedText(value);

    return ['1', 'true', 'yes', 'y', 'available', 'released', 'confirmed', 'ready'].includes(text);
  }

  private isAvailableFlag(value: unknown): boolean {
    if (this.isTruthyFlag(value)) {
      return true;
    }

    const numeric = Number(value);

    return Number.isFinite(numeric) && numeric > 0;
  }

  private normalizedText(value: unknown): string {
    return String(value ?? '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '');
  }

  private arrayLengthAtPath(match: Match, path: string[]): number {
    let current: unknown = match;

    for (const key of path) {
      if (!this.isRecord(current)) {
        return 0;
      }

      current = current[key];
    }

    return Array.isArray(current) ? current.length : 0;
  }

  private totalNestedLineupPlayers(match: Match): number {
    const lineupKeys = new Set([
      'playing_xi',
      'playingXI',
      'starting_xi',
      'startingXI',
      'lineup_players',
      'lineupPlayers'
    ]);

    return this.collectLineupArrayLengths(match, lineupKeys, 0)
      .reduce((total, count) => total + count, 0);
  }

  private collectLineupArrayLengths(value: unknown, lineupKeys: Set<string>, depth: number): number[] {
    if (depth > 4 || !this.isRecord(value)) {
      return [];
    }

    return Object.entries(value).flatMap(([key, child]) => {
      if (lineupKeys.has(key) && Array.isArray(child)) {
        return [child.length];
      }

      if (Array.isArray(child)) {
        return child.flatMap(item => this.collectLineupArrayLengths(item, lineupKeys, depth + 1));
      }

      return this.collectLineupArrayLengths(child, lineupKeys, depth + 1);
    });
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
  }

  private createTeam(name: string, logo?: string, codeSource?: string): LineoutTeam {
    return {
      code: this.teamCode(codeSource || name),
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

  private localDateKey(value: Date | string): string {
    const date = value instanceof Date ? value : new Date(value);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  }

}
