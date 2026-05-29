import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, switchMap, takeUntil } from 'rxjs';
import { MatchDetail, MatchPlayer } from 'src/app/core/interfaces/content';
import { ApiService } from 'src/app/core/services/api.service';

type Mandate = 'YES' | 'NO' | 'NA';

interface UctPlayer extends MatchPlayer {
  teamSide: 'home' | 'away';
  teamShort: string;
}

interface GeneratedTeam {
  index: number;
  split: string;
  players: UctPlayer[];
  captain: UctPlayer;
  viceCaptain: UctPlayer;
}

@Component({
  selector: 'app-create-uct',
  templateUrl: './create-uct.component.html',
  styleUrls: ['./create-uct.component.css']
})
export class CreateUctComponent implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();

  matchId = '';
  loading = true;
  errorMessage = '';
  detail: MatchDetail | null = null;
  step = 1;
  confirmed = false;

  selectedSubIds = new Set<number>();
  mandates = new Map<number, Mandate>();
  cvcIds = new Set<number>();
  generatedTeams: GeneratedTeam[] = [];

  readonly maxSubs = 3;
  readonly maxMandateYes = 2;
  readonly maxMandateNo = 2;
  readonly maxCvc = 4;
  readonly minCvc = 2;

  constructor(
    private api: ApiService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.route.paramMap
      .pipe(
        takeUntil(this.destroy$),
        switchMap(params => {
          this.matchId = params.get('id') || '';
          this.loading = true;
          this.errorMessage = '';
          return this.api.getMatchDetails(this.matchId);
        })
      )
      .subscribe({
        next: (res) => {
          this.detail = res?.success ? res.data : null;
          this.loading = false;
          this.errorMessage = this.detail ? '' : 'Unable to load UCT match data.';
        },
        error: (err) => {
          this.detail = null;
          this.loading = false;
          this.errorMessage = err?.error?.message || 'Unable to load UCT match data.';
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get allSubstitutes(): UctPlayer[] {
    if (!this.detail) return [];
    return [
      ...this.toUctPlayers(this.detail.home_team.substitutes, 'home'),
      ...this.toUctPlayers(this.detail.away_team.substitutes, 'away')
    ];
  }

  get startingPlayers(): UctPlayer[] {
    if (!this.detail) return [];
    return [
      ...this.toUctPlayers(this.detail.home_team.playing_xi, 'home'),
      ...this.toUctPlayers(this.detail.away_team.playing_xi, 'away')
    ];
  }

  get selectedSubstitutes(): UctPlayer[] {
    return this.allSubstitutes.filter(player => this.selectedSubIds.has(player.id));
  }

  get availablePool(): UctPlayer[] {
    return [...this.startingPlayers, ...this.selectedSubstitutes];
  }

  get mandateYesPlayers(): UctPlayer[] {
    return this.availablePool.filter(player => this.mandates.get(player.id) === 'YES');
  }

  get mandateNoPlayers(): UctPlayer[] {
    return this.availablePool.filter(player => this.mandates.get(player.id) === 'NO');
  }

  get cvcPlayers(): UctPlayer[] {
    return this.availablePool.filter(player => this.cvcIds.has(player.id));
  }

  get eligibleCvcPlayers(): UctPlayer[] {
    return this.availablePool.filter(player => this.mandates.get(player.id) !== 'NO');
  }

  get canReview(): boolean {
    return this.cvcIds.size >= this.minCvc && this.cvcIds.size <= this.maxCvc;
  }

  get canGenerate(): boolean {
    return this.confirmed && this.canReview;
  }

  goBack(): void {
    this.router.navigate(['/lineouts/matches', this.matchId]);
  }

  nextStep(): void {
    if (this.step < 4) {
      this.step++;
    }
  }

  prevStep(): void {
    if (this.step > 1) {
      this.step--;
    } else {
      this.goBack();
    }
  }

  setStep(step: number): void {
    if (step <= this.step || step <= 4) {
      this.step = step;
    }
  }

  toggleSubstitute(player: UctPlayer): void {
    if (this.selectedSubIds.has(player.id)) {
      this.selectedSubIds.delete(player.id);
      this.mandates.delete(player.id);
      this.cvcIds.delete(player.id);
      return;
    }

    if (this.selectedSubIds.size >= this.maxSubs) {
      return;
    }

    this.selectedSubIds.add(player.id);
  }

  setMandate(player: UctPlayer, value: Mandate): void {
    const current = this.mandates.get(player.id) || 'NA';

    if (current === value || value === 'NA') {
      this.mandates.delete(player.id);
      return;
    }

    if (value === 'YES' && this.mandateYesPlayers.length >= this.maxMandateYes) {
      return;
    }

    if (value === 'NO' && this.mandateNoPlayers.length >= this.maxMandateNo) {
      return;
    }

    this.mandates.set(player.id, value);

    if (value === 'NO') {
      this.cvcIds.delete(player.id);
    }
  }

  mandateOf(player: UctPlayer): Mandate {
    return this.mandates.get(player.id) || 'NA';
  }

  toggleCvc(player: UctPlayer): void {
    if (this.mandates.get(player.id) === 'NO') {
      return;
    }

    if (this.cvcIds.has(player.id)) {
      this.cvcIds.delete(player.id);
      return;
    }

    if (this.cvcIds.size >= this.maxCvc) {
      return;
    }

    this.cvcIds.add(player.id);
  }

  generateTeams(): void {
    if (!this.canGenerate) {
      return;
    }

    const splits = ['4-7', '5-6', '6-5', '7-4'];
    const teams: GeneratedTeam[] = [];

    for (let i = 0; i < 20; i++) {
      const split = splits[Math.floor(i / 5)];
      const [homeCount] = split.split('-').map(Number);
      const players = this.buildTeam(i, homeCount);
      const captain = this.cvcPlayers[i % this.cvcPlayers.length] || players[0];
      const viceCaptain = this.cvcPlayers[(i + 1) % this.cvcPlayers.length] || players[1] || players[0];

      teams.push({
        index: i + 1,
        split,
        players,
        captain,
        viceCaptain: viceCaptain.id === captain.id ? (players.find(player => player.id !== captain.id) || captain) : viceCaptain
      });
    }

    this.generatedTeams = teams;
    this.step = 5;
  }

  positionClass(player: UctPlayer): string {
    return String(player.position || '').toLowerCase();
  }

  trackPlayer(_: number, player: UctPlayer): number {
    return player.id;
  }

  trackTeam(_: number, team: GeneratedTeam): number {
    return team.index;
  }

  private buildTeam(seed: number, targetHomeCount: number): UctPlayer[] {
    const mandateYes = this.mandateYesPlayers;
    const excludedIds = new Set(this.mandateNoPlayers.map(player => player.id));
    const selectedIds = new Set<number>();
    const team: UctPlayer[] = [];

    mandateYes.forEach(player => this.addUnique(team, selectedIds, player));

    const targetAwayCount = 11 - targetHomeCount;
    const homePool = this.rotated(this.availablePool.filter(player => player.teamSide === 'home' && !excludedIds.has(player.id)), seed);
    const awayPool = this.rotated(this.availablePool.filter(player => player.teamSide === 'away' && !excludedIds.has(player.id)), seed + 3);
    const fullPool = this.rotated(this.availablePool.filter(player => !excludedIds.has(player.id)), seed + 7);

    this.ensurePosition(team, selectedIds, 'GK', fullPool);
    this.ensurePositionCount(team, selectedIds, 'DEF', 3, fullPool);
    this.ensurePositionCount(team, selectedIds, 'MID', 2, fullPool);
    this.ensurePositionCount(team, selectedIds, 'FWD', 1, fullPool);
    this.fillSide(team, selectedIds, 'home', targetHomeCount, homePool);
    this.fillSide(team, selectedIds, 'away', targetAwayCount, awayPool);
    this.fillTeam(team, selectedIds, fullPool);

    return team.slice(0, 11);
  }

  private ensurePosition(team: UctPlayer[], selectedIds: Set<number>, position: string, pool: UctPlayer[]): void {
    if (team.some(player => player.position === position)) {
      return;
    }

    const player = pool.find(item => item.position === position && !selectedIds.has(item.id));
    if (player) this.addUnique(team, selectedIds, player);
  }

  private ensurePositionCount(team: UctPlayer[], selectedIds: Set<number>, position: string, count: number, pool: UctPlayer[]): void {
    while (team.filter(player => player.position === position).length < count) {
      const player = pool.find(item => item.position === position && !selectedIds.has(item.id));
      if (!player) return;
      this.addUnique(team, selectedIds, player);
    }
  }

  private fillSide(team: UctPlayer[], selectedIds: Set<number>, side: 'home' | 'away', count: number, pool: UctPlayer[]): void {
    while (team.filter(player => player.teamSide === side).length < count && team.length < 11) {
      const player = pool.find(item => !selectedIds.has(item.id));
      if (!player) return;
      this.addUnique(team, selectedIds, player);
    }
  }

  private fillTeam(team: UctPlayer[], selectedIds: Set<number>, pool: UctPlayer[]): void {
    while (team.length < 11) {
      const player = pool.find(item => !selectedIds.has(item.id));
      if (!player) return;
      this.addUnique(team, selectedIds, player);
    }
  }

  private addUnique(team: UctPlayer[], selectedIds: Set<number>, player: UctPlayer): void {
    if (!selectedIds.has(player.id) && team.length < 11) {
      team.push(player);
      selectedIds.add(player.id);
    }
  }

  private rotated(players: UctPlayer[], seed: number): UctPlayer[] {
    if (!players.length) return [];
    const offset = seed % players.length;
    return [...players.slice(offset), ...players.slice(0, offset)];
  }

  private toUctPlayers(players: MatchPlayer[], side: 'home' | 'away'): UctPlayer[] {
    const detail = this.detail;
    const teamShort = side === 'home' ? detail?.home_team.short_name : detail?.away_team.short_name;

    return (players || []).map(player => ({
      ...player,
      teamSide: side,
      teamShort: teamShort || side.toUpperCase()
    }));
  }
}
