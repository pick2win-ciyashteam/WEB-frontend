import { Component, OnDestroy, OnInit } from '@angular/core';
import { ApiService } from 'src/app/core/services/api.service';

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

  matches: GeneratedMatch[] = [];
  previewTeams: PreviewTeam[] = [];

  readonly positionRows: PlayerPosition[] = ['GK', 'DEF', 'MID', 'FWD'];

  loadingMatches = false;
  loadingTeams = false;
  loadingPlayers = false;

  selectedDate = '';
filteredMatches: GeneratedMatch[] = [];
private expiryTimer: any;

  constructor(private api: ApiService) {}

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
      console.log('My Teams matches response:', res);
      const data = Array.isArray(res?.data) ? res.data : [];

      this.matches = data.map((m: any) => {
        const startTimeISO = m.start_time || '';

        return {
          id: Number(m.match_id),
          league: m.series_name || 'N/A',
          time: this.formatMatchTime(startTimeISO),
          title: `${m.home_team || 'HOME'} vs ${m.away_team || 'AWAY'}`,
          coin: '-1',
          generatedAt: this.formatTime(m.generated_at),
          expires: this.expiryLabel(startTimeISO, m.status),
          live: !this.isExpired(startTimeISO, m.status),
          free: false,
          homeLogo: m.home_logo,
          awayLogo: m.away_logo,
          status: m.status,
          teamsGenerated: Number(m.teams_generated || m.total_teams || 0),
          viewable: true,
          startDate: startTimeISO ? new Date(startTimeISO).toISOString().split('T')[0] : '',
          startTimeISO
        };
      });

      this.filteredMatches = [...this.matches];
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
  this.selectedDate = '';
  this.filteredMatches = [...this.matches];
}

openDatePicker(input: HTMLInputElement): void {
  input.focus();

  const pickerInput = input as HTMLInputElement & { showPicker?: () => void };
  pickerInput.showPicker?.();
}

  downloadMatchTeams(match: GeneratedMatch) {
  this.api.MatchByTeams(match.id).subscribe({
    next: (res: any) => {
      console.log('My Teams download response:', res);

      const generatedTeams = this.generatedTeamsFromResponse(res);

      if (generatedTeams.length) {
        const rows = generatedTeams.map((team: ApiGeneratedTeam) => this.teamCsvRow(match, team));
        this.downloadCSV(rows, this.makeTeamFileName(match));
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

      const fileName = this.makeTeamFileName(match);
      this.downloadCSV(rows, fileName);
    }
  });
}

teamCodeFromTitle(title: string, side: 'home' | 'away'): string {
  const [home, away] = (title || 'HOME vs AWAY').split(' vs ');
  return side === 'home' ? (home || 'HOME') : (away || 'AWAY');
}

makeTeamFileName(match: any): string {
  const companyName = 'Pick2Win-uct';

  const teamsName = (match.title || 'Teams')
    .replace(/\s+vs\s+/gi, '-vs-')
    .replace(/[^a-zA-Z0-9-]/g, '');

  const matchDate = match.startDate || new Date().toISOString().split('T')[0];

  return `${companyName}-${teamsName}-${matchDate}.csv`;
}

downloadCSV(rows: any[], fileName: string) {
  if (!rows.length) return;

  const headers = Object.keys(rows[0]);
  const csv = [
    headers.join(','),
    ...rows.map(row =>
      headers.map(header => `"${String(row[header] ?? '').replace(/"/g, '""')}"`).join(',')
    )
  ].join('\n');

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');

  link.href = URL.createObjectURL(blob);
  link.download = fileName;
  link.click();

  URL.revokeObjectURL(link.href);
}

  openMatchTeams(match: GeneratedMatch) {
    this.selectedMatch = match;
    this.previewTeam = null;
    this.previewTeams = [];
    this.loadingTeams = true;

    this.api.MatchByTeams(match.id).subscribe({
      next: (res: any) => {
        console.log('My Teams match teams response:', res);

        const generatedTeams = this.generatedTeamsFromResponse(res);

        if (generatedTeams.length) {
          console.log('My teams response:', res);
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
        console.log('My Teams team players response:', res);

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
  }

  navPreview(delta: number): void {
    const total = this.previewTeams.length;
    if (!total) return;

    this.previewIndex = (this.previewIndex + delta + total) % total;
    const team = this.previewTeams[this.previewIndex];

    this.openTeamPreview(team.id);
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
      name: team.name,
      short: this.shortName(team.name),
      pos: team.role || 'MID',
      team: side,
      captain: team.captain
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
      logo: player.player_image || player.logo || player.elogo || player.image || player.photo || null
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

  private teamCsvRow(match: GeneratedMatch, team: ApiGeneratedTeam): Record<string, string | number> {
    const players = (Array.isArray(team.players) ? team.players : []).map(player => this.mapPreviewPlayer(player));
    const byRole = (role: PlayerPosition) => players.filter(player => player.pos === role).map(player => player.name);

    return {
      Team: `T${team.team_no}`,
      Split: `${players.filter(player => player.team === 'home').length}-${players.filter(player => player.team === 'away').length}`,
      'Formation (GK-DEF-MID-FWD)': `${byRole('GK').length}-${byRole('DEF').length}-${byRole('MID').length}-${byRole('FWD').length}`,
      Captain: team.captain || players.find(player => this.isCaptain(player))?.name || '',
      'Vice-Captain': team.vice_captain || players.find(player => this.isViceCaptain(player))?.name || '',
      'GK Players': byRole('GK').join(' / '),
      Defenders: byRole('DEF').join(' / '),
      Midfielders: byRole('MID').join(' / '),
      Forwards: byRole('FWD').join(' / '),
      [`${this.teamCodeFromTitle(match.title, 'home')} Count`]: players.filter(player => player.team === 'home').length,
      [`${this.teamCodeFromTitle(match.title, 'away')} Count`]: players.filter(player => player.team === 'away').length
    };
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

    return new Intl.DateTimeFormat('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(value));
  }

  private formatTime(value: string): string {
    if (!value) return '-';

    return new Intl.DateTimeFormat('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }).format(new Date(value));
  }

  private refreshExpiryLabels(): void {
    this.matches = this.matches.map(match => ({
      ...match,
      expires: this.expiryLabel(match.startTimeISO || '', match.status),
      live: !this.isExpired(match.startTimeISO || '', match.status)
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
      return '0m';
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
}
