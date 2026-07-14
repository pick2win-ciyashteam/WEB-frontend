import { Component, OnDestroy, OnInit } from '@angular/core';
import { ApiService } from 'src/app/core/services/api.service';
import { AuthService } from 'src/app/core/services/auth.service';
import { ActivatedRoute, Router } from '@angular/router';
import { catchError, forkJoin, of } from 'rxjs';

type PlayerPosition = 'GK' | 'DEF' | 'MID' | 'FWD';
type FantasyGame = 'sorare' | 'draftkings' | 'fanduel';

interface GeneratedMatch {
  id: number;
  league: string;
  time: string;
  title: string;
  coin: string;
  generatedAt: string;
  expires: string;
  live?: boolean;
  free?: boolean;
  homeLogo?: string;
  awayLogo?: string;
  homeFullName?: string;
  awayFullName?: string;
  status?: string;
  teamsGenerated?: number;
  viewable?: boolean;
  matchDate?: string;
  startDate?: string;
  filterDates?: string[];
  startTimeISO?: string;
  generatedAtISO?: string;
  generationTime?: string | number;
  fantasyPlatform?: string;
  game?: FantasyGame;
  generatedGames?: FantasyGame[];
  teamsGeneratedByGame?: Partial<Record<FantasyGame, number>>;
  sport?: string;
  coinConsumed?: string | number;
}

interface ApiPlayer {
  id: number;
  match_id?: number;
  team_side?: 'team_a' | 'team_b';
  team_name?: string;
  name: string;
  original_name?: string;
  role: PlayerPosition;
  mandate?: string | null;
  captain?: string | null;
  cap?: string | null;
  dt_no?: number;
  salary?: number | string | null;
  logo?: string | null;
  elogo?: string | null;
  image?: string | null;
  photo?: string | null;
  player_image?: string | null;
}

interface ApiGeneratedTeam {
  team_no: number;
  id?: number;
  team_id?: number;
  number?: number;
  captain?: string;
  vice_captain?: string;
  players: ApiPlayer[];
}

interface ApiPreviewPlayer {
  name: string;
  role?: PlayerPosition;
  image?: string | null;
  side?: 'team_a' | 'team_b';
  team_name?: string;
  salary?: number | string | null;
}

interface ApiTeamsPreview {
  substitutes?: ApiPreviewPlayer[];
  mandate_yes?: ApiPreviewPlayer[];
  mandate_no?: ApiPreviewPlayer[];
  cvc_players?: ApiPreviewPlayer[];
  captains?: ApiPreviewPlayer[];
  vice_captains?: ApiPreviewPlayer[];
  substitutes_count?: number;
  mandate_yes_count?: number;
  mandate_no_count?: number;
  cvc_count?: number;
  cvc_players_count?: number;
  captain_count?: number;
  captains_count?: number;
  captaincy_count?: number;
  vice_captain_count?: number;
  vice_captains_count?: number;
}

interface PreviewPlayer {
  id: number;
  name: string;
  short: string;
  pos: PlayerPosition;
  team: 'home' | 'away';
  captain?: string | null;
  logo?: string | null;
}

interface PreviewTeam {
  id: number;
  split: string;
  players: PreviewPlayer[];
  captain: PreviewPlayer | null;
  viceCaptain: PreviewPlayer | null;
  homeCount: number;
  awayCount: number;
  counts: Record<PlayerPosition, number>;
}

@Component({
  selector: 'app-my-teams',
  templateUrl: './my-teams.component.html',
  styleUrls: ['./my-teams.component.css']
})
export class MyTeamsComponent implements OnInit, OnDestroy {
  selectedMatch: GeneratedMatch | null = null;
  previewTeam: PreviewTeam | null = null;
  previewIndex = 0;
  expandedPreviewPlayerId: number | null = null;

  matches: GeneratedMatch[] = [];
  previewTeams: PreviewTeam[] = [];

  readonly positionRows: PlayerPosition[] = ['GK', 'DEF', 'MID', 'FWD'];
  private readonly defaultGame: FantasyGame = 'draftkings';
  private readonly visibleGames: FantasyGame[] = ['draftkings', 'fanduel'];
  readonly gameTabs: Array<{ id: FantasyGame; label: string }> = [
    { id: 'draftkings', label: 'DraftKings' },
    { id: 'fanduel', label: 'FanDuel' }
  ];
  activeSport = '';
  activeGame: FantasyGame = this.defaultGame;

  loadingMatches = false;
  loadingTeams = false;
  loadingPlayers = false;
  gameTabLoading = false;

  browserLocale = navigator.language || 'en-US';
  selectedDate = this.toDateInputValue(new Date());
  filteredMatches: GeneratedMatch[] = [];
  private expiryTimer: any;
  private availabilityHydrationTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private api: ApiService,
    private authService: AuthService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadMatches();
    this.expiryTimer = setInterval(() => this.refreshExpiryLabels(), 60000);
  }

  ngOnDestroy(): void {
    clearInterval(this.expiryTimer);
    if (this.availabilityHydrationTimer) {
      clearTimeout(this.availabilityHydrationTimer);
    }
  }

  loadMatches(): void {
  this.loadingMatches = true;

  this.api.GetMyTeams().subscribe({
    next: (res: any) => {
      const data = Array.isArray(res?.data) ? res.data : [];

      const matchMap = new Map<number, GeneratedMatch>();

      data.forEach((m: any) => {
        const startTimeISO = m.start_time || '';
        const expired = this.isExpired(startTimeISO, m.status);
        const id = Number(m.match_id);
        const game = this.normalizeGame(m.game || m.fantasy_platform || m.platform);
        const generatedGames = this.generatedGamesFromValue([
          m.generated_games,
          m.games_generated,
          m.generated_platforms,
          m.generatedGames,
          m.gamesGenerated,
          m.platforms_generated,
          m.platformsGenerated,
          m
        ]);
        if (game) generatedGames.add(game);
        const teamsGenerated = Number(m.teams_generated || m.total_teams || 0);
        const teamsGeneratedByGame = this.teamsGeneratedByGameFromMatch(m, game, teamsGenerated);
        const filterDates = this.dateCandidatesFromMatch(m, startTimeISO);
        const startDate = filterDates[0] || '';

        const existing = matchMap.get(id);
        if (existing) {
          const currentGames = new Set(existing.generatedGames || []);
          generatedGames.forEach(item => currentGames.add(item));
          existing.generatedGames = Array.from(currentGames);
          existing.filterDates = Array.from(new Set([...(existing.filterDates || []), ...filterDates]));
          existing.startDate = existing.startDate || startDate;
          existing.teamsGenerated = Math.max(Number(existing.teamsGenerated || 0), teamsGenerated);
          if (game) {
            existing.teamsGeneratedByGame = {
              ...(existing.teamsGeneratedByGame || {}),
              [game]: Math.max(Number(existing.teamsGeneratedByGame?.[game] || 0), teamsGenerated)
            };
          }
          existing.teamsGeneratedByGame = this.mergeTeamCounts(existing.teamsGeneratedByGame, teamsGeneratedByGame);
          existing.sport = existing.sport || m.sport || 'Football';
          return;
        }

        matchMap.set(id, {
          id,
          league: m.series_name || 'N/A',
          time: this.formatMatchTime(startTimeISO),
          title: `${m.home_team || 'HOME'} vs ${m.away_team || 'AWAY'}`,
          coin: '-1',
          generatedAt: this.formatTime(m.generated_at),
          generatedAtISO: m.generated_at || '',
          generationTime: m.generation_time || m.generation_seconds || m.generation_time_seconds || '',
          expires: this.expiryLabel(startTimeISO, m.status),
          live: !expired,
          free: false,
          fantasyPlatform: game ? this.gameLabel(game) : '',
          game: game || undefined,
          generatedGames: Array.from(generatedGames),
          teamsGeneratedByGame,
          sport: m.sport || 'Football',
          coinConsumed: m.coin_consumed ?? m.coins_consumed ?? 1,
          homeLogo: m.home_logo,
          awayLogo: m.away_logo,
          homeFullName: m.home_full_team_name || m.home_full_name || m.home_team_name || '',
          awayFullName: m.away_full_team_name || m.away_full_name || m.away_team_name || '',
          status: m.status,
          teamsGenerated,
          viewable: !expired,
          matchDate: startDate,
          startDate,
          filterDates,
          startTimeISO
        });
      });

      this.matches = Array.from(matchMap.values());
      this.prepareMatchesView();
      this.loadingMatches = false;
      this.deferGeneratedGameAvailabilityHydration();
    },
    error: () => {
      this.matches = [];
      this.filteredMatches = [];
      this.loadingMatches = false;
    }
  });
}

private prepareMatchesView(): void {
  this.selectInitialAvailableGame();
  this.ensureActiveSport();
  this.applyDateFilter();
  this.openMatchFromQueryParam();

  if (!this.selectedMatch) {
    const firstViewableMatch = this.filteredMatches.find(match => this.canAccessTeams(match));
    if (firstViewableMatch) {
      this.openMatchTeams(firstViewableMatch);
    }
  }
}

private deferGeneratedGameAvailabilityHydration(): void {
  if (this.availabilityHydrationTimer) {
    clearTimeout(this.availabilityHydrationTimer);
  }

  // The list response and requested match can render immediately. Platform
  // probes still run for compatibility, but no longer block the My Teams view.
  this.availabilityHydrationTimer = setTimeout(() => {
    this.availabilityHydrationTimer = null;
    this.hydrateGeneratedGameAvailability(() => {
      const hadSelection = !!this.selectedMatch;
      this.selectInitialAvailableGame();
      this.ensureActiveSport();
      this.applyDateFilter(false);

      if (!hadSelection) {
        this.prepareMatchesView();
      }
    });
  }, 1200);
}

applyDateFilter(resetSelection = true) {
  if (resetSelection) {
    this.selectedMatch = null;
    this.previewTeam = null;
    this.previewTeams = [];
  }

  this.ensureActiveSport();

  this.filteredMatches = this.matches.filter(match =>
    (!this.selectedDate || this.matchHasDate(match, this.selectedDate))
    && this.matchHasSport(match, this.activeSport)
    && this.isGameGenerated(match, this.activeGame)
  );

}

resetDateFilter() {
  this.selectedDate = this.toDateInputValue(new Date());
  this.applyDateFilter();
}

