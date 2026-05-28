import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { AuthModalService } from '../../core/services/auth-modal.service';
import { AuthService } from '../../core/services/auth.service';

interface LineoutTeam {
  code: string;
  name: string;
  color: string;
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
  matches: LineoutMatch[] = this.createSampleMatches();
  readonly coinBalance = 47;

  constructor(
    private authModal: AuthModalService,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.generatedMatchIds = this.readGeneratedMatchIds();

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

  private createSampleMatches(): LineoutMatch[] {
    return [
      {
        id: 'mci-ars',
        league: 'Premier League',
        country: 'England',
        home: { code: 'MCI', name: 'Manchester City', color: '#6CABDD' },
        away: { code: 'ARS', name: 'Arsenal', color: '#EF0107' },
        kickoffISO: this.inHours(1),
        lineupReady: true,
        lineupJustReleased: true,
        venue: 'Etihad Stadium'
      },
      {
        id: 'juv-nap',
        league: 'Serie A',
        country: 'Italy',
        home: { code: 'JUV', name: 'Juventus', color: '#f5f5f5' },
        away: { code: 'NAP', name: 'Napoli', color: '#12A8E0' },
        kickoffISO: this.inHours(3),
        lineupReady: true,
        venue: 'Allianz Stadium'
      },
      {
        id: 'bay-lev',
        league: 'Bundesliga',
        country: 'Germany',
        home: { code: 'BAY', name: 'Bayern Munich', color: '#DC052D' },
        away: { code: 'LEV', name: 'Leverkusen', color: '#E32221' },
        kickoffISO: this.inHours(6),
        lineupReady: false,
        venue: 'Allianz Arena'
      },
      {
        id: 'rma-fcb',
        league: 'La Liga',
        country: 'Spain',
        home: { code: 'RMA', name: 'Real Madrid', color: '#FEBE10' },
        away: { code: 'FCB', name: 'Barcelona', color: '#A50044' },
        kickoffISO: this.daysFromNowAt(1, 20, 30),
        lineupReady: false,
        venue: 'Santiago Bernabeu'
      },
      {
        id: 'psg-mar',
        league: 'Ligue 1',
        country: 'France',
        home: { code: 'PSG', name: 'Paris SG', color: '#004170' },
        away: { code: 'MAR', name: 'Marseille', color: '#00A3E0' },
        kickoffISO: this.daysFromNowAt(1, 22, 15),
        lineupReady: false,
        venue: 'Parc des Princes'
      },
      {
        id: 'ucl-final',
        league: 'UEFA Champions League',
        country: 'Europe',
        home: { code: 'INT', name: 'Inter', color: '#0068A8' },
        away: { code: 'ATM', name: 'Atletico Madrid', color: '#CB3524' },
        kickoffISO: this.daysFromNowAt(3, 21, 0),
        lineupReady: false,
        venue: 'Neutral Venue'
      },
      {
        id: 'mls-lafc',
        league: 'MLS',
        country: 'USA',
        home: { code: 'LAFC', name: 'Los Angeles FC', color: '#C39E6D' },
        away: { code: 'SEA', name: 'Seattle Sounders', color: '#5D9731' },
        kickoffISO: this.daysFromNowAt(4, 2, 30),
        lineupReady: false,
        venue: 'BMO Stadium'
      }
    ];
  }

  private inHours(hours: number): string {
    const date = new Date();
    date.setHours(date.getHours() + hours);
    return date.toISOString();
  }

  private daysFromNowAt(days: number, hour: number, minute: number): string {
    const date = new Date();
    date.setDate(date.getDate() + days);
    date.setHours(hour, minute, 0, 0);
    return date.toISOString();
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
