import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, switchMap, takeUntil } from 'rxjs';
import { MatchDetail, MatchPlayer, MatchTeam } from 'src/app/core/interfaces/content';
import { ApiService } from 'src/app/core/services/api.service';
import { ProfileService } from 'src/app/core/services/profile.service';

@Component({
  selector: 'app-playing-team',
  templateUrl: './playing-team.component.html',
  styleUrls: ['./playing-team.component.css']
})
export class PlayingTeamComponent implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();
  private toastTimer: ReturnType<typeof setTimeout> | null = null;
  private navigateTimer: ReturnType<typeof setTimeout> | null = null;

  loading = true;
  errorMessage = '';
  toast: { type: 'success' | 'error'; message: string } | null = null;
  detail: MatchDetail | null = null;
  coinBalance = 0;

  constructor(
    private api: ApiService,
    private profileService: ProfileService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.route.paramMap
      .pipe(
        takeUntil(this.destroy$),
        switchMap(params => {
          this.loading = true;
          this.errorMessage = '';
          this.detail = null;

          return this.api.getMatchDetails(params.get('id') || '');
        })
      )
      .subscribe({
        next: (res) => {
          this.detail = res?.success ? res.data : null;
          this.printPlayers();
          this.errorMessage = this.detail ? '' : 'Unable to load match details.';
          this.loading = false;
        },
        error: (err) => {
          this.detail = null;
          this.errorMessage = err?.error?.message || 'Unable to load match details.';
          this.loading = false;
        }
      });

    this.profileService.profile$
      .pipe(takeUntil(this.destroy$))
      .subscribe(profile => {
        this.coinBalance = Number(profile?.coins?.coins ?? 0);
      });

    this.profileService.loadProfile().pipe(takeUntil(this.destroy$)).subscribe();
  }

  ngOnDestroy(): void {
    this.clearToastTimer();

    if (this.navigateTimer) {
      clearTimeout(this.navigateTimer);
      this.navigateTimer = null;
    }

    this.destroy$.next();
    this.destroy$.complete();
  }

  goBack(): void {
    this.router.navigate(['/lineouts']);
  }

  startUct(detail: MatchDetail): void {
    this.hideToast();

    if (!this.isLineupAvailable(detail)) {
      return;
    }

    if (this.coinBalance <= 0) {
      this.showToast('error', 'Insufficient coins. Please top up your balance to start UCT.');
      return;
    }

    this.showToast('success', 'Balance verified. Starting UCT workflow...');
    this.navigateTimer = setTimeout(() => {
      this.router.navigate(['/lineouts/create-uct', detail.match.id]);
    }, 650);
  }

  canStartUct(detail: MatchDetail): boolean {
    return this.isLineupAvailable(detail);
  }

  remainingAfterUct(): number {
    return Math.max(0, this.coinBalance - 1);
  }

  startingPlayersCount(detail: MatchDetail): number {
    return (detail.counts.home_playing_xi || 0) + (detail.counts.away_playing_xi || 0);
  }

  isLineupAvailable(detail: MatchDetail): boolean {
    const flag = String(detail.match.lineupavailable).toLowerCase();
    const status = String(detail.match.lineup_status || '').toLowerCase();

    return flag === '1' || flag === 'true' || status === 'available' || status === 'released' || status === 'confirmed';
  }

  matchStatus(detail: MatchDetail): string {
    if (String(detail.match.status).toUpperCase() === 'LIVE') {
      return 'Live now';
    }

    return this.isLineupAvailable(detail) ? 'Lineups confirmed' : 'Waiting for lineups';
  }

  kickoffInfo(detail: MatchDetail): string {
    const status = String(detail.match.status || '').toUpperCase();

    if (status === 'LIVE') {
      return 'Live now';
    }

    const kickoffMs = new Date(detail.match.start_time).getTime();
    const diffMs = kickoffMs - Date.now();

    if (diffMs <= 0) {
      return 'Started';
    }

    const totalMinutes = Math.ceil(diffMs / 60000);
    const days = Math.floor(totalMinutes / 1440);
    const hours = Math.floor((totalMinutes % 1440) / 60);
    const minutes = totalMinutes % 60;

    if (days > 0) {
      return `Kicks off in ${days}d ${hours}h`;
    }

    if (hours > 0) {
      return `Kicks off in ${hours}h ${minutes}m`;
    }

    return `Kicks off in ${minutes}m`;
  }

  kickoffTime(detail: MatchDetail): string {
    return new Intl.DateTimeFormat('en-GB', {
      weekday: 'short',
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }).format(new Date(detail.match.start_time));
  }

  positionClass(player: MatchPlayer): string {
    return String(player.position || '').toLowerCase();
  }

  playerImage(player: MatchPlayer): string {
    return player.logo || 'assets/logo.png';
  }

  initials(player: MatchPlayer): string {
    return player.player_name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map(part => part[0])
      .join('')
      .toUpperCase() || String(player.position || '').slice(0, 2).toUpperCase();
  }

  trackPlayer(_: number, player: MatchPlayer): number {
    return player.id;
  }

  teamCount(team: MatchTeam): number {
    return (team.playing_xi?.length || 0) + (team.substitutes?.length || 0);
  }

  private printPlayers(): void {
    if (!this.detail) {
      return;
    }

    console.log('Playing team players:', {
      matchId: this.detail.match.id,
      homeTeam: this.detail.home_team.name,
      homePlayingXi: this.detail.home_team.playing_xi,
      homeSubstitutes: this.detail.home_team.substitutes,
      awayTeam: this.detail.away_team.name,
      awayPlayingXi: this.detail.away_team.playing_xi,
      awaySubstitutes: this.detail.away_team.substitutes
    });
  }

  private showToast(type: 'success' | 'error', message: string): void {
    this.toast = { type, message };
    this.clearToastTimer();
    this.toastTimer = setTimeout(() => this.hideToast(), 3500);
  }

  private hideToast(): void {
    this.toast = null;
    this.clearToastTimer();
  }

  private clearToastTimer(): void {
    if (this.toastTimer) {
      clearTimeout(this.toastTimer);
      this.toastTimer = null;
    }
  }
}
