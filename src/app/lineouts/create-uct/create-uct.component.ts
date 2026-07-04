import { Component, HostListener, OnDestroy, OnInit } from '@angular/core';
import { ViewportScroller } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, switchMap, takeUntil } from 'rxjs';
import { MatchDetail, MatchPlayer, UctGeneratePayload, UctGeneratePlayer } from 'src/app/core/interfaces/content';
import { ApiService } from 'src/app/core/services/api.service';

type Mandate = 'YES' | 'NO' | 'NA';
type UctAlertType = 'info' | 'warning' | 'error';
type DistributionMode = 'AUTO' | 'CUSTOM';
type FantasyPlatform = 'sorare' | 'draftkings' | 'fanduel';

interface UctPlayer extends MatchPlayer {
  teamSide: 'home' | 'away';
  teamShort: string;
}

interface GeneratedTeam {
  index: number;
  split: string;
  players: UctPlayer[];
  captain: UctPlayer;
}

interface CreateUctContext {
  id?: string;
  venue?: string;
  venue_name?: string;
  venue_city?: string;
}

@Component({
  selector: 'app-create-uct',
  templateUrl: './create-uct.component.html',
  styleUrls: ['./create-uct.component.css']
})
export class CreateUctComponent implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();
  private generatingStatusTimer: ReturnType<typeof setInterval> | null = null;
  private matchStatusTimer: ReturnType<typeof setInterval> | null = null;

  matchId = '';
  loading = true;
  errorMessage = '';
  detail: MatchDetail | null = null;
  private createUctContext: CreateUctContext | null = null;
  step = 0;
  selectedPlatform: FantasyPlatform | null = null;
  confirmed = false;
  submitting = false;
  submitError = '';
  showGenerateConfirm = false;
  showPlayingXi = true;
  showSubstitutes = false;
  showMatchStartedModal = false;
  generateConsent = false;
  mandateMode: Mandate = 'NA';
  uctAlert: { title: string; message: string; type: UctAlertType } | null = null;
  generationStatus = 'Resolving Sorare rules - applying mandates - computing splits';
  readonly generationMessages = [
  'Applying your Sorare configuration...',
  'Processing selected My Squad players...',
  'Building valid 5-card combinations...',
  'Assigning Captain Pool rotations...',
  'Checking duplicate teams...',
  'Validating all Sorare rules...',
  'Finalising your 20 teams...'
  ];

  selectedStartingIds = new Set<number>();
  selectedSubIds = new Set<number>();
  mandates = new Map<number, Mandate>();
  captainIds = new Set<number>();
  distributionMode: DistributionMode = 'AUTO';
  selectedCombinationKeys = new Set<string>();
  generatedTeams: GeneratedTeam[] = [];
  salaries = new Map<number, string>();

  readonly maxSubs = 3;
  readonly maxMandateYes = 1;
  readonly maxMandateNo = 2;
  readonly maxCaptainPool = 6;
  readonly minCaptainPool = 2;
  readonly minSquad = 10;
  readonly maxSquad = 22;
  readonly teamSize = 5;
  readonly platforms: Array<{
    id: FantasyPlatform;
    name: string;
    icon: string;
    teamLabel: string;
    salaryLabel: string;
    captainLabel: string;
    capText: string;
    summary: string;
  }> = [
    {
      id: 'sorare',
      name: 'Sorare',
      icon: 'sports_soccer',
      teamLabel: '5 Player Teams',
      salaryLabel: 'No Salary Cap',
      captainLabel: 'Captain Mode',
      capText: 'Current Sorare rules',
      summary: 'No salary entry. Existing PICK2WIN Sorare rules remain unchanged.'
    },
    {
      id: 'draftkings',
      name: 'DraftKings',
      icon: 'emoji_events',
      teamLabel: '8 Player Teams',
      salaryLabel: '$50,000 Salary Cap',
      captainLabel: 'No Captain',
      capText: 'GK 1, DEF 2, MID 2, FWD 2, UTIL 1',
      summary: 'Enter official DraftKings 5-digit salary for every selected player.'
    },
    {
      id: 'fanduel',
      name: 'FanDuel',
      icon: 'shield',
      teamLabel: '7 Player Teams',
      salaryLabel: '100 Salary Units',
      captainLabel: 'No Captain',
      capText: 'GK 1, DEF 2, FWD/MID 4',
      summary: 'Enter official FanDuel 2-digit salary for every selected player.'
    }
  ];
  readonly singleGoalkeeperMandateMessage = 'Your squad contains only one Goalkeeper. This Goalkeeper will automatically appear in all generated teams. Selecting it as M-YES is not required.';
  readonly teamCombinationOptions = [
    { home: 4, away: 1 },
    { home: 3, away: 2 },
    { home: 2, away: 3 },
    { home: 1, away: 4 }
  ];
  readonly positionLimits: Record<string, { min: number; max: number }> = {
    GK: { min: 1, max: 1 },
    DEF: { min: 1, max: 2 },
    MID: { min: 1, max: 2 },
    FWD: { min: 1, max: 2 }
  };

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
          this.createUctContext = this.getCreateUctContext(this.matchId);
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
          this.resetUctSelections();
          this.printPlayerPools();
          this.handleMatchAvailability(this.detail);
          this.startMatchStatusPolling();
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
    this.stopMatchStatusPolling();
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

  get selectedStartingPlayers(): UctPlayer[] {
    return this.sortPlayersByPosition(this.startingPlayers.filter(player => this.selectedStartingIds.has(player.id)));
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
    return [...this.selectedStartingPlayers, ...this.selectedSubstitutes];
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
    return this.sortPlayersByPosition(this.homeAvailablePool.filter(player => !player.is_substitute && this.mandates.get(player.id) !== 'NO'));
  }

  get awayCaptaincyPlayers(): UctPlayer[] {
    return this.sortPlayersByPosition(this.awayAvailablePool.filter(player => !player.is_substitute && this.mandates.get(player.id) !== 'NO'));
  }

  get mandatePool(): UctPlayer[] {
    if (this.mandateMode === 'NA') return [];
    const pool = this.mandateMode === 'NO' ? this.selectedStartingPlayers : this.availablePool;
    return this.filterMandateModePlayers(pool);
  }

  get homeMandatePool(): UctPlayer[] {
    return this.mandatePool.filter(player => player.teamSide === 'home');
  }

  get awayMandatePool(): UctPlayer[] {
    return this.mandatePool.filter(player => player.teamSide === 'away');
  }

  get homeMandateMainPool(): UctPlayer[] {
    return this.filterMandateModePlayers(this.homeAvailablePool.filter(player => !player.is_substitute));
  }

  get awayMandateMainPool(): UctPlayer[] {
    return this.filterMandateModePlayers(this.awayAvailablePool.filter(player => !player.is_substitute));
  }

  get mandateYesPlayers(): UctPlayer[] {
    return this.sortPlayersByPosition(this.availablePool.filter(player => this.mandates.get(player.id) === 'YES'));
  }

  get mandateNoPlayers(): UctPlayer[] {
    return this.sortPlayersByPosition(this.availablePool.filter(player => this.mandates.get(player.id) === 'NO'));
  }

  get captainPlayers(): UctPlayer[] {
    return this.sortPlayersByPosition(this.availablePool.filter(player => this.captainIds.has(player.id)));
  }

  get selectedGoalkeepers(): UctPlayer[] {
    return this.availablePool.filter(player => this.isGoalkeeper(player));
  }

  get isSorarePlatform(): boolean {
    return this.selectedPlatform === 'sorare';
  }

  get requiresSalary(): boolean {
    return this.selectedPlatform === 'draftkings' || this.selectedPlatform === 'fanduel';
  }

  get activePlatformName(): string {
    return this.platforms.find(platform => platform.id === this.selectedPlatform)?.name || 'Fantasy Platform';
  }

  get activeMinSquad(): number {
    return this.isSorarePlatform ? this.minSquad : 18;
  }

  get activeTeamSize(): number {
    if (this.selectedPlatform === 'draftkings') return 8;
    if (this.selectedPlatform === 'fanduel') return 7;
    return this.teamSize;
  }

  get activeSalaryCap(): number | null {
    if (this.selectedPlatform === 'draftkings') return 50000;
    if (this.selectedPlatform === 'fanduel') return 100;
    return null;
  }

  get totalSelectedSalary(): number {
    return this.availablePool.reduce((total, player) => total + Number(this.salaries.get(player.id) || 0), 0);
  }

  get salaryEnteredCount(): number {
    return this.availablePool.filter(player => !!this.salaries.get(player.id)).length;
  }

  get hasValidSquadSize(): boolean {
    return this.availablePool.length >= this.activeMinSquad && this.availablePool.length <= this.maxSquad;
  }

  get hasValidSubstituteCount(): boolean {
    return this.selectedSubstitutes.length <= this.maxSubs;
  }

  get hasSquadGoalkeeper(): boolean {
    return this.positionCount(this.availablePool, 'GK') >= 1;
  }

  get hasRequiredPositionCoverage(): boolean {
    return ['GK', 'DEF', 'MID', 'FWD'].every(position => this.positionCount(this.availablePool, position) >= 1);
  }

  get isSquadRulesReady(): boolean {
    return this.hasValidSquadSize
      && this.hasValidSubstituteCount
      && this.hasRequiredPositionCoverage
      && this.confirmed;
  }

  get squadStatusText(): string {
    if (this.availablePool.length < this.activeMinSquad) return `Select >=${this.activeMinSquad} players`;
    if (this.availablePool.length > this.maxSquad) return `Max ${this.maxSquad} players`;
    if (!this.hasSquadGoalkeeper) return 'Goalkeeper required';
    if (!this.hasRequiredPositionCoverage) return 'Cover GK/DEF/MID/FWD';
    if (this.requiresSalary && this.salaryValidationMessage()) return 'Salary required';
    if (!this.confirmed) return 'Confirm below';
    return 'Ready';
  }

  get canReview(): boolean {
    if (!this.selectedPlatform) return false;

    return this.canLeaveSquadStep()
      && this.canLeaveMandateStep()
      && this.canLeaveCaptainStep();
  }

  get canGenerate(): boolean {
    return !this.showMatchStartedModal
      && !this.isCurrentMatchClosed()
      && this.canReview;
  }

  matchDateLabel(detail: MatchDetail): string {
    const date = this.matchStartDate(detail);

    if (!date) {
      return '-';
    }

    return new Intl.DateTimeFormat(undefined, {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    }).format(date);
  }

  matchTimeLabel(detail: MatchDetail): string {
    const date = this.matchStartDate(detail);

    if (!date) {
      return '-';
    }

    return new Intl.DateTimeFormat(undefined, {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    }).format(date).toUpperCase();
  }

  matchLocationLabel(detail: MatchDetail): string {
    const source = detail.match as unknown as Record<string, unknown>;
    const context = this.createUctContext as Record<string, unknown> | null;
    const venueName = this.firstValue(source, ['venue_name', 'venueName', 'stadium', 'ground'])
      || this.firstValue(context, ['venue_name', 'venueName']);
    const venueCity = this.firstValue(source, ['venue_city', 'venueCity', 'city'])
      || this.firstValue(context, ['venue_city', 'venueCity', 'city']);

    if (venueName) {
      return venueName;
    }

    if (venueCity) {
      return venueCity;
    }

    const value = this.firstValue(source, ['venue', 'location'])
      || this.firstValue(context, ['venue', 'location']);

    return value || 'Venue TBC';
  }

  matchTeamCode(detail: MatchDetail, side: 'home' | 'away'): string {
    const team = side === 'home' ? detail.home_team : detail.away_team;
    const source = detail.match as unknown as Record<string, unknown>;
    const code = side === 'home'
      ? this.firstValue(source, ['home_team_name', 'homeTeamShortName'])
      : this.firstValue(source, ['away_team_name', 'awayTeamShortName']);

    return code || team.short_name || this.shortCodeFromName(this.matchTeamFullName(detail, side));
  }

  matchTeamFullName(detail: MatchDetail, side: 'home' | 'away'): string {
    const team = side === 'home' ? detail.home_team : detail.away_team;
    const source = detail.match as unknown as Record<string, unknown>;
    const fullName = side === 'home'
      ? this.firstValue(source, ['hometeamname', 'homeTeamName'])
      : this.firstValue(source, ['awayteamname', 'awayTeamName']);

    return fullName || team.name || team.short_name || 'TBD';
  }

  matchSeriesLabel(detail: MatchDetail): string {
    return String(detail.match.seriesname || '').trim() || 'Football';
  }

  previewMatchLabel(detail: MatchDetail): string {
    const source = detail.match as unknown as Record<string, unknown>;
    const competition = this.matchSeriesLabel(detail);
    const round = this.firstValue(source, ['matchday', 'match_day', 'round', 'round_name', 'roundName', 'gameweek']);
    const roundLabel = round
      ? ` - ${String(round).toUpperCase().includes('MATCHDAY') ? round : `MATCHDAY ${round}`}`
      : '';

    return `${this.matchTeamFullName(detail, 'home')} v ${this.matchTeamFullName(detail, 'away')} - ${competition}${roundLabel}`;
  }

  playerNames(players: UctPlayer[], empty = 'None'): string {
    return players.length ? players.map(player => player.player_name).join(', ') : empty;
  }

  previewSquadLabel(): string {
    return `${this.availablePool.length} players (${this.selectedSubstitutes.length} subs)`;
  }

  previewDistributionLabel(): string {
    const prefix = this.distributionMode === 'AUTO' ? 'Auto' : 'Custom';
    const combos = this.activeTeamCombinations().map(combo => this.comboLabel(combo.home, combo.away)).join(', ');

    return combos ? `${prefix} - ${combos}` : `${prefix} - No valid combinations`;
  }

  hasPositionCoverage(position: string): boolean {
    return this.positionCount(this.availablePool, position) >= 1;
  }

  teamAccent(side: 'home' | 'away'): string {
    return side === 'home' ? '#f8fafc' : '#31b8ff';
  }

  goBack(): void {
    if (this.submitting) {
      return;
    }

    this.router.navigate(['/lineouts']);
  }

  togglePlayingXi(): void {
    this.showPlayingXi = !this.showPlayingXi;
  }

  toggleSubstitutes(): void {
    this.showSubstitutes = !this.showSubstitutes;
  }

  nextStep(): void {
    if (this.step === 0) {
      this.showAlert('Choose platform', 'Select Sorare, DraftKings, or FanDuel to start the UCT workflow.', 'warning');
      return;
    }

    if (this.step === 1 && !this.canLeaveSquadStep()) {
      this.showAlert('My Squad rules incomplete', this.squadValidationMessage(), 'warning');
      return;
    }

    if (this.step === 2 && !this.canLeaveMandateStep()) {
      this.showAlert(
        'Mandate selection needed',
        this.mandateValidationMessage(),
        'warning'
      );
      return;
    }

    if (this.step === 2 && !this.isSorarePlatform) {
      this.setActiveStep(5);
      return;
    }

    if (this.step === 3 && !this.canLeaveCaptainStep()) {
      this.showAlert('Captain Pool incomplete', `Select ${this.minCaptainPool}-${this.maxCaptainPool} Captain Pool players. Only Captain (C) will be sent to backend.`, 'warning');
      return;
    }

    if (this.step === 3) {
      this.setActiveStep(5);
      return;
    }

    if (this.step === 4 && !this.canLeaveDistributionStep()) {
      this.showAlert('Distribution needed', 'Select at least one valid real-team combination or switch to Auto.', 'warning');
      return;
    }

    if (this.step < 5) {
      this.setActiveStep(this.step + 1);
    }
  }

  prevStep(): void {
    if (this.submitting) {
      return;
    }

    if (this.step > 1) {
      if (this.step === 5) {
        this.setActiveStep(this.isSorarePlatform ? 3 : 2);
        return;
      }

      this.setActiveStep(this.step - 1);
    } else {
      this.setActiveStep(0);
    }
  }

  setStep(step: number): void {
    if (step === 3 && !this.isSorarePlatform) {
      return;
    }

    if (step <= this.step) {
      this.setActiveStep(step);
    }
  }

  selectPlatform(platform: FantasyPlatform): void {
    if (this.submitting) {
      return;
    }

    if (this.selectedPlatform && this.selectedPlatform !== platform && this.availablePool.length) {
      this.resetUctSelections();
    }

    this.selectedPlatform = platform;
    this.generationStatus = `Resolving ${this.activePlatformName} rules - validating selections - computing teams`;
    this.setActiveStep(1);
  }

  salaryValue(player: UctPlayer): string {
    return this.salaries.get(player.id) || '';
  }

  updateSalary(player: UctPlayer, input: HTMLInputElement): void {
    if (!this.requiresSalary) return;

    const digits = String(input.value || '').replace(/\D/g, '');
    const maxLength = this.selectedPlatform === 'draftkings' ? 5 : 3;
    const cleanValue = digits.slice(0, maxLength);
    input.value = cleanValue;

    if (cleanValue) {
      this.salaries.set(player.id, cleanValue);
    } else {
      this.salaries.delete(player.id);
    }
  }

  allowSalaryKey(event: KeyboardEvent): void {
    const allowedKeys = [
      'Backspace',
      'Delete',
      'ArrowLeft',
      'ArrowRight',
      'ArrowUp',
      'ArrowDown',
      'Tab',
      'Home',
      'End',
      'Enter'
    ];

    if (allowedKeys.includes(event.key) || event.ctrlKey || event.metaKey) {
      return;
    }

    if (!/^\d$/.test(event.key)) {
      event.preventDefault();
    }
  }

  toggleStartingPlayer(player: UctPlayer): void {
    if (this.selectedStartingIds.has(player.id)) {
      this.selectedStartingIds.delete(player.id);
      this.mandates.delete(player.id);
      this.captainIds.delete(player.id);
      this.salaries.delete(player.id);
      this.syncDistributionAfterSquadChange();
      this.syncMandatesAfterSquadChange();
      this.refreshActionBarLayout();
      return;
    }

    if (this.availablePool.length >= this.maxSquad) {
      this.showAlert('My Squad limit reached', 'My Squad size must stay between 10 and 22 players.', 'warning');
      return;
    }

    this.selectedStartingIds.add(player.id);
    this.syncDistributionAfterSquadChange();
    this.syncMandatesAfterSquadChange();
    this.refreshActionBarLayout();
  }

  isStartingDisabled(player: UctPlayer): boolean {
    return !this.selectedStartingIds.has(player.id) && this.availablePool.length >= this.maxSquad;
  }

  toggleSubstitute(player: UctPlayer): void {
    if (this.selectedSubIds.has(player.id)) {
      this.selectedSubIds.delete(player.id);
      this.mandates.delete(player.id);
      this.captainIds.delete(player.id);
      this.salaries.delete(player.id);
      this.syncDistributionAfterSquadChange();
      this.syncMandatesAfterSquadChange();
      this.refreshActionBarLayout();
      return;
    }

    if (this.isGoalkeeper(player)) {
      this.showAlert('Substitute GK not allowed', 'Only DEF, MID or FWD substitute players can be selected.', 'warning');
      return;
    }

    if (this.selectedSubIds.size >= this.maxSubs) {
      this.showAlert('Substitute limit reached', 'You can select up to 3 substitute players only.', 'warning');
      return;
    }

    if (this.availablePool.length >= this.maxSquad) {
      this.showAlert('My Squad limit reached', 'My Squad size must stay between 10 and 22 players. Remove a player before adding a substitute.', 'warning');
      return;
    }

    this.selectedSubIds.add(player.id);
    this.syncDistributionAfterSquadChange();
    this.syncMandatesAfterSquadChange();
    this.refreshActionBarLayout();
  }

  isSubstituteDisabled(player: UctPlayer): boolean {
    return !this.selectedSubIds.has(player.id)
      && (this.selectedSubIds.size >= this.maxSubs || this.availablePool.length >= this.maxSquad || this.isGoalkeeper(player));
  }

  setMandateMode(value: Mandate): void {
    this.mandateMode = value;

    if (value === 'NA') {
      this.mandates.clear();
      return;
    }

    if (value === 'YES') {
      this.availablePool
        .filter(player => this.isGoalkeeper(player) && this.mandates.get(player.id) === 'YES')
        .forEach(player => this.mandates.delete(player.id));

      this.mandateYesPlayers.slice(this.maxMandateYes).forEach(player => this.mandates.delete(player.id));
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
      this.refreshActionBarLayout();
      return;
    }

    if (value === 'YES' && this.isGoalkeeper(player)) {
      this.showAlert('GK not available for M-YES', 'Select one DEF, MID or FWD player as M-YES.', 'warning');
      return;
    }

    if (value === 'YES' && this.mandateCount('YES') >= this.maxMandateYes) {
      this.showAlert('M-YES limit reached', 'You can force only 1 DEF, MID or FWD player into every generated team.', 'warning');
      return;
    }

    if (value === 'NO' && this.mandateCount('NO') >= this.maxMandateNo) {
      this.showAlert('M-NO limit reached', 'You can exclude maximum 2 players from generated teams.', 'warning');
      return;
    }

    if (value === 'NO' && this.isGoalkeeper(player) && this.mandateGoalkeeperCount('NO') >= 1) {
      this.showAlert('GK M-NO limit', 'Only one goalkeeper can be selected as M-NO.', 'warning');
      return;
    }

    this.mandates.set(player.id, value);
    this.refreshActionBarLayout();

    if (value === 'NO') {
      this.captainIds.delete(player.id);
    }

  }

  mandateOf(player: UctPlayer): Mandate {
    return this.mandates.get(player.id) || 'NA';
  }

  toggleCaptain(player: UctPlayer): void {
    if (this.mandates.get(player.id) === 'NO') {
      this.showAlert('Player excluded', 'M-NO players cannot be used for captaincy.', 'warning');
      return;
    }

    if (this.captainIds.has(player.id)) {
      this.captainIds.delete(player.id);
      this.refreshActionBarLayout();
      return;
    }

    if (this.isCaptaincyPositionCapReached(player, this.captainIds)) {
      this.showPositionCapAlert(player);
      return;
    }

    if (this.captainIds.size >= this.maxCaptainPool) {
      this.showAlert('Captain Pool limit reached', `Captain Pool allows minimum ${this.minCaptainPool} and maximum ${this.maxCaptainPool} selected players.`, 'warning');
      return;
    }

    this.captainIds.add(player.id);
    this.refreshActionBarLayout();
  }

  canSelectCaptain(player: UctPlayer): boolean {
    if (this.captainIds.has(player.id)) return true;
    if (this.mandates.get(player.id) === 'NO') return false;
    if (this.isCaptaincyPositionCapReached(player, this.captainIds)) return false;

    return this.captainIds.size < this.maxCaptainPool;
  }

  canLeaveMandateStep(): boolean {
    return !this.mandateValidationMessage();
  }

  mandateValidationMessage(): string {
    if (this.mandateMode === 'NA') {
      return '';
    }

    if (this.mandateMode === 'YES') {
      const mandateYesGoalkeepers = this.mandateYesPlayers.filter(player => this.isGoalkeeper(player));

      if (mandateYesGoalkeepers.length) {
        return 'Goalkeeper cannot be selected as M-YES. Select one DEF, MID or FWD player.';
      }

      if (this.mandateYesPlayers.length !== 1) {
        return 'Select exactly 1 M-YES player or switch to N/A.';
      }
    }

    return '';
  }

  canLeaveCaptainStep(): boolean {
    if (!this.isSorarePlatform) return true;
    return this.captainIds.size >= this.minCaptainPool && this.captainIds.size <= this.maxCaptainPool;
  }

  canLeaveDistributionStep(): boolean {
    return true;
  }

  canLeaveSquadStep(): boolean {
    return !this.squadValidationMessage();
  }

  squadValidationMessage(): string {
    const count = this.availablePool.length;

    if (!this.selectedPlatform) {
      return 'Choose fantasy platform first.';
    }

    if (count < this.activeMinSquad) {
      return `Select at least ${this.activeMinSquad} players in My Squad.`;
    }

    if (count > this.maxSquad) {
      return `My Squad can have maximum ${this.maxSquad} players.`;
    }

    if (this.selectedSubstitutes.length > this.maxSubs) {
      return `Select maximum ${this.maxSubs} substitute players.`;
    }

    const missingPositions = ['GK', 'DEF', 'MID', 'FWD']
      .filter(position => this.positionCount(this.availablePool, position) < 1);

    if (missingPositions.length) {
      return `My Squad must include at least 1 ${missingPositions.join(', ')} player.`;
    }

    if (!this.confirmed) {
      return `Please confirm that you selected only eligible ${this.activePlatformName} players.`;
    }

    const salaryMessage = this.salaryValidationMessage();
    if (salaryMessage) {
      return salaryMessage;
    }

    return '';
  }

  salaryValidationMessage(): string {
    if (!this.requiresSalary) {
      return '';
    }

    const label = this.activePlatformName;
    const cap = this.activeSalaryCap;
    const invalidPlayer = this.availablePool.find(player => {
      const salaryValue = this.salaries.get(player.id) || '';
      const salary = Number(salaryValue);

      return !/^\d+$/.test(salaryValue)
        || !Number.isFinite(salary)
        || salary <= 0
        || (cap !== null && salary > cap);
    });

    if (invalidPlayer) {
      const salaryValue = this.salaries.get(invalidPlayer.id) || '';
      const salary = Number(salaryValue);

      if (!salaryValue) {
        return `${label} salary is required for ${invalidPlayer.player_name}.`;
      }

      if (!/^\d+$/.test(salaryValue) || !Number.isFinite(salary) || salary <= 0) {
        return `Enter a valid ${label} salary for ${invalidPlayer.player_name}.`;
      }

      return `${label} salary for ${invalidPlayer.player_name} cannot exceed ${cap}.`;
    }

    return '';
  }

  validTeamCombinations(): Array<{ home: number; away: number }> {
    const homeCount = this.homeAvailablePool.length;
    const awayCount = this.awayAvailablePool.length;

    return this.teamCombinationOptions.filter(combo =>
      homeCount >= combo.home
      && awayCount >= combo.away
      && this.canBuildCombination(combo.home, combo.away)
    );
  }

  isTeamCombinationValid(home: number, away: number): boolean {
    return this.validTeamCombinations().some(combo => combo.home === home && combo.away === away);
  }

  comboKey(home: number, away: number): string {
    return `${home}x${away}`;
  }

  comboLabel(home: number, away: number): string {
    return `${home} x ${away}`;
  }

  isTeamCombinationActive(home: number, away: number): boolean {
    if (!this.isTeamCombinationValid(home, away)) {
      return false;
    }

    return this.distributionMode === 'AUTO' || this.selectedCombinationKeys.has(this.comboKey(home, away));
  }

  setDistributionMode(mode: DistributionMode): void {
    this.distributionMode = mode;

    if (mode === 'AUTO') {
      this.selectedCombinationKeys.clear();
    }
  }

  toggleTeamCombination(home: number, away: number): void {
    if (!this.isTeamCombinationValid(home, away)) {
      return;
    }

    if (this.distributionMode === 'AUTO') {
      this.distributionMode = 'CUSTOM';
    }

    const key = this.comboKey(home, away);

    if (this.selectedCombinationKeys.has(key)) {
      this.selectedCombinationKeys.delete(key);
    } else {
      this.selectedCombinationKeys.add(key);
    }
  }

  activeTeamCombinations(): Array<{ home: number; away: number }> {
    const valid = this.validTeamCombinations();

    if (this.distributionMode === 'AUTO') {
      return valid;
    }

    return valid.filter(combo => this.selectedCombinationKeys.has(this.comboKey(combo.home, combo.away)));
  }

  isMandatePlayerDisabled(player: UctPlayer): boolean {
    if (this.mandateMode === 'NA') return true;
    if (this.mandateOf(player) === this.mandateMode) return false;
    if (this.mandateMode === 'YES' && this.mandateCount('YES') >= this.maxMandateYes) return true;
    if (this.mandateMode === 'YES' && this.isGoalkeeper(player)) return true;
    return false;
  }

  captaincyHint(): string {
    return `${this.captainIds.size}/${this.maxCaptainPool} captains selected`;
  }

  generateTeams(): void {
    if (this.ensureMatchStillOpen()) {
      return;
    }

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

  closeAlert(): void {
    this.uctAlert = null;
  }

  goToLineoutsAfterMatchStarted(): void {
    this.router.navigate(['/lineouts']);
  }

  canDeactivate(): boolean {
    return !this.submitting;
  }

  @HostListener('window:beforeunload', ['$event'])
  preventRefreshWhileSubmitting(event: BeforeUnloadEvent): void {
    if (!this.submitting) {
      return;
    }

    event.preventDefault();
    event.returnValue = '';
  }

  @HostListener('window:keydown', ['$event'])
  preventRefreshShortcutsWhileSubmitting(event: KeyboardEvent): void {
    if (!this.submitting) {
      return;
    }

    const key = event.key.toLowerCase();

    if (key === 'f5' || ((event.ctrlKey || event.metaKey) && key === 'r')) {
      event.preventDefault();
    }
  }

  confirmGenerateTeams(): void {
    if (this.ensureMatchStillOpen()) {
      return;
    }

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
    if (this.ensureMatchStillOpen()) {
      return;
    }

    if (!this.canGenerate || this.submitting) {
      return;
    }

    this.submitting = true;
    this.submitError = '';
    this.setActiveStep(7);
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

    const splits = this.previewSplitOptions();
    const teams: GeneratedTeam[] = [];

    for (let i = 0; i < 20; i++) {
      const split = splits[i % splits.length];
      const [homeCount] = split.split('-').map(Number);
      const players = this.buildTeam(i, homeCount);
      const captainPool = this.captainPlayers;
      const captain = captainPool[i % captainPool.length] || players[0];
      const finalPlayers = this.ensureCaptainInTeam(players, captain);

      teams.push({
        index: i + 1,
        split,
        players: finalPlayers,
        captain
      });
    }

    this.generatedTeams = teams;
    this.setActiveStep(5);
  }

  positionClass(player: UctPlayer): string {
    return String(player.position || '').toLowerCase();
  }

  private previewSplitOptions(): string[] {
    const realTeamSplits = this.activeTeamCombinations().map(combo => `${combo.home}-${combo.away}`);

    if (realTeamSplits.length) {
      return realTeamSplits;
    }

    const homeCount = this.homeAvailablePool.length;
    const awayCount = this.awayAvailablePool.length;
    const homeTarget = Math.min(this.teamSize, homeCount);

    if (homeTarget > 0 && awayCount >= this.teamSize - homeTarget) {
      return [`${homeTarget}-${this.teamSize - homeTarget}`];
    }

    return [`0-${this.teamSize}`];
  }

  isGoalkeeperPlayer(player: UctPlayer): boolean {
    return this.isGoalkeeper(player);
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

  private matchStartDate(detail: MatchDetail): Date | null {
    const value = detail.match.start_time || detail.match.matchdate;

    if (!value) {
      return null;
    }

    const date = new Date(value);

    return Number.isNaN(date.getTime()) ? null : date;
  }

  private firstValue(source: Record<string, unknown> | null | undefined, keys: string[]): string {
    if (!source) {
      return '';
    }

    for (const key of keys) {
      const value = String(source[key] || '').trim();

      if (value && value !== 'undefined' && value !== 'null') {
        return value;
      }
    }

    return '';
  }

  private getCreateUctContext(matchId: string): CreateUctContext | null {
    const navigationState = history.state?.lineoutMatch as CreateUctContext | undefined;

    if (navigationState?.id && String(navigationState.id) === matchId) {
      return navigationState;
    }

    try {
      const stored = sessionStorage.getItem(`lineout-match-${matchId}`);

      return stored ? JSON.parse(stored) as CreateUctContext : null;
    } catch {
      return null;
    }
  }

  private resetUctSelections(): void {
    this.selectedStartingIds.clear();
    this.selectedSubIds.clear();
    this.mandates.clear();
    this.captainIds.clear();
    this.salaries.clear();
    this.selectedCombinationKeys.clear();
    this.distributionMode = 'AUTO';
    this.confirmed = false;
  }

  private shortCodeFromName(name: string): string {
    return String(name || 'TBD')
      .split(/\s+/)
      .filter(Boolean)
      .map(part => part[0])
      .join('')
      .slice(0, 3)
      .toUpperCase() || 'TBD';
  }

  private buildSubmitPayload(): UctGeneratePayload {
    return {
      match_id: this.matchId,
      platform: this.selectedPlatform || 'sorare',
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

    if (this.requiresSalary) {
      payload.salary = Number(this.salaries.get(player.id) || 0);
    }

    if (this.isSorarePlatform && this.captainIds.has(player.id)) {
      payload.captain = 'C';
    }

    return payload;
  }

  private showAlert(title: string, message: string, type: UctAlertType): void {
    this.uctAlert = { title, message, type };
  }

  private startMatchStatusPolling(): void {
    this.stopMatchStatusPolling();

    if (!this.matchId || this.showMatchStartedModal) {
      return;
    }

    this.matchStatusTimer = setInterval(() => {
      this.api.getMatchDetails(this.matchId)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (res) => {
            const latestDetail = res?.success ? res.data : null;

            if (!latestDetail) {
              return;
            }

            this.detail = latestDetail;
            this.handleMatchAvailability(latestDetail);
          },
          error: () => {
            // Keep the current screen usable if a background status check fails.
          }
        });
    }, 15000);
  }

  private stopMatchStatusPolling(): void {
    if (this.matchStatusTimer) {
      clearInterval(this.matchStatusTimer);
      this.matchStatusTimer = null;
    }
  }

  private handleMatchAvailability(detail: MatchDetail | null): void {
    if (!detail || !this.isMatchClosedForUct(detail)) {
      return;
    }

    this.showMatchStartedModal = true;
    this.showGenerateConfirm = false;
    this.generateConsent = false;
    this.uctAlert = null;

    if (this.submitting) {
      this.submitting = false;
      this.stopGeneratingStatus();
    }

    this.stopMatchStatusPolling();
  }

  private ensureMatchStillOpen(): boolean {
    const closed = this.isCurrentMatchClosed();

    if (closed) {
      this.handleMatchAvailability(this.detail);
    }

    return closed;
  }

  private isCurrentMatchClosed(): boolean {
    return this.isMatchClosedForUct(this.detail);
  }

  private isMatchClosedForUct(detail: MatchDetail | null): boolean {
    if (!detail) {
      return false;
    }

    const status = String(detail.match.status || '').toUpperCase();
    const startedStatuses = ['LIVE', 'FINISHED', 'FT', 'ENDED'];
    const kickoff = this.matchStartDate(detail)?.getTime();
    const matchStarted = typeof kickoff === 'number' && Number.isFinite(kickoff) && Date.now() >= kickoff;

    return startedStatuses.includes(status) || matchStarted;
  }

  private refreshActionBarLayout(): void {
    requestAnimationFrame(() => {
      const actions = document.querySelector('.flow-actions');
      actions?.getBoundingClientRect();
    });
  }

  private setActiveStep(step: number): void {
    this.step = step;
    this.scrollToStepView(step);
  }

  private scrollToStepView(step: number): void {
    setTimeout(() => {
      const elementId = step === 7 ? 'uctGeneratingPanel' : 'uctStepContent';
      const element = document.getElementById(elementId);

      if (!element) {
        return;
      }

      const headerOffset = window.innerWidth <= 640 ? 86 : 112;
      const top = element.getBoundingClientRect().top + window.scrollY - headerOffset;
      window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
    });
  }

  private isGoalkeeper(player: UctPlayer): boolean {
    return String(player.position || '').toUpperCase() === 'GK';
  }

  private isCaptaincyPositionCapReached(player: UctPlayer, selectedIds: Set<number>): boolean {
    return false;
  }

  private showPositionCapAlert(player: UctPlayer): void {
    const position = this.normalizedPosition(player);
    const limit = this.positionLimits[position];

    if (!limit) {
      return;
    }

    this.showAlert(
      `${position} limit reached`,
      `${position} allows minimum ${limit.min} and maximum ${limit.max} players. Remove one ${position} player before selecting another.`,
      'warning'
    );
  }

  private mandateGoalkeeperCount(value: Exclude<Mandate, 'NA'>): number {
    return this.availablePool.filter(player => this.mandates.get(player.id) === value && this.isGoalkeeper(player)).length;
  }

  private mandateCount(value: Exclude<Mandate, 'NA'>): number {
    return Array.from(this.mandates.values()).filter(mandate => mandate === value).length;
  }

  private filterMandateModePlayers(players: UctPlayer[]): UctPlayer[] {
    if (this.mandateMode === 'YES') {
      return players.filter(player =>
        this.mandates.get(player.id) !== 'NO'
        && !this.isGoalkeeper(player)
      );
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

  private canBuildCombination(home: number, away: number): boolean {
    return home + away === this.teamSize;
  }

  private syncDistributionAfterSquadChange(): void {
    if (this.distributionMode !== 'CUSTOM') {
      return;
    }

    const validKeys = new Set(this.validTeamCombinations().map(combo => this.comboKey(combo.home, combo.away)));
    Array.from(this.selectedCombinationKeys).forEach(key => {
      if (!validKeys.has(key)) {
        this.selectedCombinationKeys.delete(key);
      }
    });
  }

  private syncMandatesAfterSquadChange(): void {
    if (this.selectedGoalkeepers.length > 1) {
      return;
    }

    this.availablePool
      .filter(player => this.isGoalkeeper(player) && this.mandates.get(player.id) === 'YES')
      .forEach(player => this.mandates.delete(player.id));
  }

  private buildTeam(seed: number, targetHomeCount: number): UctPlayer[] {
    const mandateYes = this.mandateYesPlayers;
    const excludedIds = new Set(this.mandateNoPlayers.map(player => player.id));
    const selectedIds = new Set<number>();
    const team: UctPlayer[] = [];

    mandateYes.forEach(player => this.addUnique(team, selectedIds, player));

    const targetAwayCount = this.teamSize - targetHomeCount;
    const homePool = this.rotated(this.availablePool.filter(player => player.teamSide === 'home' && !excludedIds.has(player.id)), seed);
    const awayPool = this.rotated(this.availablePool.filter(player => player.teamSide === 'away' && !excludedIds.has(player.id)), seed + 3);
    const fullPool = this.rotated(this.availablePool.filter(player => !excludedIds.has(player.id)), seed + 7);

    this.ensurePosition(team, selectedIds, 'GK', fullPool);
    this.ensurePositionCount(team, selectedIds, 'DEF', this.positionLimits['DEF'].min, fullPool);
    this.ensurePositionCount(team, selectedIds, 'MID', this.positionLimits['MID'].min, fullPool);
    this.ensurePositionCount(team, selectedIds, 'FWD', this.positionLimits['FWD'].min, fullPool);
    this.fillSide(team, selectedIds, 'home', targetHomeCount, homePool);
    this.fillSide(team, selectedIds, 'away', targetAwayCount, awayPool);
    this.fillTeam(team, selectedIds, fullPool);

    return team.slice(0, this.teamSize);
  }

  private ensurePosition(team: UctPlayer[], selectedIds: Set<number>, position: string, pool: UctPlayer[]): void {
    if (team.some(player => player.position === position)) {
      return;
    }

    const player = pool.find(item => this.normalizedPosition(item) === position && !selectedIds.has(item.id));
    if (player) this.addUnique(team, selectedIds, player);
  }

  private ensurePositionCount(team: UctPlayer[], selectedIds: Set<number>, position: string, count: number, pool: UctPlayer[]): void {
    while (this.positionCount(team, position) < count) {
      const player = pool.find(item => this.normalizedPosition(item) === position && !selectedIds.has(item.id));
      if (!player) return;
      this.addUnique(team, selectedIds, player);
    }
  }

  private fillSide(team: UctPlayer[], selectedIds: Set<number>, side: 'home' | 'away', count: number, pool: UctPlayer[]): void {
    while (team.filter(player => player.teamSide === side).length < count && team.length < this.teamSize) {
      const player = pool.find(item => !selectedIds.has(item.id) && this.canAddPosition(team, item));
      if (!player) return;
      this.addUnique(team, selectedIds, player);
    }
  }

  private fillTeam(team: UctPlayer[], selectedIds: Set<number>, pool: UctPlayer[]): void {
    while (team.length < this.teamSize) {
      const player = pool.find(item => !selectedIds.has(item.id) && this.canAddPosition(team, item));
      if (!player) return;
      this.addUnique(team, selectedIds, player);
    }
  }

  private ensureCaptainInTeam(players: UctPlayer[], captain: UctPlayer): UctPlayer[] {
    const finalPlayers = [...players];
    this.forcePlayerIntoTeam(finalPlayers, captain);
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
    if (!selectedIds.has(player.id) && team.length < this.teamSize) {
      team.push(player);
      selectedIds.add(player.id);
    }
  }

  private canAddPosition(team: UctPlayer[], player: UctPlayer): boolean {
    const position = this.normalizedPosition(player);
    const limit = this.positionLimits[position];

    if (!limit) {
      return true;
    }

    return this.positionCount(team, position) < limit.max;
  }

  private positionCount(players: UctPlayer[], position: string): number {
    return players.filter(player => this.normalizedPosition(player) === position).length;
  }

  private normalizedPosition(player: UctPlayer): string {
    return String(player.position || '').trim().toUpperCase();
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

    // console.log('Create UCT player pools:', {
    //   matchId: this.detail.match.id,
    //   homeTeam: this.detail.home_team.name,
    //   homePlayingXi: this.detail.home_team.playing_xi,
    //   homeSubstitutes: this.detail.home_team.substitutes,
    //   homeAvailablePool: this.homeAvailablePool,
    //   awayTeam: this.detail.away_team.name,
    //   awayPlayingXi: this.detail.away_team.playing_xi,
    //   awaySubstitutes: this.detail.away_team.substitutes,
    //   awayAvailablePool: this.awayAvailablePool
    // });
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
