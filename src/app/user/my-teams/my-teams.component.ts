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

@Component({
  selector: 'app-my-teams',
  templateUrl: './my-teams.component.html',
  styleUrls: ['./my-teams.component.css']
})
export class MyTeamsComponent {
  selectedMatch: GeneratedMatch | null = null;
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

  openMatchTeams(match: GeneratedMatch) {
    if (!match.live) {
      return;
    }

    this.selectedMatch = match;
  }

  backToMatches() {
    this.selectedMatch = null;
  }

}
