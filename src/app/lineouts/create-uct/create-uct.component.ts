import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, switchMap, takeUntil } from 'rxjs';
import { MatchDetail, MatchPlayer, UctGeneratePayload } from 'src/app/core/interfaces/content';
import { ApiService } from 'src/app/core/services/api.service';

type Mandate = 'YES' | 'NO' | 'NA';
type CaptainMode = 'CVC' | 'C_AND_VC';

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
  private generatingStatusTimer: ReturnType<typeof setInterval> | null = null;

  matchId = '';
  loading = true;
  errorMessage = '';
  detail: MatchDetail | null = null;
  step = 1;
  confirmed = false;
  submitting = false;
  submitError = '';
  generationStatus = 'Resolving constraints - applying mandates - computing splits';
  readonly generationMessages = [
    'Resolving constraints - applying mandates - computing splits',
    'Building formation distributions - 4-7 - 5-6 - 6-5 - 7-4',
    'Optimising captaincy - validating position counts',
    'Finalising 20 structured lineups...'
  ];

  selectedSubIds = new Set<number>();
  mandates = new Map<number, Mandate>();
  captainMode: CaptainMode = 'CVC';
  cvcIds = new Set<number>();
  captainIds = new Set<number>();
  viceCaptainIds = new Set<number>();
  generatedTeams: GeneratedTeam[] = [];

  readonly maxSubs = 3;
  readonly maxMandateYes = 2;
  readonly maxMandateNo = 2;
  readonly maxCvc = 4;
  readonly minCvc = 2;
  readonly maxCaptains = 4;
  readonly maxViceCaptains = 5;

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
    this.stopGeneratingStatus();
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

  get homeSubstitutes(): UctPlayer[] {
    return this.allSubstitutes.filter(player => player.teamSide === 'home');
  }

  get awaySubstitutes(): UctPlayer[] {
    return this.allSubstitutes.filter(player => player.teamSide === 'away');
  }

  get availablePool(): UctPlayer[] {
    return [...this.startingPlayers, ...this.selectedSubstitutes];
  }

  get homeAvailablePool(): UctPlayer[] {
    return this.availablePool.filter(player => player.teamSide === 'home');
  }

  get awayAvailablePool(): UctPlayer[] {
    return this.availablePool.filter(player => player.teamSide === 'away');
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

  get captainPlayers(): UctPlayer[] {
    return this.availablePool.filter(player => this.captainIds.has(player.id));
  }

  get viceCaptainPlayers(): UctPlayer[] {
    return this.availablePool.filter(player => this.viceCaptainIds.has(player.id));
  }

  get eligibleCvcPlayers(): UctPlayer[] {
    return this.availablePool.filter(player => this.mandates.get(player.id) !== 'NO');
  }

  get canReview(): boolean {
    if (this.captainMode === 'CVC') {
      return this.cvcIds.size >= this.minCvc && this.cvcIds.size <= this.maxCvc;
    }

    return this.isCandVcMatrixValid();
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
    if (step <= this.step) {
      this.step = step;
    }
  }

  toggleSubstitute(player: UctPlayer): void {
    if (this.selectedSubIds.has(player.id)) {
      this.selectedSubIds.delete(player.id);
      this.mandates.delete(player.id);
      this.cvcIds.delete(player.id);
      this.captainIds.delete(player.id);
      this.viceCaptainIds.delete(player.id);
      return;
    }

    if (this.selectedSubIds.size >= this.maxSubs) {
      return;
    }

    this.selectedSubIds.add(player.id);
  }

  setMandate(player: UctPlayer, value: Mandate): void {
    if (player.is_substitute && value === 'NO') {
      return;
    }

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
      this.captainIds.delete(player.id);
      this.viceCaptainIds.delete(player.id);
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

  setCaptainMode(mode: CaptainMode): void {
    this.captainMode = mode;
  }

  toggleCaptain(player: UctPlayer): void {
    if (this.mandates.get(player.id) === 'NO') return;

    if (this.captainIds.has(player.id)) {
      this.captainIds.delete(player.id);
      return;
    }

    if (this.captainIds.size >= this.maxCaptains) return;

    this.captainIds.add(player.id);
    this.viceCaptainIds.delete(player.id);
  }

  toggleViceCaptain(player: UctPlayer): void {
    if (this.mandates.get(player.id) === 'NO') return;

    if (this.viceCaptainIds.has(player.id)) {
      this.viceCaptainIds.delete(player.id);
      return;
    }

    if (this.viceCaptainIds.size >= this.maxViceCaptains) return;

    this.viceCaptainIds.add(player.id);
    this.captainIds.delete(player.id);
  }

  isCandVcMatrixValid(): boolean {
    const captainCount = this.captainIds.size;
    const viceCount = this.viceCaptainIds.size;

    if (captainCount === 1) return viceCount >= 2 && viceCount <= 5;
    if (captainCount === 2) return viceCount >= 2 && viceCount <= 4;
    if (captainCount === 3) return viceCount >= 2 && viceCount <= 3;
    if (captainCount === 4) return viceCount === 2;

    return false;
  }

  captaincyHint(): string {
    if (this.captainMode === 'CVC') {
      return this.canReview ? 'CVC pool ready.' : 'Select 2-4 CVC players to continue.';
    }

    if (this.canReview) {
      return 'C & VC matrix ready.';
    }

    return 'Valid matrix: 1C x 2-5VC, 2C x 2-4VC, 3C x 2-3VC, or 4C x 2VC.';
  }

  generateTeams(): void {
    if (!this.canGenerate) {
      return;
    }

    this.submitUctConfiguration();
  }

  submitUctConfiguration(): void {
    if (!this.canGenerate || this.submitting) {
      return;
    }

    this.submitting = true;
    this.submitError = '';
    this.step = 6;
    this.startGeneratingStatus();

    this.api.createUctTeams(this.buildSubmitPayload())
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.stopGeneratingStatus();
          this.submitting = false;

          if (res?.success !== false) {
            this.router.navigate(['/user/myteams'], { queryParams: { match: this.matchId, generated: 'success' } });
            return;
          }

          this.resetAfterSubmitFailure(res?.message || 'Unable to generate UCT teams. Please try again.');
        },
        error: (err) => {
          this.stopGeneratingStatus();
          this.submitting = false;
          this.resetAfterSubmitFailure(err?.error?.message || err?.error?.error || 'Unable to generate UCT teams. Please try again.');
        }
      });
  }

  generatePreviewTeams(): void {
    if (!this.canGenerate) {
      return;
    }

    const splits = ['4-7', '5-6', '6-5', '7-4'];
    const teams: GeneratedTeam[] = [];

    for (let i = 0; i < 20; i++) {
      const split = splits[Math.floor(i / 5)];
      const [homeCount] = split.split('-').map(Number);
      const players = this.buildTeam(i, homeCount);
      const captainPool = this.captainMode === 'CVC' ? this.cvcPlayers : this.captainPlayers;
      const vicePool = this.captainMode === 'CVC' ? this.cvcPlayers : this.viceCaptainPlayers;
      const captain = captainPool[i % captainPool.length] || players[0];
      const preferredVice = vicePool[(i + 1) % vicePool.length] || players[1] || players[0];
      const viceCaptain = preferredVice.id === captain.id
        ? (vicePool.find(player => player.id !== captain.id) || players.find(player => player.id !== captain.id) || captain)
        : preferredVice;
      const finalPlayers = this.ensureCaptaincyPlayers(players, captain, viceCaptain);

      teams.push({
        index: i + 1,
        split,
        players: finalPlayers,
        captain,
        viceCaptain
      });
    }

    this.generatedTeams = teams;
    this.step = 5;
  }

  positionClass(player: UctPlayer): string {
    return String(player.position || '').toLowerCase();
  }

  initials(player: UctPlayer): string {
    return player.player_name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map(part => part[0])
      .join('')
      .toUpperCase() || player.teamShort.slice(0, 2).toUpperCase();
  }

  trackPlayer(_: number, player: UctPlayer): number {
    return player.id;
  }

  trackTeam(_: number, team: GeneratedTeam): number {
    return team.index;
  }

  private buildSubmitPayload(): UctGeneratePayload {
    return {
      match_id: this.matchId,
      substitute_player_ids: Array.from(this.selectedSubIds),
      mandate_yes_player_ids: this.mandateYesPlayers.map(player => player.id),
      mandate_no_player_ids: this.mandateNoPlayers.map(player => player.id),
      captain_mode: this.captainMode,
      cvc_player_ids: Array.from(this.cvcIds),
      captain_player_ids: Array.from(this.captainIds),
      vice_captain_player_ids: Array.from(this.viceCaptainIds),
      selected_player_ids: this.availablePool.map(player => player.id)
    };
  }

  private resetAfterSubmitFailure(message: string): void {
    this.submitError = message;
    this.step = 1;
    this.confirmed = false;
    this.generatedTeams = [];
  }

  private startGeneratingStatus(): void {
    this.stopGeneratingStatus();
    let index = 0;
    this.generationStatus = this.generationMessages[index];
    this.generatingStatusTimer = setInterval(() => {
      index = (index + 1) % this.generationMessages.length;
      this.generationStatus = this.generationMessages[index];
    }, 750);
  }

  private stopGeneratingStatus(): void {
    if (this.generatingStatusTimer) {
      clearInterval(this.generatingStatusTimer);
      this.generatingStatusTimer = null;
    }
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

  private ensureCaptaincyPlayers(players: UctPlayer[], captain: UctPlayer, viceCaptain: UctPlayer): UctPlayer[] {
    const finalPlayers = [...players];
    this.forcePlayerIntoTeam(finalPlayers, captain);
    this.forcePlayerIntoTeam(finalPlayers, viceCaptain);
    return finalPlayers;
  }

  private forcePlayerIntoTeam(players: UctPlayer[], requiredPlayer: UctPlayer): void {
    if (players.some(player => player.id === requiredPlayer.id)) {
      return;
    }

    const protectedIds = new Set([
      ...this.mandateYesPlayers.map(player => player.id),
      ...this.mandateNoPlayers.map(player => player.id)
    ]);
    let replaceIndex = players.findIndex(player => !protectedIds.has(player.id) && player.teamSide === requiredPlayer.teamSide && player.position === requiredPlayer.position);

    if (replaceIndex < 0) {
      replaceIndex = players.findIndex(player => !protectedIds.has(player.id));
    }

    if (replaceIndex >= 0) {
      players[replaceIndex] = requiredPlayer;
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