openDatePicker(input: HTMLInputElement): void {
  input.focus();

  const pickerInput = input as HTMLInputElement & { showPicker?: () => void };
  pickerInput.showPicker?.();
}


private openMatchFromQueryParam(): void {
  const matchId = this.route.snapshot.queryParamMap.get('match');
  const queryGame = this.visibleGameFromValue(this.route.snapshot.queryParamMap.get('game'));
  const querySport = this.route.snapshot.queryParamMap.get('sport');

  if (!matchId) {
    if (querySport) {
      this.activeSport = this.sportKey(querySport);
    }

    if (queryGame) {
      this.activeGame = queryGame;
    }

    if (querySport || queryGame) {
      this.applyDateFilter();
    }

    return;
  }

  const match = this.matches.find(m => String(m.id) === String(matchId));

  if (!match) {
    return;
  }

  this.selectedDate = match.startDate || '';
  this.activeSport = querySport ? this.sportKey(querySport) : this.sportKey(match.sport);

  if (queryGame) {
    this.activeGame = queryGame;
  }

  this.applyDateFilter();

  if (this.canAccessTeams(match)) {
    this.openMatchTeams(match, queryGame || this.activeGame);
  }
}

  downloadMatchTeams(match: GeneratedMatch) {
  if (!this.canAccessTeams(match)) {
    return;
  }

  const game = this.selectedGameForMatch(match);
  const matchForGame = this.withGame(match, game);

  this.authService.getUserMyTeams(match.id, this.sportKey(match.sport || this.activeSport), game).subscribe({
    next: (res: any) => {

      const generatedTeams = this.generatedTeamsFromResponse(res);
      const responsePreview = this.teamsPreviewFromResponse(res);

      if (generatedTeams.length) {
        const text = this.teamTextBlocks(generatedTeams, matchForGame, responsePreview, res);
        this.downloadText(text, this.makeTeamFileName(matchForGame, 'txt'));
        return;
      }

      const teamA = Array.isArray(res?.team_a) ? res.team_a : [];
      const teamB = Array.isArray(res?.team_b) ? res.team_b : [];

      const allTeams = [...teamA, ...teamB];

      const rows = allTeams.map((team: any, index: number) => {
        const players = allTeams.filter((p: any) => p.team_side === team.team_side);

        const gk = players.filter((p: any) => p.role === 'GK').map((p: any) => p.name);
        const def = players.filter((p: any) => p.role === 'DEF').map((p: any) => p.name);
        const mid = players.filter((p: any) => p.role === 'MID').map((p: any) => p.name);
        const fwd = players.filter((p: any) => p.role === 'FWD').map((p: any) => p.name);

        const captain = players.find((p: any) => p.captain === 'C' || p.captain === 'CVC')?.name || '';

        const homeCount = players.filter((p: any) => p.team_side === 'team_a').length;
        const awayCount = players.filter((p: any) => p.team_side === 'team_b').length;

        return {
          Team: `T${index + 1}`,
          Split: `${homeCount}-${awayCount}`,
          'Formation (GK-DEF-MID-FWD)': `${gk.length}-${def.length}-${mid.length}-${fwd.length}`,
          Captain: captain,
          'GK Players': gk.join(' / '),
          Defenders: def.join(' / '),
          Midfielders: mid.join(' / '),
          Forwards: fwd.join(' / '),
          [`${this.teamCodeFromTitle(matchForGame.title, 'home')} Count`]: homeCount,
          [`${this.teamCodeFromTitle(matchForGame.title, 'away')} Count`]: awayCount
        };
      });

      const text = [
        this.teamTextHeader(matchForGame, rows.length || matchForGame.teamsGenerated || 0),
        this.previewTextBlock(responsePreview, matchForGame),
        this.generatedTeamsTitle(),
        this.objectRowsToTextBlocks(rows),
        this.teamTextFooter()
      ].filter(Boolean).join('\r\n\r\n');
      this.downloadText(text, this.makeTeamFileName(matchForGame, 'txt'));
    }
  });
}

teamCodeFromTitle(title: string, side: 'home' | 'away'): string {
  const [home, away] = (title || 'HOME vs AWAY').split(' vs ');
  return side === 'home' ? (home || 'HOME') : (away || 'AWAY');
}

makeTeamFileName(match: any, extension = 'txt'): string {
  const [homeRaw, awayRaw] = String(match.title || 'TEAMA vs TEAMB').split(/\s+vs\s+/i);
  const platform = this.fileLeagueSegment(match.fantasyPlatform || 'Sorare');
  const homeTeam = this.fileTeamSegment(homeRaw || 'TEAMA');
  const awayTeam = this.fileTeamSegment(awayRaw || 'TEAMB');
  const leagueName = this.fileLeagueSegment(match.league || 'League');
  const matchDate = match.startDate || new Date().toISOString().split('T')[0];

  return `PICK2WIN_UCT-${platform}-${homeTeam}_vs_${awayTeam}-${leagueName}-${matchDate}.${extension}`;
}

private fileTeamSegment(value: string): string {
  return String(value || 'TEAM')
    .replace(/[^a-zA-Z0-9]/g, '')
    .toUpperCase() || 'TEAM';
}

private fileLeagueSegment(value: string): string {
  const compact = String(value || 'League')
    .replace(/[^a-zA-Z0-9]+/g, ' ')
    .trim()
    .split(/\s+/)
    .map(part => part ? `${part.charAt(0).toUpperCase()}${part.slice(1)}` : '')
    .join('');

  return compact || 'League';
}

downloadText(content: string, fileName: string) {
  if (!content.trim()) return;

  const blob = new Blob([content], { type: 'text/plain;charset=utf-8;' });
  const link = document.createElement('a');

  link.href = URL.createObjectURL(blob);
  link.download = fileName;
  link.click();

  URL.revokeObjectURL(link.href);
}

downloadCSV(rows: any[], fileName: string) {
  if (!rows.length) return;

  const escapeCell = (value: unknown) => `"${String(value ?? '').replace(/"/g, '""')}"`;
  const csv = Array.isArray(rows[0])
    ? rows.map(row => row.map(escapeCell).join(',')).join('\n')
    : [
        Object.keys(rows[0]).join(','),
        ...rows.map(row =>
          Object.keys(rows[0]).map(header => escapeCell(row[header])).join(',')
        )
      ].join('\n');

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');

  link.href = URL.createObjectURL(blob);
  link.download = fileName;
  link.click();

  URL.revokeObjectURL(link.href);
}

private withCsvHeader(match: GeneratedMatch, totalTeams: number, rows: string[][] = []): string[][] {
  return [
    [`PICK2WIN - UCT - ${match.title || 'Teams'}`],
    [`League: ${match.league || 'N/A'}`],
    [`Generated: ${this.csvMatchDate(match)} , ${match.generatedAt || '-'}`],
    [`Total: ${totalTeams || match.teamsGenerated || 0} teams`],
    [],
    ...rows
  ];
}

