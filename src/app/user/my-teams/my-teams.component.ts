import { Component } from '@angular/core';

interface GeneratedMatch {
  id: string;
  league: string;
  time: string;
  title: string;
  coin: string;
  generatedAt: string;
  expires: string;
  live?: boolean;
  free?: boolean;
}

type PlayerPosition = 'GK' | 'DEF' | 'MID' | 'FWD';

interface PreviewPlayer {
  name: string;
  short: string;
  pos: PlayerPosition;
  team: 'home' | 'away';
}

interface PreviewTeam {
  id: number;
  split: string;
  players: PreviewPlayer[];
  captain: PreviewPlayer;
  viceCaptain: PreviewPlayer;
  homeCount: number;
  awayCount: number;
  counts: Record<PlayerPosition, number>;
}

@Component({
  selector: 'app-my-teams',
  templateUrl: './my-teams.component.html',
  styleUrls: ['./my-teams.component.css']
})
export class MyTeamsComponent {
  selectedMatch: GeneratedMatch | null = null;
  previewTeam: PreviewTeam | null = null;
  previewIndex = 0;

  readonly matches: GeneratedMatch[] = [
    {
      id: 'mci-ars',
      league: 'Premier League',
      time: 'Jul 20, 2026 - kickoff 16:30 UTC',
      title: 'MCI vs ARS',
      coin: '-1',
      generatedAt: '14:38:04 UTC',
      expires: 'in 1h 52m',
      live: true
    },
    {
      id: 'rma-fcb',
      league: 'La Liga - El Clasico',
      time: 'Jul 19, 2026 - kickoff 20:00 UTC',
      title: 'RMA vs FCB',
      coin: '-1',
      generatedAt: '19:42:18 UTC',
      expires: 'match ended'
    },
    {
      id: 'psg-mar',
      league: 'Ligue 1 - Le Classique',
      time: 'Jul 16, 2026 - kickoff 20:45 UTC',
      title: 'PSG vs MAR',
      coin: '-1',
      generatedAt: '19:55:02 UTC',
      expires: 'match ended'
    },
    {
      id: 'tot-avl',
      league: 'Premier League',
      time: 'Jun 12, 2026 - kickoff 20:00 UTC',
      title: 'TOT vs AVL',
      coin: 'FREE',
      generatedAt: '19:45:01 UTC',
      expires: 'match ended',
      free: true
    }
  ];

  readonly teamNumbers = Array.from({ length: 20 }, (_, index) => index + 1);
  readonly positionRows: PlayerPosition[] = ['FWD', 'MID', 'DEF', 'GK'];

  private readonly playerPool: PreviewPlayer[] = [
    { name: 'Ederson', short: 'EDE', pos: 'GK', team: 'home' },
    { name: 'Walker', short: 'WAL', pos: 'DEF', team: 'home' },
    { name: 'Dias', short: 'DIA', pos: 'DEF', team: 'home' },
    { name: 'Stones', short: 'STO', pos: 'DEF', team: 'home' },
    { name: 'Gvardiol', short: 'GVA', pos: 'DEF', team: 'home' },
    { name: 'Rodri', short: 'ROD', pos: 'MID', team: 'home' },
    { name: 'De Bruyne', short: 'KDB', pos: 'MID', team: 'home' },
    { name: 'Foden', short: 'FOD', pos: 'MID', team: 'home' },
    { name: 'Silva', short: 'SIL', pos: 'MID', team: 'home' },
    { name: 'Haaland', short: 'HAA', pos: 'FWD', team: 'home' },
    { name: 'Alvarez', short: 'ALV', pos: 'FWD', team: 'home' },
    { name: 'Raya', short: 'RAY', pos: 'GK', team: 'away' },
    { name: 'White', short: 'WHI', pos: 'DEF', team: 'away' },
    { name: 'Saliba', short: 'SAL', pos: 'DEF', team: 'away' },
    { name: 'Gabriel', short: 'GAB', pos: 'DEF', team: 'away' },
    { name: 'Zinchenko', short: 'ZIN', pos: 'DEF', team: 'away' },
    { name: 'Rice', short: 'RIC', pos: 'MID', team: 'away' },
    { name: 'Odegaard', short: 'ODE', pos: 'MID', team: 'away' },
    { name: 'Havertz', short: 'HAV', pos: 'MID', team: 'away' },
    { name: 'Saka', short: 'SAK', pos: 'FWD', team: 'away' },
    { name: 'Martinelli', short: 'MAR', pos: 'FWD', team: 'away' },
    { name: 'Jesus', short: 'JES', pos: 'FWD', team: 'away' }
  ];

