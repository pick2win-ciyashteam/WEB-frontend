import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { EMPTY, Subject, catchError, forkJoin, interval, of, switchMap, takeUntil } from 'rxjs';
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
  sport?: string;
  country: string;
  home: LineoutTeam;
  away: LineoutTeam;
  kickoffISO: string;
  lineupReady: boolean;
  lineupJustReleased?: boolean;
  teamsGenerated: boolean;
  generatedGames: FantasyGame[];
  generatedTeamsCount?: number;
  generatedAt?: string | null;
  venue: string;
  status: string;
  active: boolean;
}

type FantasyGame = 'sorare' | 'draftkings' | 'fanduel';

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
  totalCoinBalance: number | null = null;
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
          this.totalCoinBalance = null;
        }
      });

    this.profileService.profile$
      .pipe(takeUntil(this.destroy$))
      .subscribe(profile => {
        this.coinBalance = Number(profile?.coins?.coins ?? 0);
        this.totalCoinBalance = profile ? Number(profile.coins?.total_coins ?? 0) : null;
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

  get showTryFreeNote(): boolean {
    return this.isLoggedIn && this.totalCoinBalance !== null && this.totalCoinBalance <= 0;
  }

  get upcomingMatchCount(): number {
    return this.upcomingGroups.reduce((total, group) => total + group.matches.length, 0);
  }

  get timezoneLabel(): string {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'your local timezone';
  }

  isGenerated(match: LineoutMatch): boolean {
    return match.teamsGenerated
      || (['draftkings', 'fanduel'] as FantasyGame[])
        .every(game => match.generatedGames.includes(game));
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
    const sport = String(match.sport || 'football').trim().toLowerCase() === 'soccer'
      ? 'football'
      : String(match.sport || 'football').trim().toLowerCase();
    const game = this.generatedGames(match as unknown as Match)[0] || 'draftkings';

    this.router.navigate(['/user/profile'], {
      queryParams: {
        tab: 'teams',
        match: match.id,
        sport,
        game
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

  private createUctContext(match: LineoutMatch): Record<string, unknown> {
    return {
      id: match.id,
      sport: match.sport || 'Football',
      homeName: match.home.name,
      awayName: match.away.name,
      homeCode: match.home.code,
      awayCode: match.away.code,
      venue: match.venue,
      series: match.league,
      kickoffISO: match.kickoffISO,
      generatedGames: match.generatedGames
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
          const mappedMatches = res?.success && Array.isArray(res.data)
            ? this.mapSeriesMatches(res.data)
            : [];

          this.hydrateGeneratedGames(mappedMatches, () => {
            this.matches = mappedMatches;

            if (!this.matches.length) {
              this.matchesError = 'No upcoming matches in our coverage right now.';
            }

            this.loadingMatches = false;
          });
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
          const freshMatches = this.mapSeriesMatches(res.data);
          this.hydrateGeneratedGames(freshMatches, () => this.refreshTodayMatches(freshMatches));
        }
      });
  }

  private hydrateGeneratedGames(matches: LineoutMatch[], done: () => void): void {
    if (!this.isLoggedIn || !matches.length) {
      done();
      return;
    }

    const games: FantasyGame[] = ['draftkings', 'fanduel'];
    const probes = matches.flatMap(match =>
      games.map(game => ({
        match,
        game,
        request: this.authService
          .getUserMyTeams(match.id, this.normalizedSport(match.sport), game)
          .pipe(catchError(() => of(null)))
      }))
    );

    forkJoin(probes.map(probe => probe.request))
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: responses => {
          responses.forEach((response, index) => {
            if (!this.hasGeneratedTeamsResponse(response)) {
              return;
            }

            const probe = probes[index];

            if (!probe.match.generatedGames.includes(probe.game)) {
              probe.match.generatedGames = [...probe.match.generatedGames, probe.game];
            }
          });

          matches.forEach(match => {
            match.teamsGenerated = games.every(game => match.generatedGames.includes(game));
          });

          done();
        },
        error: () => done()
      });
  }

  private hasGeneratedTeamsResponse(response: any): boolean {
    if (!response || response?.success === false) {
      return false;
    }

    const collections = [
      response?.teams,
      response?.generated_teams,
      response?.generatedTeams,
      response?.lineups,
      response?.data?.teams,
      response?.data?.generated_teams,
      response?.data?.generatedTeams,
      response?.data?.lineups,
      Array.isArray(response?.data) ? response.data : null,
      Array.isArray(response) ? response : null
    ];

    return Number(response?.total_teams || response?.data?.total_teams || 0) > 0
      || collections.some(collection => Array.isArray(collection) && collection.length > 0);
  }

  private normalizedSport(sport?: string): string {
    const value = String(sport || 'football').trim().toLowerCase();
    return value === 'soccer' ? 'football' : value;
  }

  private refreshTodayMatches(freshMatches: LineoutMatch[]): void {
    const existingNonTodayMatches = this.matches.filter(match => !this.isTodayMatch(match));
    const freshTodayMatches = freshMatches.filter(match => this.isTodayMatch(match));

    this.matches = [...existingNonTodayMatches, ...freshTodayMatches]
      .sort((a, b) => new Date(a.kickoffISO).getTime() - new Date(b.kickoffISO).getTime());
  }

  private mapSeriesMatches(seriesList: Series[]): LineoutMatch[] {
    const seenMatches = new Set<string>();

    return seriesList
      .flatMap(series => (series.matches ?? [])
        .filter(match => {
          const key = this.matchIdentity(match);

          if (seenMatches.has(key)) {
            return false;
          }

          seenMatches.add(key);
          return true;
        })
        .map(match => this.mapMatch(series, match)))
      .filter((match): match is LineoutMatch => !!match)
      .sort((a, b) => new Date(a.kickoffISO).getTime() - new Date(b.kickoffISO).getTime());
  }

  private matchIdentity(match: Match): string {
    const id = this.firstMatchValue(match, ['provider_match_id', 'id']);

    if (id !== undefined && id !== null && String(id).trim()) {
      return String(id).trim();
    }

    return [
      this.firstMatchValue(match, ['match_name', 'matchName']),
      this.firstMatchValue(match, ['hometeamname', 'home_team_name', 'homeTeamName']),
      this.firstMatchValue(match, ['awayteamname', 'away_team_name', 'awayTeamName']),
      this.firstMatchValue(match, ['start_time', 'matchdate'])
    ]
      .map(value => this.normalizedText(value))
      .filter(Boolean)
      .join('|');
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
      sport: String(this.firstMatchValue(match, ['sport', 'sport_name', 'sportName']) || 'Football'),
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
      generatedGames: this.generatedGames(match),
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
    const games = this.generatedGames(match);
    const allVisibleGamesGenerated = (['draftkings', 'fanduel'] as FantasyGame[])
      .every(game => games.includes(game));

    return allVisibleGamesGenerated || this.generatedGameCount(match) >= 2;
  }

  private generatedGames(match: Match): FantasyGame[] {
    const games = new Set<FantasyGame>();
    const source = match as unknown as Record<string, unknown>;

    this.addGeneratedGames(games, this.firstMatchValue(match, [
      'generated_games',
      'generatedGames',
      'games_generated',
      'gamesGenerated',
      'generated_platforms',
      'generatedPlatforms',
      'platforms_generated',
      'platformsGenerated'
    ]));

    const directGame = this.normalizeGame(this.firstMatchValue(match, [
      'game',
      'fantasy_platform',
      'fantasyPlatform',
      'platform'
    ]));

    const directTeamCount = Number(this.firstMatchValue(match, [
      'generated_teams_count',
      'teams_generated',
      'total_teams'
    ]) || 0);

    if (directGame && (this.generatedGameCount(match) > 0 || directTeamCount > 0)) {
      games.add(directGame);
    }

    (['sorare', 'draftkings', 'fanduel'] as FantasyGame[]).forEach(game => {
      const values = [
        source[`${game}_generated`],
        source[`${game}_uct_generated`],
        source[`${game}_teams_generated`],
        source[`${game}_generated_at`],
        source[`${game}_teams_count`]
      ];

      if (values.some(value => this.isTruthyFlag(value) || Number(value) > 0)) {
        games.add(game);
      }
    });

    return Array.from(games);
  }

  private generatedGameCount(match: Match): number {
    const value = this.firstMatchValue(match, [
      'generated_game_count',
      'generated_games_count',
      'games_generated_count',
      'platforms_generated_count',
      'uct_generated_count'
    ]);
    const count = Number(value);

    return Number.isFinite(count) ? count : 0;
  }

  private addGeneratedGames(games: Set<FantasyGame>, value: unknown): void {
    if (Array.isArray(value)) {
      value.forEach(item => this.addGeneratedGames(games, item));
      return;
    }

    if (this.isRecord(value)) {
      const game = this.normalizeGame(value['game'] || value['platform'] || value['fantasy_platform'] || value['name']);
      const generated = value['generated'] ?? value['teams_generated'] ?? value['is_generated'] ?? value['generated_at'];

      if (game && (generated === undefined || generated === null || this.isTruthyFlag(generated) || Number(generated) > 0)) {
        games.add(game);
      }
      return;
    }

    String(value ?? '')
      .split(/[,|]/)
      .map(item => this.normalizeGame(item))
      .filter((game): game is FantasyGame => !!game)
      .forEach(game => games.add(game));
  }

  private normalizeGame(value: unknown): FantasyGame | null {
    const text = this.normalizedText(value);

    if (text === 'sorare') return 'sorare';
    if (text === 'draftkings' || text === 'draftking' || text === 'dk') return 'draftkings';
    if (text === 'fanduel' || text === 'fd') return 'fanduel';

    return null;
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