private csvMatchDate(match: GeneratedMatch): string {
  const value = match.startTimeISO || match.startDate || match.matchDate || '';

  if (!value) {
    return '-';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString();
}

private objectRowsToCsvRows(rows: Record<string, unknown>[]): string[][] {
  if (!rows.length) {
    return [];
  }

  const headers = Object.keys(rows[0]);

  return [
    headers,
    ...rows.map(row => headers.map(header => String(row[header] ?? '')))
  ];
}

  openMatchTeams(match: GeneratedMatch, game: FantasyGame = this.activeGame) {
    game = this.visibleGameOrDefault(game);

    if (!this.canAccessTeams(match)) {
      this.gameTabLoading = false;
      return;
    }

    if (this.selectedMatch?.id === match.id && this.selectedMatch.game === game) {
      this.backToMatches();
      this.gameTabLoading = false;
      return;
    }

    this.activeGame = game;
    this.selectedMatch = this.withGame(match, game);
    this.syncTeamsUrl(match, game);
    this.previewTeam = null;
    this.previewTeams = [];
    this.loadingTeams = true;

    this.authService.getUserMyTeams(match.id, this.sportKey(match.sport || this.activeSport), game).subscribe({
      next: (res: any) => {

        const generatedTeams = this.generatedTeamsFromResponse(res);

        if (generatedTeams.length) {

          this.markGameAvailable(match.id, game, generatedTeams.length);
          this.previewTeams = generatedTeams.map((team: ApiGeneratedTeam) => this.mapGeneratedTeam(team));
          this.selectedMatch = {
            ...match,
            ...this.withGame(this.matchWithResponseMeta(match, res), game),
            teamsGenerated: Number(res?.total_teams || res?.data?.total_teams || generatedTeams.length),
            viewable: true
          };
          this.applyDateFilter(false);
          this.loadingTeams = false;
          this.gameTabLoading = false;
          return;
        }

        const teamA: ApiPlayer[] = Array.isArray(res?.team_a) ? res.team_a : [];
        const teamB: ApiPlayer[] = Array.isArray(res?.team_b) ? res.team_b : [];

        const allTeams = [...teamA, ...teamB];

        this.previewTeams = allTeams.map((team, index) =>
          this.mapTeamCard(team, index + 1)
        );

        this.loadingTeams = false;
        this.gameTabLoading = false;
      },
      error: (error: any) => {
        console.error('[My Teams] Could not load teams:', {
          matchId: match.id,
          platform: game,
          status: error?.status,
          statusText: error?.statusText,
          message: error?.message,
          error: error?.error
        });
        this.previewTeams = [];
        this.loadingTeams = false;
        this.gameTabLoading = false;
      }
    });
  }

  backToMatches() {
    this.selectedMatch = null;
    this.previewTeam = null;
    this.previewTeams = [];
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        tab: 'teams',
        sport: this.activeSport,
        game: this.activeGame
      },
      replaceUrl: true
    });
  }

  private syncTeamsUrl(match: GeneratedMatch, game: FantasyGame): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        tab: 'teams',
        match: match.id,
        sport: this.sportKey(match.sport || this.activeSport),
        game
      },
      replaceUrl: true
    });
  }

  private markGameAvailable(matchId: number, game: FantasyGame, teamCount: number): void {
    const match = this.matches.find(item => item.id === matchId);

    if (!match) {
      return;
    }

    match.generatedGames = Array.from(new Set([...(match.generatedGames || []), game]));
    match.teamsGeneratedByGame = {
      ...(match.teamsGeneratedByGame || {}),
      [game]: teamCount
    };
  }

  private hydrateGeneratedGameAvailability(done: () => void): void {
    const probes = this.matches.flatMap(match =>
      this.visibleGames
        .filter(game => !(this.selectedMatch?.id === match.id && this.activeGame === game))
        .map(game => ({
        match,
        game,
        request: this.authService
          .getUserMyTeams(match.id, this.sportKey(match.sport), game)
          .pipe(catchError(() => of(null)))
        }))
    );

    if (!probes.length) {
      done();
      return;
    }

    forkJoin(probes.map(probe => probe.request)).subscribe({
      next: responses => {
        responses.forEach((res, index) => {
          if (!res || res?.success === false) {
            return;
          }

          const teams = this.generatedTeamsFromResponse(res);
          const teamCount = Number(res?.total_teams || res?.data?.total_teams || teams.length || 0);

          if (teamCount > 0) {
            this.markGameAvailable(probes[index].match.id, probes[index].game, teamCount);
          }
        });

        done();
      },
      error: () => done()
    });
  }

  private selectInitialAvailableGame(): void {
    if (this.visibleGameFromValue(this.route.snapshot.queryParamMap.get('game'))) {
      return;
    }

    if (this.matches.some(match => this.isGameGenerated(match, this.defaultGame))) {
      return;
    }

    const firstAvailable = this.visibleGames.find(game =>
      this.matches.some(match => this.isGameGenerated(match, game))
    );

    if (firstAvailable) {
      this.activeGame = firstAvailable;
    }
  }

  selectGameTab(match: GeneratedMatch, game: FantasyGame): void {
    if (!this.canAccessTeams(match)) {
      return;
    }

    this.openMatchTeams(match, this.visibleGameOrDefault(game));
  }

  selectMainGameTab(game: FantasyGame): void {
    game = this.visibleGameOrDefault(game);
    const currentMatch = this.selectedMatch
      ? this.matches.find(match => match.id === this.selectedMatch?.id) || this.selectedMatch
      : null;


    if (this.activeGame === game) {
      return;
    }

    this.activeGame = game;
    this.gameTabLoading = true;

    this.applyDateFilter();

    const matchToLoad =
      this.filteredMatches.find(match => this.canAccessTeams(match)) ||
      (currentMatch && this.canAccessTeams(currentMatch) ? currentMatch : null);

    if (matchToLoad) {
      this.openMatchTeams(matchToLoad, game);
    } else {
      this.gameTabLoading = false;
    }
  }

  selectSportTab(sport: string): void {
    if (this.activeSport === sport) {
      return;
    }

    this.activeSport = sport;

    this.applyDateFilter();

    const firstViewableMatch = this.filteredMatches.find(match => this.canAccessTeams(match));
    if (firstViewableMatch) {
      this.openMatchTeams(firstViewableMatch, this.activeGame);
    }
  }

  isGameGenerated(match: GeneratedMatch, game: FantasyGame): boolean {
    const generatedGames = match.generatedGames || [];
    const hasGameCounts = Object.keys(match.teamsGeneratedByGame || {}).length > 0;

    if (!generatedGames.length && !hasGameCounts) {
      return match.game ? match.game === game : false;
    }

    return generatedGames.includes(game) || Number(match.teamsGeneratedByGame?.[game] || 0) > 0;
  }

  gameMatchCount(game: FantasyGame): number {
    return this.matches.filter(match =>
      (!this.selectedDate || this.matchHasDate(match, this.selectedDate))
      && this.matchHasSport(match, this.activeSport)
      && this.isGameGenerated(match, game)
    ).length;
  }

  hasTeamsForSelectedDate(): boolean {
    return this.matches.some(match =>
      (!this.selectedDate || this.matchHasDate(match, this.selectedDate))
      && this.hasVisibleGeneratedGame(match)
    );
  }

  sportTabs(): Array<{ id: string; label: string; count: number }> {
    const sports = new Map<string, { label: string; count: number }>();

    this.matches.forEach(match => {
      if (this.selectedDate && !this.matchHasDate(match, this.selectedDate)) {
        return;
      }

      if (!this.hasVisibleGeneratedGame(match)) {
        return;
      }

      const id = this.sportKey(match.sport);
      const current = sports.get(id);
      const generatedGameCount = this.visibleGames.filter(game => this.isGameGenerated(match, game)).length;

      sports.set(id, {
        label: this.sportLabel(match.sport),
        count: (current?.count || 0) + generatedGameCount
      });
    });

    return Array.from(sports.entries()).map(([id, item]) => ({ id, ...item }));
  }

  teamCountForGame(match: GeneratedMatch, game: FantasyGame): number {
    const hasPlatformData =
      (match.generatedGames || []).length > 0 ||
      Object.keys(match.teamsGeneratedByGame || {}).length > 0;

    if (hasPlatformData) {
      return Number(match.teamsGeneratedByGame?.[game] || 0);
    }

    return match.game === game ? Number(match.teamsGenerated || 0) : 0;
  }

  private teamsGeneratedByGameFromMatch(match: any, directGame: FantasyGame | null, totalTeams: number): Partial<Record<FantasyGame, number>> {
    const counts: Partial<Record<FantasyGame, number>> = {};

    this.visibleGames.forEach(game => {
      const value = this.firstNumericValue(match, [
        `${game}_teams_count`,
        `${game}_team_count`,
        `${game}_total_teams`,
        `${game}_teams_generated`,
        `${game}_generated_count`,
        `${game}_generated_teams_count`,
        `${game}_count`,
        game === 'fanduel' ? 'fan_duel_teams_count' : '',
        game === 'fanduel' ? 'fan_duel_total_teams' : '',
        game === 'fanduel' ? 'fan_duel_teams_generated' : '',
        game === 'draftkings' ? 'draftking_teams_count' : '',
        game === 'draftkings' ? 'draftking_total_teams' : ''
      ]);

      if (value > 0) {
        counts[game] = value;
      }
    });

    if (directGame && totalTeams > 0) {
      counts[directGame] = Math.max(Number(counts[directGame] || 0), totalTeams);
    }

    return counts;
  }

  private mergeTeamCounts(
    current: Partial<Record<FantasyGame, number>> | undefined,
    incoming: Partial<Record<FantasyGame, number>>
  ): Partial<Record<FantasyGame, number>> {
    const merged: Partial<Record<FantasyGame, number>> = { ...(current || {}) };

    this.visibleGames.forEach(game => {
      const value = Number(incoming[game] || 0);

      if (value > 0) {
        merged[game] = Math.max(Number(merged[game] || 0), value);
      }
    });

    return merged;
  }

  private firstNumericValue(source: Record<string, unknown>, keys: string[]): number {
    for (const key of keys.filter(Boolean)) {
      const value = Number(source?.[key]);

      if (value > 0) {
        return value;
      }
    }

    return 0;
  }

  private selectedGameForMatch(match: GeneratedMatch): FantasyGame {
    return this.selectedMatch?.id === match.id ? this.activeGame : this.activeGame;
  }

  private firstGeneratedGame(match: GeneratedMatch): FantasyGame {
    return match.generatedGames?.find(game => this.isVisibleGame(game)) || this.visibleGameOrDefault(match.game);
  }

  private withGame(match: GeneratedMatch, game: FantasyGame): GeneratedMatch {
    return {
      ...match,
      game,
      fantasyPlatform: this.gameLabel(game),
      teamsGenerated: match.teamsGeneratedByGame?.[game] ?? 0
    };
  }

  private matchWithResponseMeta(match: GeneratedMatch, res: any): GeneratedMatch {
    const payload = res?.data && typeof res.data === 'object' ? res.data : res;
    const homeTeam = payload?.home_team || this.matchTeamName(match, 'home');
    const awayTeam = payload?.away_team || this.matchTeamName(match, 'away');
    const game = this.visibleGameFromValue(payload?.game) || this.visibleGameOrDefault(match.game);
    const totalTeams = Number(payload?.total_teams || match.teamsGenerated || 0);

    return {
      ...match,
      title: `${homeTeam || 'HOME'} vs ${awayTeam || 'AWAY'}`,
      homeFullName: payload?.home_full_team_name || payload?.home_full_name || match.homeFullName,
      awayFullName: payload?.away_full_team_name || payload?.away_full_name || match.awayFullName,
      game: game || match.game,
      generatedGames: game ? Array.from(new Set([...(match.generatedGames || []), game])) : match.generatedGames,
      teamsGenerated: totalTeams,
      teamsGeneratedByGame: game
        ? { ...(match.teamsGeneratedByGame || {}), [game]: totalTeams }
        : match.teamsGeneratedByGame
    };
  }

  gameLabel(game: FantasyGame): string {
    if (game === 'draftkings') return 'DraftKings';
    if (game === 'fanduel') return 'FanDuel';
    return 'Sorare';
  }

  sportLabel(sport?: string): string {
    const value = String(sport || 'Football').trim();
    return value.toLowerCase() === 'football' ? 'Soccer' : value;
  }

  activeSportLabel(): string {
    return this.sportTabs().find(tab => tab.id === this.activeSport)?.label || this.sportLabel(this.activeSport);
  }

  private generatedGamesFromValue(value: unknown): Set<FantasyGame> {
    const games = new Set<FantasyGame>();

    if (Array.isArray(value)) {
      value.forEach(item => {
        if (item && typeof item === 'object') {
          const game = this.normalizeGame((item as any).game || (item as any).platform || (item as any).fantasy_platform || (item as any).name);

          if (game) {
            games.add(game);
          } else {
            this.generatedGamesFromValue(item).forEach(nestedGame => games.add(nestedGame));
          }

          return;
        }

        const game = this.normalizeGame(item);
        if (game) games.add(game);
      });
      return games;
    }

    if (value && typeof value === 'object') {
      Object.entries(value as Record<string, unknown>).forEach(([key, generated]) => {
        const game = this.normalizeGame(key);
        if (game && (generated === true || generated === 1 || String(generated).toLowerCase() === 'true' || Number(generated) > 0)) {
          games.add(game);
        }
      });
      return games;
    }

    String(value ?? '')
      .split(/[,|]/)
      .map(item => this.normalizeGame(item))
      .filter((game): game is FantasyGame => !!game)
      .forEach(game => games.add(game));

    return games;
  }

  private normalizeGame(value: unknown): FantasyGame | null {
    const text = String(value ?? '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '');

    if (text === 'sorare') return 'sorare';
    if (text.includes('draftkings') || text.includes('draftking') || text === 'dk') return 'draftkings';
    if (text.includes('fanduel') || text.includes('fanduelclassic') || text === 'fd') return 'fanduel';

    return null;
  }

  private visibleGameFromValue(value: unknown): FantasyGame | null {
    const game = this.normalizeGame(value);
    return this.isVisibleGame(game) ? game : null;
  }

  private visibleGameOrDefault(game: FantasyGame | null | undefined): FantasyGame {
    return this.isVisibleGame(game) ? game : this.defaultGame;
  }

  private isVisibleGame(game: FantasyGame | null | undefined): game is FantasyGame {
    return !!game && this.visibleGames.includes(game);
  }

  private hasVisibleGeneratedGame(match: GeneratedMatch): boolean {
    const generatedGames = match.generatedGames || [];
    const hasGameCounts = Object.keys(match.teamsGeneratedByGame || {}).length > 0;

    if (!generatedGames.length && !hasGameCounts) {
      return true;
    }

    return this.visibleGames.some(game => this.isGameGenerated(match, game));
  }

  private matchHasDate(match: GeneratedMatch, selectedDate: string): boolean {
    return (match.filterDates?.length ? match.filterDates : [match.startDate || match.matchDate || ''])
      .filter(Boolean)
      .includes(selectedDate);
  }

  private matchHasSport(match: GeneratedMatch, sport: string): boolean {
    return !sport || this.sportKey(match.sport) === sport;
  }

  private ensureActiveSport(): void {
    const tabs = this.sportTabs();

    if (!tabs.length) {
      this.activeSport = '';
      return;
    }

    if (!this.activeSport || !tabs.some(tab => tab.id === this.activeSport)) {
      this.activeSport = tabs.find(tab => tab.id === 'football')?.id || tabs[0].id;
    }
  }

  private sportKey(sport?: string): string {
    const value = String(sport || 'Football').trim().toLowerCase() || 'football';
    return value === 'soccer' ? 'football' : value;
  }

  private dateCandidatesFromMatch(match: any, startTimeISO: string): string[] {
    const dates = [
      this.dateInputFromApiValue(match.match_date),
      this.dateInputFromApiValue(match.matchDate),
      this.dateInputFromApiValue(match.start_date),
      this.dateInputFromApiValue(match.startDate),
      this.dateInputFromApiValue(match.date),
      this.dateInputFromApiValue(match.fixture_date),
      this.dateInputFromApiValue(match.kickoff_date),
      this.dateInputFromApiValue(startTimeISO),
      this.dateInputFromApiValue(match.generated_at)
    ].filter((date): date is string => !!date);

    return Array.from(new Set(dates));
  }

  private dateInputFromApiValue(value: unknown): string {
    const text = String(value ?? '').trim();

    if (!text) {
      return '';
    }

    const dateOnly = text.match(/^(\d{4}-\d{2}-\d{2})/);
    if (dateOnly) {
      return dateOnly[1];
    }

    const date = new Date(text);
    if (Number.isNaN(date.getTime())) {
      return '';
    }

    return this.toDateInputValue(date);
  }

  openTeamPreview(teamId: number): void {
    this.expandedPreviewPlayerId = null;
    this.previewIndex = this.previewTeams.findIndex(t => t.id === teamId);
    if (this.previewIndex < 0) this.previewIndex = 0;

    const selectedTeam = this.previewTeams[this.previewIndex] || null;

    if (selectedTeam?.players?.length > 1) {
      this.previewTeam = selectedTeam;
      this.loadingPlayers = false;
      return;
    }

    this.loadingPlayers = true;

    this.api.TeamsByPlayers(teamId).subscribe({
      next: (res: any) => {


        const players = Array.isArray(res?.players) ? res.players : [];

        this.previewTeam = this.buildPreviewFromPlayers(teamId, players);
        this.loadingPlayers = false;
      },
      error: () => {
        this.previewTeam = this.previewTeams[this.previewIndex] || null;
        this.loadingPlayers = false;
      }
    });
  }

  closePreview(): void {
    this.previewTeam = null;
    this.expandedPreviewPlayerId = null;
  }

  navPreview(delta: number): void {
    const total = this.previewTeams.length;
    if (!total) return;

    this.previewIndex = (this.previewIndex + delta + total) % total;
    const team = this.previewTeams[this.previewIndex];

    this.openTeamPreview(team.id);
  }

  togglePreviewPlayerName(playerId: number): void {
    this.expandedPreviewPlayerId = this.expandedPreviewPlayerId === playerId ? null : playerId;
  }

  playersByPosition(position: PlayerPosition): PreviewPlayer[] {
    return this.previewTeam?.players.filter(player => player.pos === position) ?? [];
  }

  playerRowsByPosition(position: PlayerPosition): PreviewPlayer[][] {
    const players = this.playersByPosition(position);
    const rows: PreviewPlayer[][] = [];

    for (let i = 0; i < players.length; i += 4) {
      rows.push(players.slice(i, i + 4));
    }

    return rows;
  }

  roleLabel(position: PlayerPosition): string {
    const labels: Record<PlayerPosition, string> = {
      GK: 'GOAL-KEEPER',
      DEF: 'DEFENDER',
      MID: 'MID-FIELDER',
      FWD: 'FORWARD'
    };

    return labels[position];
  }

  roleDotColor(position: PlayerPosition): string {
    const colors: Record<PlayerPosition, string> = {
      GK: '#f59e0b',
      DEF: '#3b82f6',
      MID: '#10b981',
      FWD: '#ef4444'
    };

    return colors[position];
  }

  rowLayoutClass(count: number): string {
    return `count-${Math.min(Math.max(count, 1), 4)}`;
  }

  isCaptain(player: PreviewPlayer): boolean {
    return player.captain === 'C' || player.captain === 'CVC';
  }

  playerInitials(player: PreviewPlayer): string {
    return player.short.slice(0, 2).toUpperCase();
  }

  teamCode(side: 'home' | 'away'): string {
    const title = this.selectedMatch?.title || 'HOME vs AWAY';
    const [home, away] = title.split(' vs ');
    return side === 'home' ? (home || 'HOME') : (away || 'AWAY');
  }

  teamColor(side: 'home' | 'away'): string {
    return side === 'home' ? '#b91c1c' : '#1d4ed8';
  }

  private mapTeamCard(team: ApiPlayer, teamNumber: number): PreviewTeam {
    const side = team.team_side === 'team_a' ? 'home' : 'away';

 const player: PreviewPlayer = {
  id: team.id,
  name: team.original_name || team.name,
  short: this.shortName(team.original_name || team.name),
  pos: team.role || 'MID',
  team: side,
  captain: team.captain,
  logo: team.player_image || team.image || team.photo || team.logo || null
};

    return {
      id: team.id,
      split: side === 'home' ? 'Team A' : 'Team B',
      players: [player],
      captain: team.captain ? player : null,
      viceCaptain: null,
      homeCount: side === 'home' ? 1 : 0,
      awayCount: side === 'away' ? 1 : 0,
      counts: {
        GK: team.role === 'GK' ? 1 : 0,
        DEF: team.role === 'DEF' ? 1 : 0,
        MID: team.role === 'MID' ? 1 : 0,
        FWD: team.role === 'FWD' ? 1 : 0
      }
    };
  }

  private mapGeneratedTeam(team: ApiGeneratedTeam): PreviewTeam {
    const players = (Array.isArray(team.players) ? team.players : []).map(player => this.mapPreviewPlayer(player));
    const captain = players.find(player => player.captain === 'C' || player.name === team.captain) || null;
    const teamNumber = Number(team.team_no ?? team.id ?? team.team_id ?? team.number ?? 0);

    if (captain && !captain.captain) {
      captain.captain = 'C';
    }

    return {
      id: teamNumber,
      split: `${players.filter(player => player.team === 'home').length}-${players.filter(player => player.team === 'away').length}`,
      players,
      captain,
      viceCaptain: null,
      homeCount: players.filter(player => player.team === 'home').length,
      awayCount: players.filter(player => player.team === 'away').length,
      counts: this.positionCounts(players)
    };
  }

  private generatedTeamsFromResponse(res: any): ApiGeneratedTeam[] {
    const teamCollections = [
      res?.teams,
      res?.generated_teams,
      res?.generatedTeams,
      res?.lineups,
      res?.data?.teams,
      res?.data?.generated_teams,
      res?.data?.generatedTeams,
      res?.data?.lineups,
      Array.isArray(res?.data) ? res.data : null,
      Array.isArray(res) ? res : null
    ];

    for (const collection of teamCollections) {
      const teams = this.normalizeGeneratedTeams(collection);

      if (teams.length) {
        return teams;
      }
    }

    return [];
  }

  private normalizeGeneratedTeams(value: unknown): ApiGeneratedTeam[] {
    if (Array.isArray(value)) {
      return value
        .map((team, index) => this.normalizeGeneratedTeam(team, index + 1))
        .filter((team): team is ApiGeneratedTeam => !!team && team.players.length > 0);
    }

    if (value && typeof value === 'object') {
      return Object.entries(value as Record<string, unknown>)
        .map(([key, team], index) => this.normalizeGeneratedTeam(team, Number(key) || index + 1))
        .filter((team): team is ApiGeneratedTeam => !!team && team.players.length > 0);
    }

    return [];
  }

  private normalizeGeneratedTeam(value: unknown, fallbackTeamNo: number): ApiGeneratedTeam | null {
    if (Array.isArray(value)) {
      return {
        team_no: fallbackTeamNo,
        players: value as ApiPlayer[]
      };
    }

    if (!value || typeof value !== 'object') {
      return null;
    }

    const source = value as Record<string, any>;
    const players =
      source['players'] ||
      source['team_players'] ||
      source['teamPlayers'] ||
      source['lineup'] ||
      source['player_list'];

    return {
      ...(source as ApiGeneratedTeam),
      team_no: Number(source['team_no'] ?? source['teamNo'] ?? source['team_number'] ?? source['id'] ?? fallbackTeamNo),
      players: Array.isArray(players) ? players : []
    };
  }

  private teamsPreviewFromResponse(res: any): ApiTeamsPreview | null {
    const preview = res?.preview || res?.data?.preview;

    if (!preview || typeof preview !== 'object') {
      return null;
    }

    return preview;
  }

  private buildPreviewFromPlayers(teamId: number, apiPlayers: ApiPlayer[]): PreviewTeam {
    const players: PreviewPlayer[] = apiPlayers.map(player => this.mapPreviewPlayer(player));

    const captain =
      players.find(p => p.captain === 'C' || p.captain === 'CVC') || null;

    return {
      id: teamId,
      split: `${players.filter(p => p.team === 'home').length}-${players.filter(p => p.team === 'away').length}`,
      players,
      captain,
      viceCaptain: null,
      homeCount: players.filter(p => p.team === 'home').length,
      awayCount: players.filter(p => p.team === 'away').length,
      counts: this.positionCounts(players)
    };
  }

  private mapPreviewPlayer(player: ApiPlayer): PreviewPlayer {
  const displayName = player.original_name || player.name;

  return {
    id: player.id,
    name: displayName,
    short: this.shortName(displayName),
    pos: player.role || 'MID',
    team: this.playerTeam(player),
    captain: player.cap || player.captain,
    logo: player.player_image || player.image || player.photo || player.logo || null
  };
}

  private playerTeam(player: ApiPlayer): 'home' | 'away' {
    if (player.team_side) {
      return player.team_side === 'team_a' ? 'home' : 'away';
    }

    return /_B$/i.test(player.name || '') ? 'away' : 'home';
  }

  private positionCounts(players: PreviewPlayer[]): Record<PlayerPosition, number> {
    return {
      GK: players.filter(player => player.pos === 'GK').length,
      DEF: players.filter(player => player.pos === 'DEF').length,
      MID: players.filter(player => player.pos === 'MID').length,
      FWD: players.filter(player => player.pos === 'FWD').length
    };
  }

  private teamCsvRows(teams: ApiGeneratedTeam[], match?: GeneratedMatch): string[][] {
    const rows: string[][] = match ? this.withCsvHeader(match, teams.length) : [];

    teams.forEach((team, teamIndex) => {
      const previewTeam = this.mapGeneratedTeam(team);
      const players = previewTeam.players;
      const combination = `${players.filter(player => player.team === 'home').length} X ${players.filter(player => player.team === 'away').length}`;

      rows.push(['Team:', String(team.team_no)]);
      rows.push(['Combination:', combination]);
      rows.push([]);
      rows.push(['', 'Player', 'Role', 'C']);

      players.forEach((player, index) => {
        rows.push([
          String(index + 1),
          player.name,
          player.pos,
          this.csvCaptainLabel(player, previewTeam)
        ]);
      });

      if (teamIndex < teams.length - 1) {
        rows.push([]);
      }
    });

    return rows;
  }

  private csvCaptainLabel(player: PreviewPlayer, team: PreviewTeam): string {
    if (team.captain?.id === player.id || player.captain === 'C' || player.captain === 'CVC') {
      return 'C';
    }

    return '.';
  }

  private teamTextBlocks(teams: ApiGeneratedTeam[], match?: GeneratedMatch, preview?: ApiTeamsPreview | null, rawResponse?: any): string {
    if (match) {
      return this.platformTeamTextBlocks(teams, match, preview, rawResponse);
    }

    const blocks = teams.map((team: ApiGeneratedTeam) => this.teamTextBlock(team, teams.length, match));

    if (!match) {
      return [
        this.previewTextBlock(preview),
        this.generatedTeamsTitle(),
        blocks.join('\r\n\r\n'),
        this.teamTextFooter()
      ].filter(Boolean).join('\r\n\r\n');
    }

    return [
      this.teamTextHeader(match, teams.length, rawResponse),
      this.previewTextBlock(preview, match, teams),
      this.teamDistributionBlock(teams),
      this.definitionsBlock(),
      this.generatedTeamsTitle(),
      blocks.join('\r\n\r\n'),
      this.teamTextFooter()
    ].filter(Boolean).join('\r\n\r\n');
  }

  private platformTeamTextBlocks(teams: ApiGeneratedTeam[], match: GeneratedMatch, preview?: ApiTeamsPreview | null, rawResponse?: any): string {
    const blocks = teams.map(team => this.platformTeamTextBlock(team, teams.length, match));

    return [
      this.platformTextHeader(match, teams.length, rawResponse),
      this.mySquadTextBlock(teams, match, preview),
      this.platformConfigTextBlock(match, preview),
      this.platformGeneratedTeamsTitle(),
      blocks.join('\r\n\r\n'),
      this.platformTextFooter()
    ].filter(Boolean).join('\r\n\r\n');
  }

  private platformTextHeader(match: GeneratedMatch, totalTeams: number, rawResponse?: any): string {
    const isSalaryGame = match.game === 'draftkings' || match.game === 'fanduel';
    const sport = this.sportLabel(match.sport);
    const lines = [
      this.reportLine('='),
      this.centerReportText('PICK2WIN - USER CONFIGURATION TEAMS'),
      this.centerReportText('(UCT)'),
      this.reportLine('='),
      '',
      this.reportField('Fantasy Platform', match.fantasyPlatform || this.gameLabel(this.visibleGameOrDefault(match.game))),
      this.reportField('Sport', sport)
    ];

    if (isSalaryGame) {
      lines.push(this.reportField('Contest Type', 'Classic'));
    }

    lines.push(
      this.reportField('Competition', match.league || 'N/A'),
      this.reportField('Match', this.reportMatchTitle(match)),
      this.reportField('Match Date', this.reportMatchDate(match)),
      this.reportField('Kickoff Time', this.reportKickoffTime(match)),
      '',
      this.reportField('Generated On', this.reportGeneratedOn(match, this.reportMatchDate(match), rawResponse)),
      this.reportField('Total Teams', String(totalTeams || match.teamsGenerated || 0)),
      this.reportField('Generation Time', this.reportGenerationTime(match, rawResponse)),
      this.reportField('Coin Consumed', this.reportCoinConsumed(match, rawResponse))
    );

    return lines.join('\r\n');
  }

  private mySquadTextBlock(teams: ApiGeneratedTeam[], match: GeneratedMatch, preview?: ApiTeamsPreview | null): string {
    const players = this.reportSquadPlayers(teams, preview);
    const isSalaryGame = match.game === 'draftkings' || match.game === 'fanduel';
    const homeCode = this.reportSideCode(match, 'home');
    const awayCode = this.reportSideCode(match, 'away');
    const homeCount = players.filter(player => player.side === 'team_a').length;
    const awayCount = players.filter(player => player.side === 'team_b').length;
    const substituteCount = players.filter(player => player.isSubstitute).length;
    const playingXiCount = Math.max(0, players.length - substituteCount);
    const separator = this.reportLine('-');
    const lines = [
      this.reportLine('='),
      this.centerReportText('MY SQUAD'),
      this.reportLine('='),
      '',
      'The following players were selected while configuring your UCT.',
      '',
      `${isSalaryGame ? 'Required Selection' : 'Selection Range'} : ${isSalaryGame ? '18-22' : '10-22'} Players`,
      '',
      separator
    ];

    if (isSalaryGame) {
      lines.push(`${'No'.padEnd(5)}${'Player'.padEnd(36)}${'Pos'.padEnd(8)}${'Team'.padEnd(10)}Salary`);
    } else {
      lines.push(`${'No'.padEnd(5)}${'Player'.padEnd(32)}${'Position'.padEnd(14)}${'Team'.padEnd(8)}Status`);
    }

    lines.push(separator);

    players.forEach((player, index) => {
      const name = `${player.name}${player.isMandatory ? ' [M]' : ''}${player.isSubstitute ? ' [S]' : ''}`;
      const teamCode = this.reportTeamCode(match, player.side);

      if (isSalaryGame) {
        lines.push(`${String(index + 1).padEnd(5)}${this.truncateReportText(name, 34).padEnd(36)}${player.role.padEnd(8)}${teamCode.padEnd(10)}${this.reportSalary(player.salary, match.game)}`);
      } else {
        lines.push(`${String(index + 1).padEnd(5)}${name.padEnd(32)}${player.role.padEnd(14)}${teamCode.padEnd(8)}${player.isSubstitute ? 'Substitute' : 'Playing XI'}`);
      }
    });

    lines.push(separator, '');

    if (isSalaryGame) {
      lines.push(`Selected Players   : ${players.length} (${homeCode} x ${homeCount} | ${awayCode} x ${awayCount})`);
    } else {
      lines.push(`Selected Players   : ${players.length}`);
    }

    lines.push(
      `Playing XI         : ${playingXiCount}`,
      `Substitutes        : ${substituteCount}`
    );

    if (isSalaryGame) {
      lines.push('', '[M] = Mandatory Player (Included in all 20 generated teams)', '[S] = Substitute Player');
    }

    return lines.join('\r\n');
  }

  private reportSquadPlayers(teams: ApiGeneratedTeam[], preview?: ApiTeamsPreview | null): Array<{
    key: string;
    name: string;
    role: PlayerPosition;
    side: 'team_a' | 'team_b';
    salary?: number | string | null;
    isMandatory: boolean;
    isSubstitute: boolean;
  }> {
    const substitutes = Array.isArray(preview?.substitutes) ? preview?.substitutes || [] : [];
    const mandateYes = Array.isArray(preview?.mandate_yes) ? preview?.mandate_yes || [] : [];
    const substituteKeys = new Set(substitutes.map(player => this.reportPlayerKey(player.name, player.side)));
    const mandatoryKeys = new Set(mandateYes.map(player => this.reportPlayerKey(player.name, player.side)));
    const players = new Map<string, {
      key: string;
      name: string;
      role: PlayerPosition;
      side: 'team_a' | 'team_b';
      salary?: number | string | null;
      isMandatory: boolean;
      isSubstitute: boolean;
    }>();

    teams.forEach(team => {
      (team.players || []).forEach(player => {
        const side = player.team_side || 'team_a';
        const name = player.original_name || player.name || '-';
        const key = this.reportPlayerKey(name, side);

        if (!players.has(key)) {
          players.set(key, {
            key,
            name,
            role: player.role || 'MID',
            side,
            salary: player.salary,
            isMandatory: player.mandate === 'yes' || player.mandate === 'YES' || mandatoryKeys.has(key),
            isSubstitute: substituteKeys.has(key)
          });
          return;
        }

        const existing = players.get(key);
        if (existing) {
          existing.salary = existing.salary ?? player.salary;
          existing.isMandatory = existing.isMandatory || player.mandate === 'yes' || player.mandate === 'YES' || mandatoryKeys.has(key);
          existing.isSubstitute = existing.isSubstitute || substituteKeys.has(key);
        }
      });
    });

    substitutes.forEach(player => this.upsertPreviewSquadPlayer(players, player, true, mandatoryKeys.has(this.reportPlayerKey(player.name, player.side))));
    mandateYes.forEach(player => this.upsertPreviewSquadPlayer(players, player, substituteKeys.has(this.reportPlayerKey(player.name, player.side)), true));

    const order: Record<PlayerPosition, number> = { GK: 0, DEF: 1, MID: 2, FWD: 3 };

    return Array.from(players.values()).sort((a, b) =>
      order[a.role] - order[b.role] || a.side.localeCompare(b.side) || a.name.localeCompare(b.name)
    );
  }

  private upsertPreviewSquadPlayer(
    players: Map<string, { key: string; name: string; role: PlayerPosition; side: 'team_a' | 'team_b'; salary?: number | string | null; isMandatory: boolean; isSubstitute: boolean }>,
    player: ApiPreviewPlayer,
    isSubstitute: boolean,
    isMandatory: boolean
  ): void {
    const side = player.side || 'team_a';
    const key = this.reportPlayerKey(player.name, side);
    const existing = players.get(key);

    if (existing) {
      existing.salary = existing.salary ?? player.salary;
      existing.isSubstitute = existing.isSubstitute || isSubstitute;
      existing.isMandatory = existing.isMandatory || isMandatory;
      return;
    }

    players.set(key, {
      key,
      name: player.name || '-',
      role: player.role || 'MID',
      side,
      salary: player.salary,
      isMandatory,
      isSubstitute
    });
  }

  private reportPlayerKey(name: string, side?: 'team_a' | 'team_b'): string {
    return `${String(name || '').trim().toLowerCase()}|${side || ''}`;
  }

  private reportSalary(value: number | string | null | undefined, game?: FantasyGame): string {
    const amount = Number(value || 0);

    if (!amount) {
      return '-';
    }

    if (game === 'draftkings') {
      return `$${new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(amount)}`;
    }

    return Number.isInteger(amount) ? String(amount) : String(amount);
  }

  private platformPreviewList(title: string, players: ApiPreviewPlayer[]): string {
    const lines = [
      this.reportLine('-'),
      title,
      this.reportLine('-'),
      ''
    ];

    if (!players.length) {
      lines.push('None', '', this.reportLine('-'));
      return lines.join('\r\n');
    }

    players.forEach((player, index) => {
      lines.push(`${index + 1}. ${player.name || '-'}`);
    });

    lines.push('', this.reportLine('-'));

    return lines.join('\r\n');
  }

  private platformConfigTextBlock(match: GeneratedMatch, preview?: ApiTeamsPreview | null): string {
    if (match.game === 'draftkings') {
      return [
        this.reportLine('='),
        this.centerReportText('ROSTER REQUIREMENTS'),
        this.reportLine('='),
        '',
        this.reportField('Goalkeeper (GK)', '1'),
        this.reportField('Defenders (DEF)', '2'),
        this.reportField('Midfielders (MID)', '2'),
        this.reportField('Forwards (FWD)', '2'),
        this.reportField('Utility (UTIL)', '1 (DEF / MID / FWD only)'),
        '',
        this.reportField('Total Players', '8'),
        this.reportField('Salary Cap', '$50000'),
        this.reportField('Maximum Per Club', '7 Players'),
        this.reportField('Minimum Opponent', '1 Player')
      ].join('\r\n');
    }

    if (match.game === 'fanduel') {
      return [
        this.reportLine('='),
        this.centerReportText('ROSTER REQUIREMENTS'),
        this.reportLine('='),
        '',
        this.reportField('Goalkeeper (GK)', '1', 25),
        this.reportField('Defenders (DEF)', '2', 25),
        this.reportField('Forwards / Midfielders', '4 (Any Combination)', 25),
        '',
        'Valid FWD/MID Combinations:',
        '- 4 FWD + 0 MID',
        '- 3 FWD + 1 MID',
        '- 2 FWD + 2 MID',
        '- 1 FWD + 3 MID',
        '- 0 FWD + 4 MID',
        '',
        this.reportField('Total Players', '7', 25),
        this.reportField('Salary Cap', '100', 25),
        this.reportField('Maximum Per Club', '6 Players', 25),
        this.reportField('Minimum Opponent', '1 Player', 25)
      ].join('\r\n');
    }

    const mandateYes = Array.isArray(preview?.mandate_yes) ? preview?.mandate_yes || [] : [];
    const cvcPlayers = Array.isArray(preview?.cvc_players) ? preview?.cvc_players || [] : [];
    const captains = Array.isArray(preview?.captains) ? preview?.captains || [] : [];
    const captainPool = captains.length ? captains : cvcPlayers;

    return [
      this.reportLine('='),
      this.centerReportText('TEAM CONFIGURATION'),
      this.reportLine('='),
      '',
      this.platformPreviewList('Mandatory Players', mandateYes),
      '',
      this.platformPreviewList('Captain Pool', captainPool)
    ].join('\r\n');
  }

  private platformGeneratedTeamsTitle(): string {
    return [
      this.reportLine('='),
      this.centerReportText('######################  YOUR 20 GENERATED TEAMS  ######################'),
      this.reportLine('='),
      '',
      'Use the generated teams below as a reference while creating your teams',
      'on your fantasy platform.',
      '',
      this.reportLine('=')
    ].join('\r\n');
  }

  private platformTeamTextBlock(team: ApiGeneratedTeam, totalTeams: number, match: GeneratedMatch): string {
    const previewTeam = this.mapGeneratedTeam(team);
    const players = previewTeam.players;
    const isSalaryGame = match.game === 'draftkings' || match.game === 'fanduel';
    const homeCode = this.reportSideCode(match, 'home');
    const awayCode = this.reportSideCode(match, 'away');
    const teamNo = String(team.team_no || previewTeam.id).padStart(2, '0');
    const total = String(totalTeams || 20).padStart(2, '0');
    const separator = this.reportLine('-');
    const combination = isSalaryGame
      ? `Team Combination : ${homeCode} (${previewTeam.homeCount}) x ${awayCode} (${previewTeam.awayCount})`
      : `Combination : ${previewTeam.homeCount} x ${previewTeam.awayCount}`;
    const lines = [
      this.reportLine('#'),
      this.centerReportText(`UCT TEAM : ${teamNo} / ${total}`),
      this.reportLine('#'),
      '',
      combination,
      '',
      separator,
      `${'No'.padEnd(5)}${'Player'.padEnd(32)}${'Position'.padEnd(14)}Team`,
      separator
    ];

    players.forEach((player, index) => {
      lines.push(`${String(index + 1).padEnd(5)}${this.reportPlayerName(player, previewTeam).padEnd(32)}${player.pos.padEnd(14)}${this.reportSideCode(match, player.team)}`);
    });

    lines.push(separator);

    return lines.join('\r\n');
  }

  private platformTextFooter(): string {
    return [
      this.reportLine('='),
      this.centerReportText('IMPORTANT NOTES'),
      this.reportLine('='),
      '',
      '- Use these generated teams as a reference while creating your teams.',
      '',
      '- You may use the generated teams as they are or modify them based on',
      '  your own strategy.',
      '',
      '- UCT teams are generated using the official lineup information',
      '  available at the time of generation.',
      '',
      '- If any lineup changes occur after UCT generation, review and update',
      '  your teams based on the latest player availability and lineup',
      '  information available in your fantasy platform.',
      '',
      '- If you identify any issues with the generated output, please contact',
      '  support@pick2win.io and attach this generated report without making',
      '  any modifications, so we can investigate the issue accurately.',
      '',
      this.reportLine('='),
      '',
      this.centerReportText('PICK2WIN UCT'),
      '',
      this.centerReportText('Your Strategy. Your Players.'),
      this.centerReportText('Your Team Combinations.'),
      '',
      this.centerReportText('Configure Faster. Generate Smarter.'),
      '',
      'Website : www.pick2win.io',
      'Support : support@pick2win.io',
      '',
      '(C) 2026 PICK2WIN Technologies Pvt Ltd.',
      'All Rights Reserved.',
      '',
      this.reportLine('=')
    ].join('\r\n');
  }

  private teamTextHeader(match: GeneratedMatch, totalTeams: number, rawResponse?: any): string {
    const matchDate = this.reportMatchDate(match);
    const generatedOn = this.reportGeneratedOn(match, matchDate, rawResponse);
    const kickoffTime = this.reportKickoffTime(match);
    const generationTime = this.reportGenerationTime(match, rawResponse);
    const coinConsumed = this.reportCoinConsumed(match, rawResponse);

    return [
      this.reportLine('='),
      this.centerReportText('PICK2WIN - USER CONFIGURATION TEAMS'),
      this.centerReportText('(UCT)'),
      this.reportLine('='),
      '',
      this.reportField('Fantasy Platform', match.fantasyPlatform || this.gameLabel(this.visibleGameOrDefault(match.game))),
      this.reportField('Sport', this.sportLabel(match.sport)),
      this.reportField('Competition', match.league || 'N/A'),
      this.reportField('Match', this.reportMatchTitle(match)),
      this.reportField('Match Date', matchDate),
      this.reportField('Kickoff Time', kickoffTime),
      this.reportField('Generated On', generatedOn),
      this.reportField('Generated By', 'PICK2WIN UCT'),
      this.reportField('Total Teams', String(totalTeams || match.teamsGenerated || 0)),
      this.reportField('Generation Time', generationTime),
      this.reportField('Coin Consumed', coinConsumed)
    ].join('\r\n');
  }

  private previewTextBlock(preview?: ApiTeamsPreview | null, match?: GeneratedMatch, teams: ApiGeneratedTeam[] = []): string {
    const substitutes = Array.isArray(preview?.substitutes) ? preview?.substitutes || [] : [];
    const mandateYes = Array.isArray(preview?.mandate_yes) ? preview?.mandate_yes || [] : [];
    const cvcPlayers = Array.isArray(preview?.cvc_players) ? preview?.cvc_players || [] : [];
    const captains = Array.isArray(preview?.captains) ? preview?.captains || [] : [];
    const captainPool = captains.length ? captains : cvcPlayers;
    const substituteCount = Number(preview?.substitutes_count ?? substitutes.length);
    const playerPoolCount = this.reportPlayerPoolCount(preview, teams, substituteCount);
    const playingXiCount = Math.max(0, playerPoolCount - substituteCount);

    return [
      this.reportLine('='),
      this.centerReportText('USER CONFIGURATION SUMMARY'),
      this.reportLine('='),
      '',
      'Player Pool',
      '-----------',
      this.reportField('Selected Players', `${playerPoolCount} / 22`, 26),
      this.reportField('Playing XI Selected', String(playingXiCount), 26),
      this.reportField('Substitutes Selected', `${substituteCount} / 3`, 26),
      '',
      this.reportPreviewListSection('Substitute Players', substitutes, match),
      '',
      this.reportPreviewListSection('Mandatory Players', mandateYes, match),
      '',
      this.reportPreviewListSection('Captain Pool', captainPool, match)
    ].join('\r\n');
  }

  private previewModeText(preview: ApiTeamsPreview): string {
    const cvcPlayers = Array.isArray(preview.cvc_players) ? preview.cvc_players : [];
    const captains = Array.isArray(preview.captains) ? preview.captains : [];

    if (cvcPlayers.length || Number(preview.cvc_count || 0) > 0) {
      return 'Mode: Captain mode';
    }

    if (
      captains.length ||
      Number(preview.captain_count || 0) > 0 ||
      Number(preview.captaincy_count || 0) > 0
    ) {
      return 'Mode: Captain mode';
    }

    return '';
  }

  private previewGroupText(label: string, players: ApiPreviewPlayer[], count?: number): string {
    const total = count ?? players.length;
    const lines = [`${label}: ${total}`];

    players.forEach((player, index) => {
      lines.push(`${index + 1}. ${player.name || '-'}${player.role ? ` (${player.role})` : ''}`);
    });

    return lines.join('\r\n');
  }

  private teamTextBlock(team: ApiGeneratedTeam, totalTeams = 20, match?: GeneratedMatch): string {
    const previewTeam = this.mapGeneratedTeam(team);
    const previewPlayers = previewTeam.players;
    const combination = `${previewTeam.homeCount} × ${previewTeam.awayCount}`;
    const teamNo = String(team.team_no || previewTeam.id).padStart(2, '0');
    const total = String(totalTeams || 20).padStart(2, '0');

    const lines = [
      this.reportLine('#'),
      this.centerReportText(`UCT TEAM : ${teamNo} / ${total}`),
      this.reportLine('#'),
      '',
      `Combination : ${combination}`,
      '',
      this.reportLine('-'),
      `${'No'.padEnd(5)}${'Player'.padEnd(32)}${'Position'.padEnd(14)}Team`,
      this.reportLine('-')
    ];

    previewPlayers.forEach((player, index) => {
      const playerName = this.reportPlayerName(player, previewTeam);
      lines.push(
        `${String(index + 1).padEnd(5)}${playerName.padEnd(32)}${player.pos.padEnd(14)}${this.reportSideCode(match, player.team)}`
      );
    });

    lines.push(this.reportLine('-'));

    return lines.join('\r\n');
  }

  private objectRowsToTextBlocks(rows: Record<string, unknown>[]): string {
    if (!rows.length) {
      return '';
    }

    return rows.map((row, index) => {
      const teamNo = String(row['Team'] || `T${index + 1}`).replace(/^T/i, '');
      const split = String(row['Split'] || '').replace('-', ' X ');
      const playerGroups = [
        ['GK', String(row['GK Players'] || '')],
        ['DEF', String(row['Defenders'] || '')],
        ['MID', String(row['Midfielders'] || '')],
        ['FWD', String(row['Forwards'] || '')]
      ];
      const captain = String(row['Captain'] || '');
      const players = playerGroups.flatMap(([role, names]) =>
        names.split(' / ').filter(Boolean).map(name => ({ name, role }))
      );
      const playerWidth = Math.max(26, ...players.map(player => player.name.length));
      const lines = [
        `UCT TEAM : ${teamNo}`,
        `Combination : ${split.toLowerCase()}`,
        '',
        `${'No'.padEnd(5)}${'Player'.padEnd(playerWidth)} ${'Role'.padEnd(8)} C`,
        '-'.repeat(48)
      ];

      players.forEach((player, playerIndex) => {
        const cap = player.name === captain ? 'C' : '.';

        lines.push(
          `${String(playerIndex + 1).padEnd(5)}${player.name.padEnd(playerWidth)} ${player.role.padEnd(8)} ${cap}`
        );
      });

      lines.push('');
      lines.push(this.reportLine('-'));

      return lines.join('\r\n');
    }).join('\r\n\r\n');
  }

  private generatedTeamsTitle(): string {
    return [
      this.reportLine('='),
      this.centerReportText('######################  YOUR 20 GENERATED TEAMS  ######################'),
      this.reportLine('='),
      '',
      'This is your working section while creating teams in Sorare.',
      '',
      'Create Team 01 → Team 20 in sequence.',
      '',
      this.reportLine('=')
    ].join('\r\n');
  }

  private teamTextFooter(): string {
    return [
      this.reportLine('='),
      this.centerReportText('IMPORTANT NOTES'),
      this.reportLine('='),
      '',
      '• Build your Player Pool using only the eligible player cards you own.',
      '',
      '• Configuration Limits:',
      '    ✓ Player Pool        : 10–22 Players',
      '    ✓ Substitutes        : 0–3 Players (Optional)',
      '    ✓ Mandatory Players  : 0–2 Players (Optional)',
      '    ✓ Captain Pool       : 2–8 Players (Mandatory)',
      '',
      '• Teams are generated strictly according to your selected',
      '  configuration.',
      '',
      '• Mandatory Players are forced into all generated teams.',
      '',
      '• Captain choices are assigned only from your selected Captain Pool.',
      '',
      '• PICK2WIN does not verify card ownership, card eligibility,',
      '  or competition eligibility.',
      '',
      '• Please verify all players manually before creating teams in Sorare.',
      '',
      this.reportLine('='),
      '',
      this.centerReportText('PICK2WIN UCT'),
      '',
      this.centerReportText('Your Strategy. Your Players.'),
      this.centerReportText('Your Team Combinations.'),
      '',
      this.centerReportText('Configure Faster. Generate Smarter.'),
      this.centerReportText('Save Time.'),
      '',
      'Website : www.pick2win.io',
      '',
      '© 2026 PICK2WIN Technologies Pvt Ltd.',
      '',
      'All Rights Reserved.',
      '',
      this.reportLine('='),
    ].join('\r\n');
  }

  private previewPlayersSection(title: string, players: ApiPreviewPlayer[], match?: GeneratedMatch): string {
    if (!players.length) {
      return '';
    }

    return [
      this.reportLine('*'),
      title,
      '',
      this.previewPlayersList(players, match),
      '',
      this.reportLine('*')
    ].join('\r\n');
  }

  private mandatePlayersSection(yesPlayers: ApiPreviewPlayer[], noPlayers: ApiPreviewPlayer[], match?: GeneratedMatch): string {
    if (!yesPlayers.length && !noPlayers.length) {
      return '';
    }

    const lines = [
      this.reportLine('*'),
      'MANDATE PLAYERS'
    ];

    if (yesPlayers.length) {
      lines.push('', 'YES', '', this.previewPlayersList(yesPlayers, match));
    }

    if (noPlayers.length) {
      lines.push('', 'NO', '', this.previewPlayersList(noPlayers, match));
    }

    lines.push('', this.reportLine('*'));

    return lines.join('\r\n');
  }

  private captaincyPlayersSection(
    preview: ApiTeamsPreview,
    captains: ApiPreviewPlayer[],
    viceCaptains: ApiPreviewPlayer[],
    cvcPlayers: ApiPreviewPlayer[],
    match?: GeneratedMatch
  ): string {
    if (!captains.length && !cvcPlayers.length) {
      return '';
    }

    const isCvc = cvcPlayers.length || Number(preview.cvc_count || preview.cvc_players_count || 0) > 0;
    const lines = [
      this.reportLine('*'),
      'CAPTAINCY MODE : C'
    ];

    if (isCvc) {
      lines.push('', this.previewPlayersList(cvcPlayers, match));
    } else if (captains.length) {
      lines.push('', 'CAPTAINS', '', this.previewPlayersList(captains, match));
    }

    lines.push('', this.reportLine('*'));

    return lines.join('\r\n');
  }

  private previewPlayersList(players: ApiPreviewPlayer[], match?: GeneratedMatch): string {
    return players.map((player, index) =>
      `${index + 1}. ${player.name || '-'} (${this.previewPlayerMeta(player, match)})`
    ).join('\r\n');
  }

  private previewPlayerMeta(player: ApiPreviewPlayer, match?: GeneratedMatch): string {
    const teamCode = player.side ? this.reportTeamCode(match, player.side) : '';
    const role = player.role || '-';

    return teamCode ? `${teamCode} - ${role}` : role;
  }

  private reportPreviewListSection(title: string, players: ApiPreviewPlayer[], match?: GeneratedMatch): string {
    const lines = [
      this.reportLine('-'),
      title,
      this.reportLine('-'),
      ''
    ];

    if (!players.length) {
      lines.push('None');
      return lines.join('\r\n');
    }

    players.forEach((player, index) => {
      lines.push(`${index + 1}. ${player.name || '-'} (${this.previewPlayerMeta(player, match)})`, '');
    });

    return lines.join('\r\n').trimEnd();
  }

  private teamDistributionBlock(teams: ApiGeneratedTeam[]): string {
    const distribution = new Map<string, number>();

    teams.forEach(team => {
      const previewTeam = this.mapGeneratedTeam(team);
      const key = `${previewTeam.homeCount} × ${previewTeam.awayCount}`;
      distribution.set(key, (distribution.get(key) || 0) + 1);
    });

    const lines = [
      this.reportLine('='),
      this.centerReportText('TEAM DISTRIBUTION'),
      this.reportLine('='),
      ''
    ];

    Array.from(distribution.keys()).forEach(key => {
      lines.push(`✓ ${key}`, '');
    });

    return lines.join('\r\n').trimEnd();
  }

  private definitionsBlock(): string {
    return [
      this.reportLine('='),
      this.centerReportText('DEFINITIONS'),
      this.reportLine('='),
      '',
      'Position Legend',
      '---------------',
      '',
      'GK   = Goalkeeper',
      '',
      'DEF  = Defender',
      '',
      'MID  = Midfielder',
      '',
      'FWD  = Forward',
      '',
      '',
      'Captain Legend',
      '--------------',
      '',
      '(C) = Captain'
    ].join('\r\n');
  }

  private reportPlayerPoolCount(preview: ApiTeamsPreview | null | undefined, teams: ApiGeneratedTeam[], substituteCount: number): number {
    const explicitCount = Number(
      (preview as any)?.selected_players_count ??
      (preview as any)?.player_pool_count ??
      (preview as any)?.players_count ??
      0
    );

    if (explicitCount > 0) {
      return explicitCount;
    }

    const names = new Set<string>();
    teams.forEach(team => {
      (team.players || []).forEach(player => names.add(String(player.original_name || player.name || '').toLowerCase()));
    });

    return Math.max(names.size, substituteCount);
  }

  private reportPlayerName(player: PreviewPlayer, team: PreviewTeam): string {
    const label = this.csvCaptainLabel(player, team);

    if (label === 'C') {
      return `${player.name} (C)`;
    }

    return player.name;
  }

  private reportSideCode(match: GeneratedMatch | undefined, side: 'home' | 'away'): string {
    const teamName = this.matchTeamName(match || null, side);
    const bracketCode = String(teamName || '').match(/\(([A-Za-z0-9]+)\)/);

    return this.fileTeamSegment(bracketCode?.[1] || teamName || (side === 'home' ? 'TEAMA' : 'TEAMB'));
  }

  private reportTeamCode(match: GeneratedMatch | undefined, side: 'team_a' | 'team_b'): string {
    const title = match?.title || 'TEAMA vs TEAMB';
    const [home, away] = title.split(/\s+vs\s+/i);
    const teamName = side === 'team_a' ? home : away;
    const bracketCode = String(teamName || '').match(/\(([A-Za-z0-9]+)\)/);

    return this.fileTeamSegment(bracketCode?.[1] || teamName || (side === 'team_a' ? 'TEAMA' : 'TEAMB'));
  }

  private reportLine(char: '=' | '-' | '*' | '#'): string {
    return char.repeat(char === '-' ? 63 : 70);
  }

  private centerReportText(value: string, width = 70): string {
    const text = String(value || '');
    const left = Math.max(0, Math.floor((width - text.length) / 2));

    return `${' '.repeat(left)}${text}`;
  }

  private reportField(label: string, value: string | number, labelWidth = 18): string {
    return `${label.padEnd(labelWidth)}: ${value ?? '-'}`;
  }

  private truncateReportText(value: string, maxLength: number): string {
    const text = String(value || '');
    return text.length > maxLength ? text.slice(0, Math.max(0, maxLength - 1)).trimEnd() : text;
  }

  private reportMatchDate(match: GeneratedMatch): string {
    const value = match.startTimeISO || match.startDate || match.matchDate || '';
    return this.reportDate(value);
  }

  private reportMatchTitle(match: GeneratedMatch): string {
    return `${this.reportMatchTeamTitle(match, 'home')} vs ${this.reportMatchTeamTitle(match, 'away')}`;
  }

  private reportMatchTeamTitle(match: GeneratedMatch, side: 'home' | 'away'): string {
    const shortName = this.matchTeamName(match, side);
    const fullName = this.matchFullTeamName(match, side);

    if (!fullName) {
      return shortName;
    }

    return `${fullName} (${shortName})`;
  }

  private reportGeneratedOn(match: GeneratedMatch, matchDate: string, rawResponse?: any): string {
    const generatedAtISO = rawResponse?.generated_at || rawResponse?.data?.generated_at || match.generatedAtISO || '';
    const generatedAt = String(match.generatedAt || '').trim();

    if (generatedAtISO) {
      return this.reportDateTime(generatedAtISO);
    }

    if (!generatedAt || generatedAt === '-') {
      return matchDate;
    }

    if (/[A-Za-z]{3}|\d{4}-\d{2}-\d{2}|\d{1,2}[/-]\d{1,2}/.test(generatedAt)) {
      return generatedAt;
    }

    return `${matchDate} ${generatedAt}`;
  }

  private reportKickoffTime(match: GeneratedMatch): string {
    const value = match.startTimeISO || match.startDate || match.matchDate || '';

    if (!value) {
      return '-';
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return match.time || '-';
    }

    const time = date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
      timeZone: 'UTC'
    });

    return `${time} UTC`;
  }

  private reportGenerationTime(match: GeneratedMatch, rawResponse?: any): string {
    const seconds =
      rawResponse?.generation_time_seconds ??
      rawResponse?.generation_seconds ??
      rawResponse?.data?.generation_time_seconds ??
      rawResponse?.data?.generation_seconds;

    if (seconds !== null && seconds !== undefined && seconds !== '') {
      return `${seconds} Seconds`;
    }

    const milliseconds =
      rawResponse?.generation_time_ms ??
      rawResponse?.data?.generation_time_ms;

    if (milliseconds !== null && milliseconds !== undefined && milliseconds !== '') {
      const convertedSeconds = Number(milliseconds) / 1000;
      return Number.isFinite(convertedSeconds) ? `${convertedSeconds} Seconds` : '-';
    }

    const value =
      rawResponse?.generation_time ??
      rawResponse?.data?.generation_time ??
      rawResponse?.data?.generationTime ??
      match.generationTime;

    if (value === null || value === undefined || value === '') {
      return '-';
    }

    const text = String(value);
    return /second/i.test(text) ? text : `${text} Seconds`;
  }

  private reportCoinConsumed(match: GeneratedMatch, rawResponse?: any): string {
    const value =
      rawResponse?.coin_consumed ??
      rawResponse?.coins_consumed ??
      rawResponse?.data?.coin_consumed ??
      rawResponse?.data?.coins_consumed ??
      match.coinConsumed;

    if (value === null || value === undefined || value === '') {
      return '1';
    }

    return String(value);
  }

  private reportDateTime(value: string): string {
    if (!value) {
      return '-';
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return value;
    }

    const day = String(date.getDate()).padStart(2, '0');
    const month = date.toLocaleString('en-US', { month: 'short' });
    const year = date.getFullYear();
    const time = date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });

    return `${day}-${month}-${year} ${time}`;
  }

  private reportDate(value: string): string {
    if (!value) {
      return '-';
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return value;
    }

    const day = String(date.getDate()).padStart(2, '0');
    const month = date.toLocaleString('en-US', { month: 'short' });
    const year = date.getFullYear();

    return `${day}-${month}-${year}`;
  }

  private shortName(name: string): string {
    return (name || 'NA')
      .split(' ')
      .map(x => x[0])
      .join('')
      .slice(0, 3)
      .toUpperCase();
  }

  private formatMatchTime(value: string): string {
    if (!value) return '-';

    return new Intl.DateTimeFormat(this.browserLocale, {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(value));
  }

  private formatTime(value: string): string {
    if (!value) return '-';

    return new Intl.DateTimeFormat(this.browserLocale, {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }).format(new Date(value));
  }

  private toDateInputValue(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  }

  private refreshExpiryLabels(): void {
    const selectedId = this.selectedMatch?.id;
    this.matches = this.matches.map(match => ({
      ...match,
      expires: this.expiryLabel(match.startTimeISO || '', match.status),
      live: !this.isExpired(match.startTimeISO || '', match.status),
      viewable: !this.isExpired(match.startTimeISO || '', match.status)
    }));

    if (selectedId) {
      const refreshedMatch = this.matches.find(match => match.id === selectedId);
      if (refreshedMatch) {
        this.selectedMatch = this.withGame(refreshedMatch, this.activeGame);
      }
    }

    this.applyDateFilter(false);
  }

  private isExpired(startTime: string, status?: string): boolean {
    if (String(status || '').toUpperCase() === 'LIVE') {
      return true;
    }

    if (!startTime) {
      return false;
    }

    return new Date(startTime).getTime() <= Date.now();
  }

  private expiryLabel(startTime: string, status?: string): string {
    if (this.isExpired(startTime, status)) {
      return 'match ended';
    }

    if (!startTime) {
      return '-';
    }

    const diffMs = new Date(startTime).getTime() - Date.now();
    const totalMinutes = Math.max(0, Math.ceil(diffMs / 60000));
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

  canAccessTeams(match: GeneratedMatch | null): boolean {
    if (!match) {
      return false;
    }

    return Boolean(match.viewable) && !this.isExpired(match.startTimeISO || '', match.status);
  }

  activeMatchesCount(): number {
    return this.matches.filter(match => this.canAccessTeams(match)).length;
  }

  pastMatchesCount(): number {
    return this.matches.filter(match => !this.canAccessTeams(match)).length;
  }

  totalMatchesCount(): number {
    return this.matches.length;
  }

  totalGeneratedTeams(): number {
    return this.matches.reduce((sum, match) => sum + Number(match.teamsGenerated || 0), 0);
  }

  homeName(match: GeneratedMatch | null): string {
    return this.matchTeamName(match, 'home');
  }

  awayName(match: GeneratedMatch | null): string {
    return this.matchTeamName(match, 'away');
  }

  homeFullName(match: GeneratedMatch | null): string {
    return this.matchFullTeamName(match, 'home');
  }

  awayFullName(match: GeneratedMatch | null): string {
    return this.matchFullTeamName(match, 'away');
  }

  showFullTeamNames(match: GeneratedMatch | null): boolean {
    return !!this.homeFullName(match) || !!this.awayFullName(match);
  }

  teamInitial(name: string): string {
    return (name || 'T')
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map(part => part[0])
      .join('')
      .toUpperCase() || 'T';
  }

  private matchTeamName(match: GeneratedMatch | null, side: 'home' | 'away'): string {
    const [home, away] = (match?.title || 'HOME vs AWAY').split(/\s+vs\s+/i);
    return side === 'home' ? (home || 'HOME') : (away || 'AWAY');
  }

  private matchFullTeamName(match: GeneratedMatch | null, side: 'home' | 'away'): string {
    const fullName = side === 'home' ? match?.homeFullName : match?.awayFullName;
    const shortName = this.matchTeamName(match, side);
    const normalizedFullName = String(fullName || '').trim();

    if (!normalizedFullName || normalizedFullName.toLowerCase() === shortName.toLowerCase()) {
      return '';
    }

    return normalizedFullName;
  }
}
