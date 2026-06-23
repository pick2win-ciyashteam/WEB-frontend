import { Component, OnDestroy, OnInit } from '@angular/core';
import { ApiService } from 'src/app/core/services/api.service';
import { ActivatedRoute } from '@angular/router';

type PlayerPosition = 'GK' | 'DEF' | 'MID' | 'FWD';

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
  startTimeISO?: string;
}

interface ApiPlayer {
  id: number;
  match_id?: number;
  team_side?: 'team_a' | 'team_b';
  name: string;
  original_name?: string;
  role: PlayerPosition;
  mandate?: string | null;
  captain?: string | null;
  cap?: string | null;
  dt_no?: number;
  logo?: string | null;
  elogo?: string | null;
  image?: string | null;
  photo?: string | null;
  player_image?: string | null;
}

interface ApiGeneratedTeam {
  team_no: number;
  captain?: string;
  vice_captain?: string;
  players: ApiPlayer[];
}

interface ApiPreviewPlayer {
  name: string;
  role?: PlayerPosition;
  image?: string | null;
  side?: 'team_a' | 'team_b';
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

  loadingMatches = false;
  loadingTeams = false;
  loadingPlayers = false;

  browserLocale = navigator.language || 'en-US';
  selectedDate = this.toDateInputValue(new Date());
  filteredMatches: GeneratedMatch[] = [];
  private expiryTimer: any;

  constructor(private api: ApiService,  private route: ActivatedRoute) {}

  ngOnInit(): void {
    this.loadMatches();
    this.expiryTimer = setInterval(() => this.refreshExpiryLabels(), 60000);
  }

  ngOnDestroy(): void {
    clearInterval(this.expiryTimer);
  }

