import { Component, OnDestroy, OnInit } from '@angular/core';
import { ViewportScroller } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, switchMap, takeUntil } from 'rxjs';
import { MatchDetail, MatchPlayer, UctGeneratePayload, UctGeneratePlayer } from 'src/app/core/interfaces/content';
import { ApiService } from 'src/app/core/services/api.service';

type Mandate = 'YES' | 'NO' | 'NA';
type CaptainMode = 'CVC' | 'C_AND_VC';
type UctAlertType = 'info' | 'warning' | 'error';

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
  showGenerateConfirm = false;
  showCaptainModeConfirm = false;
  generateConsent = false;
  mandateMode: Mandate = 'NA';
  pendingCaptainMode: CaptainMode | null = null;
  uctAlert: { title: string; message: string; type: UctAlertType } | null = null;
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
    private router: Router,
    private viewportScroller: ViewportScroller
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
          this.printPlayerPools();
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
    ].filter(player => Number(player.is_substitute) === 1 && Number(player.is_playing) !== 1);
  }

  get startingPlayers(): UctPlayer[] {
    if (!this.detail) return [];
    return [
      ...this.toUctPlayers(this.detail.home_team.playing_xi, 'home'),
      ...this.toUctPlayers(this.detail.away_team.playing_xi, 'away')
    ];
  }

  get selectedSubstitutes(): UctPlayer[] {
    return this.sortPlayersByPosition(this.allSubstitutes.filter(player => this.selectedSubIds.has(player.id)));
  }

  get mandateSubstitutes(): UctPlayer[] {
    return this.selectedSubstitutes.filter(player => !this.isGoalkeeper(player));
  }

  get homeStartingPlayers(): UctPlayer[] {
    return this.sortPlayersByPosition(this.startingPlayers.filter(player => player.teamSide === 'home'));
  }

  get awayStartingPlayers(): UctPlayer[] {
    return this.sortPlayersByPosition(this.startingPlayers.filter(player => player.teamSide === 'away'));
  }

  get homeSubstitutes(): UctPlayer[] {
    return this.sortPlayersByPosition(this.allSubstitutes.filter(player => player.teamSide === 'home'));
  }

  get awaySubstitutes(): UctPlayer[] {
    return this.sortPlayersByPosition(this.allSubstitutes.filter(player => player.teamSide === 'away'));
  }

  get availablePool(): UctPlayer[] {
    return [...this.startingPlayers, ...this.selectedSubstitutes];
  }

  get homeAvailablePool(): UctPlayer[] {
    return this.sortPlayersByPosition(this.availablePool.filter(player => player.teamSide === 'home'));
  }

  get awayAvailablePool(): UctPlayer[] {
    return this.sortPlayersByPosition(this.availablePool.filter(player => player.teamSide === 'away'));
  }

  get captaincySubstitutes(): UctPlayer[] {
    return this.selectedSubstitutes.filter(player => this.mandates.get(player.id) !== 'NO');
  }

  get homeCaptaincyPlayers(): UctPlayer[] {
    return this.homeStartingPlayers.filter(player => this.mandates.get(player.id) !== 'NO');
  }

  get awayCaptaincyPlayers(): UctPlayer[] {
    return this.awayStartingPlayers.filter(player => this.mandates.get(player.id) !== 'NO');
  }

  get mandatePool(): UctPlayer[] {
    if (this.mandateMode === 'NA') return [];
    const pool = this.mandateMode === 'NO' ? this.startingPlayers : this.availablePool;
    return this.filterMandateModePlayers(pool).filter(player => !this.isGoalkeeper(player));
  }

  get homeMandatePool(): UctPlayer[] {
    return this.mandatePool.filter(player => player.teamSide === 'home');
  }

  get awayMandatePool(): UctPlayer[] {
    return this.mandatePool.filter(player => player.teamSide === 'away');
  }

  get homeMandateMainPool(): UctPlayer[] {
    return this.filterMandateModePlayers(this.homeStartingPlayers).filter(player => !this.isGoalkeeper(player));
  }

  get awayMandateMainPool(): UctPlayer[] {
    return this.filterMandateModePlayers(this.awayStartingPlayers).filter(player => !this.isGoalkeeper(player));
  }

  get mandateYesPlayers(): UctPlayer[] {
    return this.sortPlayersByPosition(this.availablePool.filter(player => this.mandates.get(player.id) === 'YES'));
  }

  get mandateNoPlayers(): UctPlayer[] {
    return this.sortPlayersByPosition(this.availablePool.filter(player => this.mandates.get(player.id) === 'NO'));
  }

  get cvcPlayers(): UctPlayer[] {
    return this.sortPlayersByPosition(this.availablePool.filter(player => this.cvcIds.has(player.id)));
  }

  get captainPlayers(): UctPlayer[] {
    return this.sortPlayersByPosition(this.availablePool.filter(player => this.captainIds.has(player.id)));
  }

  get viceCaptainPlayers(): UctPlayer[] {
    return this.sortPlayersByPosition(this.availablePool.filter(player => this.viceCaptainIds.has(player.id)));
  }

  get eligibleCvcPlayers(): UctPlayer[] {
    return this.sortPlayersByPosition(this.availablePool.filter(player => this.mandates.get(player.id) !== 'NO'));
  }

  get canReview(): boolean {
    if (this.captainMode === 'CVC') {
      return this.cvcIds.size >= this.minCvc && this.cvcIds.size <= this.maxCvc;
    }

    return this.isCandVcMatrixValid();
  }

  get canGenerate(): boolean {
    return this.canReview;
  }

  goBack(): void {
    this.router.navigate(['/lineouts']);
  }

  nextStep(): void {
    if (this.step === 2 && !this.canLeaveMandateStep()) {
      this.showAlert(
        'Mandate selection needed',
        this.mandateMode === 'YES'
          ? 'Select at least one M-YES player or switch to N/A.'
          : 'Select at least one M-NO player or switch to N/A.',
        'warning'
      );
      return;
    }

    if (this.step < 4) {
      this.setActiveStep(this.step + 1);
    }
  }

  prevStep(): void {
    if (this.step > 1) {
      this.setActiveStep(this.step - 1);
    } else {
      this.goBack();
    }
  }

  setStep(step: number): void {
    if (step <= this.step) {
      this.setActiveStep(step);
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
      this.showAlert('Substitute limit reached', 'You can select up to 3 substitute players only.', 'warning');
      return;
    }

    this.selectedSubIds.add(player.id);
  }

  isSubstituteDisabled(player: UctPlayer): boolean {
    return !this.selectedSubIds.has(player.id) && this.selectedSubIds.size >= this.maxSubs;
  }

  setMandateMode(value: Mandate): void {
    this.mandateMode = value;

    if (value === 'NA') {
      this.mandates.clear();
      this.cvcIds.clear();
      this.captainIds.clear();
      this.viceCaptainIds.clear();
    }
  }

  applyMandate(player: UctPlayer): void {
    if (this.mandateMode === 'NA') {
      return;
    }

    this.setMandate(player, this.mandateMode);
  }

  setMandate(player: UctPlayer, value: Mandate): void {
    const current = this.mandates.get(player.id) || 'NA';

    if (player.is_substitute && value === 'NO') {
      this.showAlert('Substitute cannot be M-NO', 'Only Playing XI players can be excluded with M-NO.', 'warning');
      return;
    }

    if (current === 'YES' && value === 'NO') {
      this.showAlert('Already M-YES', 'This player is already forced into all teams, so they cannot be selected as M-NO.', 'warning');
      return;
    }

    if (current === 'NO' && value === 'YES') {
      this.showAlert('Already M-NO', 'This player is already excluded, so they cannot be selected as M-YES.', 'warning');
      return;
    }

    if (current === value || value === 'NA') {
      this.mandates.delete(player.id);
      if (value === 'YES') {
        this.cvcIds.delete(player.id);
      }
      return;
    }

    if (value === 'YES' && this.mandateCount('YES') >= this.maxMandateYes) {
      this.showAlert('M-YES limit reached', 'You can force maximum 2 players into every generated team.', 'warning');
      return;
    }

    if (value === 'NO' && this.mandateCount('NO') >= this.maxMandateNo) {
      this.showAlert('M-NO limit reached', 'You can exclude maximum 2 players from generated teams.', 'warning');
      return;
    }

    if (value === 'YES' && this.isGoalkeeper(player) && this.mandateGoalkeeperCount('YES') >= 1) {
      this.showAlert('GK M-YES limit', 'Only one goalkeeper can be selected as M-YES.', 'warning');
      return;
    }

    if (value === 'NO' && this.isGoalkeeper(player) && this.mandateGoalkeeperCount('NO') >= 1) {
      this.showAlert('GK M-NO limit', 'Only one goalkeeper can be selected as M-NO.', 'warning');
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
      this.showAlert('Player excluded', 'M-NO players cannot be used for captaincy.', 'warning');
      return;
    }

    if (this.cvcIds.has(player.id)) {
      this.cvcIds.delete(player.id);
      return;
    }

    if (this.cvcIds.size >= this.maxCvc) {
      this.showAlert('CVC limit reached', 'CVC mode allows minimum 2 and maximum 4 selected players.', 'warning');
      return;
    }

    this.cvcIds.add(player.id);
  }

  canSelectCvc(player: UctPlayer): boolean {
    if (this.cvcIds.has(player.id)) return true;
    if (this.mandates.get(player.id) === 'NO') return false;
    return this.cvcIds.size < this.maxCvc;
  }

  setCaptainMode(mode: CaptainMode): void {
    if (this.captainMode === mode) {
      return;
    }

    if (this.cvcIds.size || this.captainIds.size || this.viceCaptainIds.size) {
      this.pendingCaptainMode = mode;
      this.showCaptainModeConfirm = true;
      return;
    }

    this.applyCaptainMode(mode);
  }

  toggleCaptain(player: UctPlayer): void {
    if (this.mandates.get(player.id) === 'NO') {
      this.showAlert('Player excluded', 'M-NO players cannot be selected as Captain.', 'warning');
      return;
    }
    if (this.viceCaptainIds.has(player.id)) {
      this.showAlert('Already Vice-Captain', 'A player cannot be both Captain and Vice-Captain.', 'warning');
      return;
    }

    if (this.captainIds.has(player.id)) {
      this.captainIds.delete(player.id);
      return;
    }

    if (this.captainIds.size >= this.maxCaptains) {
      this.showAlert('Captain limit reached', 'C & VC mode allows maximum 4 Captains.', 'warning');
      return;
    }
    if (this.viceCaptainIds.size > this.maxViceForCaptainCount(this.captainIds.size + 1)) {
      this.showAlert('Adjust VC count first', 'This Captain count would exceed the allowed VC matrix.', 'warning');
      return;
    }

    this.captainIds.add(player.id);
  }

  toggleViceCaptain(player: UctPlayer): void {
    if (this.mandates.get(player.id) === 'NO') {
      this.showAlert('Player excluded', 'M-NO players cannot be selected as Vice-Captain.', 'warning');
      return;
    }
    if (this.captainIds.has(player.id)) {
      this.showAlert('Already Captain', 'A player cannot be both Captain and Vice-Captain.', 'warning');
      return;
    }
    if (!this.captainIds.size) {
      this.showAlert('Select Captain first', 'Choose 1-4 Captains before assigning Vice-Captains.', 'warning');
      return;
    }

    if (this.viceCaptainIds.has(player.id)) {
      this.viceCaptainIds.delete(player.id);
      return;
    }

    if (this.viceCaptainIds.size >= this.maxViceForCurrentCaptains()) {
      this.showAlert('VC limit reached', `With ${this.captainIds.size} Captain(s), you can select ${this.maxViceForCurrentCaptains()} VC only.`, 'warning');
      return;
    }

    this.viceCaptainIds.add(player.id);
  }

  isCandVcMatrixValid(): boolean {
    const captainCount = this.captainIds.size;
    const viceCount = this.viceCaptainIds.size;

    return viceCount >= this.minViceForCaptainCount(captainCount)
      && viceCount <= this.maxViceForCaptainCount(captainCount);
  }

  canSelectCaptain(player: UctPlayer): boolean {
    if (this.captainIds.has(player.id)) return true;
    if (this.mandates.get(player.id) === 'NO') return false;
    if (this.viceCaptainIds.has(player.id)) return false;
    if (this.captainIds.size >= this.maxCaptains) return false;

    return this.viceCaptainIds.size <= this.maxViceForCaptainCount(this.captainIds.size + 1);
  }

  canSelectViceCaptain(player: UctPlayer): boolean {
    if (this.viceCaptainIds.has(player.id)) return true;
    if (this.mandates.get(player.id) === 'NO') return false;
    if (this.captainIds.has(player.id)) return false;

    return this.viceCaptainIds.size < this.maxViceForCurrentCaptains();
  }

  canLeaveMandateStep(): boolean {
    if (this.mandateMode === 'NA') return true;
    if (this.mandateMode === 'YES') return this.mandateYesPlayers.length > 0;
    return this.mandateNoPlayers.length > 0;
  }

  isMandatePlayerDisabled(player: UctPlayer): boolean {
    if (this.mandateMode === 'NA') return true;
    if (this.mandateOf(player) === this.mandateMode) return false;
    if (this.mandateMode === 'YES' && this.mandateOf(player) === 'NO') return true;
    if (this.mandateMode === 'NO' && this.mandateOf(player) === 'YES') return true;
    if (this.mandateMode === 'NO' && player.is_substitute) return true;
    if (this.mandateMode === 'YES' && this.mandateCount('YES') >= this.maxMandateYes) return true;
    if (this.mandateMode === 'NO' && this.mandateCount('NO') >= this.maxMandateNo) return true;
    if (this.isGoalkeeper(player) && this.mandateGoalkeeperCount(this.mandateMode) >= 1) return true;
    return false;
  }

  maxViceForCurrentCaptains(): number {
    return this.maxViceForCaptainCount(this.captainIds.size);
  }

  minViceForCurrentCaptains(): number {
    return this.minViceForCaptainCount(this.captainIds.size);
  }

  private maxViceForCaptainCount(captainCount: number): number {
    if (captainCount === 1) return 5;
    if (captainCount === 2) return 4;
    if (captainCount === 3) return 3;
    if (captainCount === 4) return 2;

    return 0;
  }

  private minViceForCaptainCount(captainCount: number): number {
    return captainCount >= 1 && captainCount <= 4 ? 2 : 0;
  }

  captaincyHint(): string {
    if (this.captainMode === 'CVC') {
      return this.canReview ? 'CVC pool ready.' : `Select ${this.minCvc}-${this.maxCvc} CVC players.`;
    }

    if (this.canReview) {
      return 'C & VC matrix ready.';
    }

    if (!this.captainIds.size) {
      return 'Select 1-4 Captains first, then choose Vice-Captains.';
    }

    return `Need ${this.minViceForCurrentCaptains()}-${this.maxViceForCurrentCaptains()} VC for ${this.captainIds.size} Captain(s).`;
  }

  generateTeams(): void {
    if (!this.canGenerate) {
      return;
    }

    this.generateConsent = false;
    this.showGenerateConfirm = true;
  }

  closeGenerateConfirm(): void {
    if (this.submitting) {
      return;
    }

    this.showGenerateConfirm = false;
  }

  closeCaptainModeConfirm(): void {
    this.showCaptainModeConfirm = false;
    this.pendingCaptainMode = null;
  }

  confirmCaptainModeSwitch(): void {
    if (!this.pendingCaptainMode) {
      return;
    }

    this.applyCaptainMode(this.pendingCaptainMode);
    this.closeCaptainModeConfirm();
  }

  closeAlert(): void {
    this.uctAlert = null;
  }

  confirmGenerateTeams(): void {
    if (!this.canGenerate) {
      return;
    }

    if (!this.generateConsent) {
      this.showAlert(
        'Confirmation required',
        'Please accept the user responsibility notice before creating UCT teams.',
        'warning'
      );
      return;
    }

    this.showGenerateConfirm = false;
    this.submitUctConfiguration();
  }

  submitUctConfiguration(): void {
    if (!this.canGenerate || this.submitting) {
      return;
    }

    this.submitting = true;
    this.submitError = '';
    this.setActiveStep(6);
    this.startGeneratingStatus();

    const payload = this.buildSubmitPayload();
    console.log('Generate UCT request payload:', payload);
    console.log('Generate UCT request payload JSON:', JSON.stringify(payload, null, 2));

    this.api.createUctTeams(payload)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          console.log('Generate UCT backend response:', res);
          this.stopGeneratingStatus();
          this.submitting = false;

          if (res?.success !== false) {
            this.router.navigate(['/user/profile'], { queryParams: { tab: 'teams', match: this.matchId, generated: 'success' } });
            return;
          }

          this.resetAfterSubmitFailure(res?.message || 'Unable to generate UCT teams. Please try again.');
        },
        error: (err) => {
          console.error('Generate UCT backend error:', err);
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
    this.setActiveStep(5);
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

  playerImage(player: UctPlayer): string {
    return player.logo || 'assets/logo.png';
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
      team_a: this.homeAvailablePool.map(player => this.toGeneratePlayer(player)),
      team_b: this.awayAvailablePool.map(player => this.toGeneratePlayer(player))
    };
  }

  private toGeneratePlayer(player: UctPlayer): UctGeneratePlayer {
    const payload: UctGeneratePlayer = {
      name: player.player_name,
      role: player.position
    };
    const mandate = this.mandates.get(player.id);

    if (mandate === 'YES' || mandate === 'NO') {
      payload.mandate = mandate;
    }

    if (this.captainMode === 'CVC' && this.cvcIds.has(player.id)) {
      payload.captain = 'CVC';
    }

    if (this.captainMode === 'C_AND_VC' && this.captainIds.has(player.id)) {
      payload.captain = 'C';
    }

    if (this.captainMode === 'C_AND_VC' && this.viceCaptainIds.has(player.id)) {
      payload.captain = 'VC';
    }

    return payload;
  }

  private applyCaptainMode(mode: CaptainMode): void {
    this.captainMode = mode;
    this.cvcIds.clear();
    this.captainIds.clear();
    this.viceCaptainIds.clear();
  }

  private showAlert(title: string, message: string, type: UctAlertType): void {
    this.uctAlert = { title, message, type };
  }

  private setActiveStep(step: number): void {
    this.step = step;
    this.scrollToTop();
  }

  private scrollToTop(): void {
    setTimeout(() => this.viewportScroller.scrollToPosition([0, 0]));
  }

  private isGoalkeeper(player: UctPlayer): boolean {
    return String(player.position || '').toUpperCase() === 'GK';
  }

  private mandateGoalkeeperCount(value: Exclude<Mandate, 'NA'>): number {
    return this.availablePool.filter(player => this.mandates.get(player.id) === value && this.isGoalkeeper(player)).length;
  }

  private mandateCount(value: Exclude<Mandate, 'NA'>): number {
    return Array.from(this.mandates.values()).filter(mandate => mandate === value).length;
  }

  private filterMandateModePlayers(players: UctPlayer[]): UctPlayer[] {
    if (this.mandateMode === 'YES') {
      return players.filter(player => this.mandates.get(player.id) !== 'NO');
    }

    if (this.mandateMode === 'NO') {
      return players.filter(player => this.mandates.get(player.id) !== 'YES');
    }

    return players;
  }

  private resetAfterSubmitFailure(message: string): void {
    this.submitError = message;
    this.setActiveStep(1);
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
    this.ensurePositionCount(team, selectedIds, 'DEF', 2, fullPool);
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

  private printPlayerPools(): void {
    if (!this.detail) {
      return;
    }

    console.log('Create UCT player pools:', {
      matchId: this.detail.match.id,
      homeTeam: this.detail.home_team.name,
      homePlayingXi: this.detail.home_team.playing_xi,
      homeSubstitutes: this.detail.home_team.substitutes,
      homeAvailablePool: this.homeAvailablePool,
      awayTeam: this.detail.away_team.name,
      awayPlayingXi: this.detail.away_team.playing_xi,
      awaySubstitutes: this.detail.away_team.substitutes,
      awayAvailablePool: this.awayAvailablePool
    });
  }

  private toUctPlayers(players: MatchPlayer[] | null | undefined, side: 'home' | 'away'): UctPlayer[] {
    const detail = this.detail;
    const teamShort = side === 'home' ? detail?.home_team.short_name : detail?.away_team.short_name;

    return (Array.isArray(players) ? players : []).map(player => ({
      ...player,
      teamSide: side,
      teamShort: teamShort || side.toUpperCase()
    }));
  }

  private sortPlayersByPosition(players: UctPlayer[]): UctPlayer[] {
    const order: Record<string, number> = {
      GK: 1,
      DEF: 2,
      MID: 3,
      FWD: 4
    };

    return [...players].sort((a, b) => {
      const posA = order[String(a.position || '').toUpperCase()] || 99;
      const posB = order[String(b.position || '').toUpperCase()] || 99;

      if (posA !== posB) {
        return posA - posB;
      }

      return String(a.player_name || '').localeCompare(String(b.player_name || ''));
    });
  }
}