  get previewTeams(): PreviewTeam[] {
    return this.teamNumbers.map(teamNumber => this.buildPreviewTeam(teamNumber));
  }

  openMatchTeams(match: GeneratedMatch) {
    if (!match.live) {
      return;
    }

    this.selectedMatch = match;
    this.previewTeam = null;
  }

  backToMatches() {
    this.selectedMatch = null;
    this.previewTeam = null;
  }

  openTeamPreview(teamNumber: number): void {
    this.previewIndex = teamNumber - 1;
    this.previewTeam = this.previewTeams[this.previewIndex];
  }

  closePreview(): void {
    this.previewTeam = null;
  }

  navPreview(delta: number): void {
    const total = this.previewTeams.length;
    this.previewIndex = (this.previewIndex + delta + total) % total;
    this.previewTeam = this.previewTeams[this.previewIndex];
  }

  playersByPosition(position: PlayerPosition): PreviewPlayer[] {
    return this.previewTeam?.players.filter(player => player.pos === position) ?? [];
  }

  isCaptain(player: PreviewPlayer): boolean {
    return this.previewTeam?.captain.name === player.name;
  }

  isViceCaptain(player: PreviewPlayer): boolean {
    return this.previewTeam?.viceCaptain.name === player.name;
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
    return side === 'home' ? '#6cabdd' : '#ef0107';
  }

  private buildPreviewTeam(teamNumber: number): PreviewTeam {
    const splits = ['4-7', '5-6', '6-5', '7-4'];
    const split = splits[(teamNumber - 1) % splits.length];
    const [homeTarget] = split.split('-').map(Number);
    const awayTarget = 11 - homeTarget;
    const homePlayers = this.rotate(this.playerPool.filter(player => player.team === 'home'), teamNumber);
    const awayPlayers = this.rotate(this.playerPool.filter(player => player.team === 'away'), teamNumber + 3);
    const selected: PreviewPlayer[] = [];

    this.addByPosition(selected, homePlayers, 'GK', homeTarget > awayTarget ? 1 : 0);
    this.addByPosition(selected, awayPlayers, 'GK', selected.some(player => player.pos === 'GK') ? 0 : 1);
    this.fillSide(selected, homePlayers, homeTarget);
    this.fillSide(selected, awayPlayers, awayTarget);
    this.fillRemaining(selected, this.rotate(this.playerPool, teamNumber + 7));

    const players = selected.slice(0, 11);
    const captain = players.find(player => player.name === 'Haaland') || players[teamNumber % players.length];
    const viceCaptain = players.find(player => player.name === 'Saka' && player.name !== captain.name)
      || players.find(player => player.name !== captain.name)
      || captain;

    return {
      id: teamNumber,
      split,
      players,
      captain,
      viceCaptain,
      homeCount: players.filter(player => player.team === 'home').length,
      awayCount: players.filter(player => player.team === 'away').length,
      counts: {
        GK: players.filter(player => player.pos === 'GK').length,
        DEF: players.filter(player => player.pos === 'DEF').length,
        MID: players.filter(player => player.pos === 'MID').length,
        FWD: players.filter(player => player.pos === 'FWD').length
      }
    };
  }

  private addByPosition(selected: PreviewPlayer[], pool: PreviewPlayer[], pos: PlayerPosition, count: number): void {
    pool
      .filter(player => player.pos === pos)
      .slice(0, count)
      .forEach(player => this.addUnique(selected, player));
  }

  private fillSide(selected: PreviewPlayer[], pool: PreviewPlayer[], target: number): void {
    const side = pool[0]?.team;
    while (side && selected.filter(player => player.team === side).length < target && selected.length < 11) {
      const player = pool.find(item => !selected.some(existing => existing.name === item.name));
      if (!player) return;
      this.addUnique(selected, player);
    }
  }

  private fillRemaining(selected: PreviewPlayer[], pool: PreviewPlayer[]): void {
    while (selected.length < 11) {
      const player = pool.find(item => !selected.some(existing => existing.name === item.name));
      if (!player) return;
      this.addUnique(selected, player);
    }
  }

  private addUnique(selected: PreviewPlayer[], player: PreviewPlayer): void {
    if (!selected.some(existing => existing.name === player.name)) {
      selected.push(player);
    }
  }

  private rotate(players: PreviewPlayer[], seed: number): PreviewPlayer[] {
    if (!players.length) return [];
    const offset = seed % players.length;
    return [...players.slice(offset), ...players.slice(0, offset)];
  }

}