  loadMatches(): void {
  this.loadingMatches = true;

  this.api.GetMyTeams().subscribe({
    next: (res: any) => {
      // console.log('My Teams matches response:', res);
      const data = Array.isArray(res?.data) ? res.data : [];

      this.matches = data.map((m: any) => {
        const startTimeISO = m.start_time || '';
        const expired = this.isExpired(startTimeISO, m.status);

        return {
          id: Number(m.match_id),
          league: m.series_name || 'N/A',
          time: this.formatMatchTime(startTimeISO),
          title: `${m.home_team || 'HOME'} vs ${m.away_team || 'AWAY'}`,
          coin: '-1',
          generatedAt: this.formatTime(m.generated_at),
          expires: this.expiryLabel(startTimeISO, m.status),
          live: !expired,
          free: false,
          homeLogo: m.home_logo,
          awayLogo: m.away_logo,
          homeFullName: m.home_full_team_name || m.home_full_name || m.home_team_name || '',
          awayFullName: m.away_full_team_name || m.away_full_name || m.away_team_name || '',
          status: m.status,
          teamsGenerated: Number(m.teams_generated || m.total_teams || 0),
          viewable: !expired,
          startDate: startTimeISO ? this.toDateInputValue(new Date(startTimeISO)) : '',
          startTimeISO
        };
      });

      this.applyDateFilter();
      this.openMatchFromQueryParam();
      if (!this.selectedMatch) {
        const firstViewableMatch = this.filteredMatches.find(match => this.canAccessTeams(match));
        if (firstViewableMatch) {
          this.openMatchTeams(firstViewableMatch);
        }
      }
this.loadingMatches = false;
    },
    error: () => {
      this.matches = [];
      this.filteredMatches = [];
      this.loadingMatches = false;
    }
  });
}

applyDateFilter() {
  if (!this.selectedDate) {
    this.filteredMatches = [...this.matches];
    return;
  }

  this.filteredMatches = this.matches.filter(
    (match: any) => match.startDate === this.selectedDate
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

  if (!matchId) {
    return;
  }

  const match = this.matches.find(m => String(m.id) === String(matchId));

  if (!match) {
    return;
  }

  this.selectedDate = match.startDate || '';
  this.applyDateFilter();

  if (this.canAccessTeams(match)) {
    this.openMatchTeams(match);
  }
}

  downloadMatchTeams(match: GeneratedMatch) {
  if (!this.canAccessTeams(match)) {
    return;
  }

  this.api.MatchByTeams(match.id).subscribe({
    next: (res: any) => {
      // console.log('My Teams download response:', res);

      const generatedTeams = this.generatedTeamsFromResponse(res);
      const responsePreview = this.teamsPreviewFromResponse(res);

      if (generatedTeams.length) {
        const text = this.teamTextBlocks(generatedTeams, match, responsePreview);
        this.downloadText(text, this.makeTeamFileName(match, 'txt'));
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
        const viceCaptain = players.find((p: any) => p.captain === 'VC')?.name || '';

        const homeCount = players.filter((p: any) => p.team_side === 'team_a').length;
        const awayCount = players.filter((p: any) => p.team_side === 'team_b').length;

        return {
          Team: `T${index + 1}`,
          Split: `${homeCount}-${awayCount}`,
          'Formation (GK-DEF-MID-FWD)': `${gk.length}-${def.length}-${mid.length}-${fwd.length}`,
          Captain: captain,
          'Vice-Captain': viceCaptain,
          'GK Players': gk.join(' / '),
          Defenders: def.join(' / '),
          Midfielders: mid.join(' / '),
          Forwards: fwd.join(' / '),
          [`${this.teamCodeFromTitle(match.title, 'home')} Count`]: homeCount,
          [`${this.teamCodeFromTitle(match.title, 'away')} Count`]: awayCount
        };
      });

      const text = [
        this.teamTextHeader(match, rows.length || match.teamsGenerated || 0),
        this.previewTextBlock(responsePreview, match),
        this.generatedTeamsTitle(),
        this.objectRowsToTextBlocks(rows),
        this.teamTextFooter()
      ].filter(Boolean).join('\r\n\r\n');
      this.downloadText(text, this.makeTeamFileName(match, 'txt'));
    }
  });
}

teamCodeFromTitle(title: string, side: 'home' | 'away'): string {
  const [home, away] = (title || 'HOME vs AWAY').split(' vs ');
  return side === 'home' ? (home || 'HOME') : (away || 'AWAY');
}

makeTeamFileName(match: any, extension = 'txt'): string {
  const [homeRaw, awayRaw] = String(match.title || 'TEAMA vs TEAMB').split(/\s+vs\s+/i);
  const homeTeam = this.fileTeamSegment(homeRaw || 'TEAMA');
  const awayTeam = this.fileTeamSegment(awayRaw || 'TEAMB');
  const leagueName = this.fileLeagueSegment(match.league || 'League');
  const matchDate = match.startDate || new Date().toISOString().split('T')[0];

  return `PICK2WIN_UCT-${homeTeam}_vs_${awayTeam}-${leagueName}-${matchDate}.${extension}`;
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

  openMatchTeams(match: GeneratedMatch) {
    if (!this.canAccessTeams(match)) {
      return;
    }

    if (this.selectedMatch?.id === match.id) {
      this.backToMatches();
      return;
    }

    this.selectedMatch = match;
    this.previewTeam = null;
    this.previewTeams = [];
    this.loadingTeams = true;

    this.api.MatchByTeams(match.id).subscribe({
      next: (res: any) => {
        // console.log('My Teams match teams response:', res);

        const generatedTeams = this.generatedTeamsFromResponse(res);

        if (generatedTeams.length) {
          // console.log('My teams response:', res);
          this.previewTeams = generatedTeams.map((team: ApiGeneratedTeam) => this.mapGeneratedTeam(team));
          this.selectedMatch = {
            ...match,
            teamsGenerated: Number(res?.total_teams || res?.data?.total_teams || generatedTeams.length),
            viewable: true
          };
          this.loadingTeams = false;
          return;
        }

        const teamA: ApiPlayer[] = Array.isArray(res?.team_a) ? res.team_a : [];
        const teamB: ApiPlayer[] = Array.isArray(res?.team_b) ? res.team_b : [];

        const allTeams = [...teamA, ...teamB];

        this.previewTeams = allTeams.map((team, index) =>
          this.mapTeamCard(team, index + 1)
        );

        this.loadingTeams = false;
      },
      error: () => {
        this.previewTeams = [];
        this.loadingTeams = false;
      }
    });
  }

  backToMatches() {
    this.selectedMatch = null;
    this.previewTeam = null;
    this.previewTeams = [];
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
        // console.log('My Teams team players response:', res);

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

  isViceCaptain(player: PreviewPlayer): boolean {
    return player.captain === 'VC';
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
    const viceCaptain = players.find(player => player.captain === 'VC' || player.name === team.vice_captain) || null;

    if (captain && !captain.captain) {
      captain.captain = 'C';
    }

    if (viceCaptain && !viceCaptain.captain) {
      viceCaptain.captain = 'VC';
    }

    return {
      id: Number(team.team_no),
      split: `${players.filter(player => player.team === 'home').length}-${players.filter(player => player.team === 'away').length}`,
      players,
      captain,
      viceCaptain,
      homeCount: players.filter(player => player.team === 'home').length,
      awayCount: players.filter(player => player.team === 'away').length,
      counts: this.positionCounts(players)
    };
  }

  private generatedTeamsFromResponse(res: any): ApiGeneratedTeam[] {
    if (Array.isArray(res?.teams)) {
      return res.teams;
    }

    if (Array.isArray(res?.data?.teams)) {
      return res.data.teams;
    }

    return [];
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

    const viceCaptain =
      players.find(p => p.captain === 'VC') || null;

    return {
      id: teamId,
      split: `${players.filter(p => p.team === 'home').length}-${players.filter(p => p.team === 'away').length}`,
      players,
      captain,
      viceCaptain,
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
      rows.push(['', 'Player', 'Role', 'C/VC']);

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

    if (team.viceCaptain?.id === player.id || player.captain === 'VC') {
      return 'VC';
    }

    return '.';
  }

  private teamTextBlocks(teams: ApiGeneratedTeam[], match?: GeneratedMatch, preview?: ApiTeamsPreview | null): string {
    const blocks = teams.map((team: ApiGeneratedTeam) => this.teamTextBlock(team));

    if (!match) {
      return [
        this.previewTextBlock(preview),
        this.generatedTeamsTitle(),
        blocks.join('\r\n\r\n'),
        this.teamTextFooter()
      ].filter(Boolean).join('\r\n\r\n');
    }

    return [
      this.teamTextHeader(match, teams.length),
      this.previewTextBlock(preview, match),
      this.generatedTeamsTitle(),
      blocks.join('\r\n\r\n'),
      this.teamTextFooter()
    ].filter(Boolean).join('\r\n\r\n');
  }

  private teamTextHeader(match: GeneratedMatch, totalTeams: number): string {
    const matchDate = this.reportMatchDate(match);
    const generatedOn = this.reportGeneratedOn(match, matchDate);

    return [
      this.reportLine('='),
      this.centerReportText('PICK2WIN - USER CONFIGURATION TEAMS'),
      this.centerReportText('(UCT)'),
      this.reportLine('='),
      '',
      'Match:',
      this.reportMatchTitle(match),
      '',
      'Competition:',
      match.league || 'N/A',
      '',
      'Match Date:',
      matchDate,
      '',
      'Generated On:',
      generatedOn,
      '',
      'Total Teams Generated:',
      String(totalTeams || match.teamsGenerated || 0)
    ].join('\r\n');
  }

  private previewTextBlock(preview?: ApiTeamsPreview | null, match?: GeneratedMatch): string {
    if (!preview) {
      return '';
    }

    const substitutes = Array.isArray(preview.substitutes) ? preview.substitutes : [];
    const mandateYes = Array.isArray(preview.mandate_yes) ? preview.mandate_yes : [];
    const mandateNo = Array.isArray(preview.mandate_no) ? preview.mandate_no : [];
    const cvcPlayers = Array.isArray(preview.cvc_players) ? preview.cvc_players : [];
    const captains = Array.isArray(preview.captains) ? preview.captains : [];
    const viceCaptains = Array.isArray(preview.vice_captains) ? preview.vice_captains : [];

    if (
      !substitutes.length &&
      !mandateYes.length &&
      !mandateNo.length &&
      !cvcPlayers.length &&
      !captains.length &&
      !viceCaptains.length &&
      preview.substitutes_count == null &&
      preview.mandate_yes_count == null &&
      preview.mandate_no_count == null &&
      preview.cvc_count == null &&
      preview.cvc_players_count == null &&
      preview.captain_count == null &&
      preview.captains_count == null &&
      preview.captaincy_count == null &&
      preview.vice_captain_count == null &&
      preview.vice_captains_count == null
    ) {
      return '';
    }

    const sections = [
      this.previewPlayersSection('SUBSTITUTE PLAYERS', substitutes, match),
      this.mandatePlayersSection(mandateYes, mandateNo, match),
      this.captaincyPlayersSection(preview, captains, viceCaptains, cvcPlayers, match)
    ].filter(Boolean);

    return [
      this.reportLine('='),
      this.centerReportText('USER CONFIGURATION SUMMARY'),
      this.reportLine('='),
      '',
      sections.join('\r\n\r\n')
    ].filter(Boolean).join('\r\n');
  }

  private previewModeText(preview: ApiTeamsPreview): string {
    const cvcPlayers = Array.isArray(preview.cvc_players) ? preview.cvc_players : [];
    const captains = Array.isArray(preview.captains) ? preview.captains : [];
    const viceCaptains = Array.isArray(preview.vice_captains) ? preview.vice_captains : [];

    if (cvcPlayers.length || Number(preview.cvc_count || 0) > 0) {
      return 'Mode: CVC mode';
    }

    if (
      captains.length ||
      viceCaptains.length ||
      Number(preview.captain_count || 0) > 0 ||
      Number(preview.captaincy_count || 0) > 0 ||
      Number(preview.vice_captain_count || 0) > 0
    ) {
      return 'Mode: C & VC mode';
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

  private teamTextBlock(team: ApiGeneratedTeam): string {
    const previewTeam = this.mapGeneratedTeam(team);
    const previewPlayers = previewTeam.players;
    const combination = `${previewTeam.homeCount} x ${previewTeam.awayCount}`;
    const playerWidth = Math.max(26, ...previewPlayers.map(player => player.name.length));

    const lines = [
      `UCT TEAM : ${team.team_no}`,
      `Combination : ${combination}`,
      '',
      `${'No'.padEnd(5)}${'Player'.padEnd(playerWidth)} ${'Role'.padEnd(8)} C/VC`,
      '-'.repeat(48)
    ];

    previewPlayers.forEach((player, index) => {
      const cap = this.csvCaptainLabel(player, previewTeam);
      lines.push(
        `${String(index + 1).padEnd(5)}${player.name.padEnd(playerWidth)} ${player.pos.padEnd(8)} ${cap}`
      );
    });

    lines.push('');
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
      const viceCaptain = String(row['Vice-Captain'] || '');
      const players = playerGroups.flatMap(([role, names]) =>
        names.split(' / ').filter(Boolean).map(name => ({ name, role }))
      );
      const playerWidth = Math.max(26, ...players.map(player => player.name.length));
      const lines = [
        `UCT TEAM : ${teamNo}`,
        `Combination : ${split.toLowerCase()}`,
        '',
        `${'No'.padEnd(5)}${'Player'.padEnd(playerWidth)} ${'Role'.padEnd(8)} C/VC`,
        '-'.repeat(48)
      ];

      players.forEach((player, playerIndex) => {
        const cap = player.name === captain ? 'C' : (player.name === viceCaptain ? 'VC' : '.');

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
      this.centerReportText('GENERATED TEAMS'),
      this.reportLine('=')
    ].join('\r\n');
  }

  private teamTextFooter(): string {
    return [
      '(Each team contains 11 players and follows the',
      'configured UCT generation rules.)',
      '',
      this.reportLine('='),
      this.centerReportText('GENERATION NOTES'),
      this.reportLine('='),
      '',
      '- Teams are generated based on the user-selected',
      '  configuration.',
      '',
      '- Mandate YES players are included in every generated',
      '  team.',
      '',
      '- Mandate NO players are excluded from all generated',
      '  teams.',
      '',
      '- Substitute players are considered according to the',
      '  selected configuration.',
      '',
      '- Captaincy assignments are generated from the selected',
      '  captaincy mode and associated player pool.',
      '',
      '- Team combinations follow the configured player',
      '  distribution rules and role constraints.',
      '',
      this.reportLine('='),
      this.centerReportText('PICK2WIN'),
      this.reportLine('='),
      '',
      'Your Configuration. Your Teams. In Seconds.',
      '',
      'UCT (User Configuration Teams) is a structured virtual',
      'team generation engine that creates up to 20 teams',
      'based on your selected players, preferences,',
      'and strategy.',
      '',
      'Website:',
      'www.pick2win.io',
      '',
      '(c) PICK2WIN Technologies Private Limited',
      'All Rights Reserved.',
      '',
      'Generated by PICK2WIN UCT Engine',
      '',
      this.reportLine('=')
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
    if (!captains.length && !viceCaptains.length && !cvcPlayers.length) {
      return '';
    }

    const isCvc = cvcPlayers.length || Number(preview.cvc_count || preview.cvc_players_count || 0) > 0;
    const lines = [
      this.reportLine('*'),
      `CAPTAINCY MODE : ${isCvc ? 'CVC' : 'C & VC'}`
    ];

    if (isCvc) {
      lines.push('', this.previewPlayersList(cvcPlayers, match));
    } else {
      if (captains.length) {
        lines.push('', 'CAPTAINS', '', this.previewPlayersList(captains, match));
      }

      if (viceCaptains.length) {
        lines.push('', 'VICE CAPTAINS', '', this.previewPlayersList(viceCaptains, match));
      }
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

  private reportTeamCode(match: GeneratedMatch | undefined, side: 'team_a' | 'team_b'): string {
    const title = match?.title || 'TEAMA vs TEAMB';
    const [home, away] = title.split(/\s+vs\s+/i);
    const teamName = side === 'team_a' ? home : away;
    const bracketCode = String(teamName || '').match(/\(([A-Za-z0-9]+)\)/);

    return this.fileTeamSegment(bracketCode?.[1] || teamName || (side === 'team_a' ? 'TEAMA' : 'TEAMB'));
  }

  private reportLine(char: '=' | '-' | '*'): string {
    return char.repeat(char === '-' ? 56 : 56);
  }

  private centerReportText(value: string): string {
    const width = 56;
    const text = String(value || '');
    const left = Math.max(0, Math.floor((width - text.length) / 2));

    return `${' '.repeat(left)}${text}`;
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

  private reportGeneratedOn(match: GeneratedMatch, matchDate: string): string {
    const generatedAt = String(match.generatedAt || '').trim();

    if (!generatedAt || generatedAt === '-') {
      return matchDate;
    }

    if (/[A-Za-z]{3}|\d{4}-\d{2}-\d{2}|\d{1,2}[/-]\d{1,2}/.test(generatedAt)) {
      return generatedAt;
    }

    return `${matchDate} ${generatedAt}`;
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
    this.matches = this.matches.map(match => ({
      ...match,
      expires: this.expiryLabel(match.startTimeISO || '', match.status),
      live: !this.isExpired(match.startTimeISO || '', match.status),
      viewable: !this.isExpired(match.startTimeISO || '', match.status)
    }));

    this.applyDateFilter();
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
