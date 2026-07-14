import { Component, HostListener, OnDestroy, OnInit } from '@angular/core';
import { ViewportScroller } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, switchMap, takeUntil } from 'rxjs';
import { MatchDetail, MatchPlayer, UctGeneratePayload, UctGeneratePlayer } from 'src/app/core/interfaces/content';
import { ApiService } from 'src/app/core/services/api.service';
import { AuthService } from 'src/app/core/services/auth.service';

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
  sport?: string;
  homeName?: string;
  awayName?: string;
  homeCode?: string;
  awayCode?: string;
  series?: string;
  kickoffISO?: string;
  status?: string;
  venue?: string;
  venue_name?: string;
  venue_city?: string;
  generatedGames?: FantasyPlatform[] | string[];
}

@Component({
  selector: 'app-create-uct',
  templateUrl: './create-uct.component.html',
  styleUrls: ['./create-uct.component.css']
})
export class CreateUctComponent implements OnInit, OnDestroy {
  private readonly playerImageFallback = 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 64 64%22%3E%3Crect width=%2264%22 height=%2264%22 rx=%2232%22 fill=%22%2315263a%22/%3E%3Ccircle cx=%2232%22 cy=%2224%22 r=%2211%22 fill=%22%2394a3b8%22/%3E%3Cpath d=%22M13 57c2-12 9-18 19-18s17 6 19 18%22 fill=%22%2394a3b8%22/%3E%3C/svg%3E';
  private readonly destroy$ = new Subject<void>();
  private generatingStatusTimer: ReturnType<typeof setInterval> | null = null;
  private matchStatusTimer: ReturnType<typeof setInterval> | null = null;

  matchId = '';
  loading = true;
  matchDataLoading = true;
  errorMessage = '';
  detail: MatchDetail | null = null;
  private createUctContext: CreateUctContext | null = null;
  step = 0;
  selectedPlatform: FantasyPlatform | null = null;
  confirmed = false;
  submitting = false;
  navigatingToTeams = false;
  submitError = '';
  showGenerateConfirm = false;
  showPlayingXi = true;
  showSubstitutes = false;
  showMatchStartedModal = false;
  generateConsent = false;
  mandateMode: Mandate = 'NA';
  uctAlert: { title: string; message: string; type: UctAlertType } | null = null;
  generationStatus = 'Choose a platform to start UCT generation.';
  readonly generationMessages: Record<FantasyPlatform, string[]> = {
    sorare: [
      'Applying your Sorare configuration...',
      'Processing selected My Squad players...',
      'Building valid 5-card combinations...',
      'Assigning Captain Pool rotations...',
      'Checking duplicate teams...',
      'Validating all Sorare rules...',
      'Finalising your 20 teams...'
    ],
    draftkings: [
      'Processing your DraftKings configuration...',
      'Analysing your selected My Squad players...',
      'Validating DraftKings roster rules and player salary limits...',
      'Building valid lineups (GK 1 - DEF 2 - MID 2 - FWD 2 - UTIL 1)...',
      'Applying advanced calculations to maximise team coverage...',
      'Performing final checks to ensure every team is unique...',
      'Preparing your final teams...'
    ],
    fanduel: [
      'Processing your FanDuel configuration...',
      'Analysing your selected My Squad players...',
      'Validating FanDuel roster rules and player unit limits...',
      'Building valid lineups (GK 1 - DEF 2 - FWD/MID 4)...',
      'Applying advanced calculations to maximise team coverage...',
      'Performing final checks to ensure every team is unique...',
      'Preparing your final teams...'
    ]
  };

  selectedStartingIds = new Set<number>();
  selectedSubIds = new Set<number>();
  mandates = new Map<number, Mandate>();
  captainIds = new Set<number>();
  distributionMode: DistributionMode = 'AUTO';
  selectedCombinationKeys = new Set<string>();
  generatedTeams: GeneratedTeam[] = [];
  salaries = new Map<number, string>();
  private userGeneratedGames = new Set<FantasyPlatform>();
  private checkedGeneratedPlatforms = new Set<FantasyPlatform>();

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
    // captainLabel: string;
    capText: string;
    summary: string;
  }> = [
    {
      id: 'sorare',
      name: 'Sorare',
      icon: 'sports_soccer',
      teamLabel: '5 Player Teams',
      salaryLabel: 'No Salary Cap',
      // captainLabel: 'Captain Mode',
      capText: 'Current Sorare rules',
      summary: 'No salary entry. Existing PICK2WIN Sorare rules remain unchanged.'
    },
    {
      id: 'draftkings',
      name: 'DraftKings',
      icon: 'emoji_events',
      teamLabel: '8 Player Teams',
      salaryLabel: 'Salary Cap $50,000',
      // captainLabel: 'No Captain',
      capText: 'GK 1, DEF 2, MID 2, FWD 2, UTIL 1',
      summary: 'Select players for My Squad from the official Starting XI and substitutes, then enter each selected player\'s DraftKings salary. UCT builds valid 8-player lineups (GK 1 - DEF 2 - MID 2 - FWD 2 - UTIL 1) within the $50,000 salary cap'
    },
    {
      id: 'fanduel',
      name: 'FanDuel',
      icon: 'shield',
      teamLabel: '7 Player Teams',
      salaryLabel: 'Salary Cap 100',
      // captainLabel: 'No Captain',
      capText: 'GK 1, DEF 2, FWD/MID 4',
      summary: 'Select players for My Squad from the official Starting XI and substitutes, then enter each selected player\'s FanDuel Salary. UCT builds valid 7-player lineups (GK 1 - DEF 2 - FWD/MID 4) within the 100 salary-unit cap.'
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
    private authService: AuthService,
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
          this.detail = this.createUctContext
            ? this.provisionalDetail(this.createUctContext)
            : null;
          this.loading = !this.detail;
          this.matchDataLoading = true;
          this.errorMessage = '';
          this.userGeneratedGames.clear();
          this.checkedGeneratedPlatforms.clear();
          this.loadUserGeneratedGames(this.matchId);
          this.loadGeneratedGamesByPlatform(this.matchId);
          return this.api.getMatchDetails(this.matchId);
        })
      )
      .subscribe({
        next: (res) => {
          this.detail = res?.success ? res.data : null;
          this.loading = false;
          this.matchDataLoading = false;
          this.errorMessage = this.detail ? '' : 'Unable to load UCT match data.';
          this.resetUctSelections();
          this.printPlayerPools();
          this.handleMatchAvailability(this.detail);
          this.startMatchStatusPolling();
        },
        error: (err) => {
          this.detail = null;
          this.loading = false;
          this.matchDataLoading = false;
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

  get selectedHomeSquadPlayers(): UctPlayer[] {
    return this.sortPlayersByPosition(this.availablePool.filter(player => player.teamSide === 'home'));
  }

  get selectedAwaySquadPlayers(): UctPlayer[] {
    return this.sortPlayersByPosition(this.availablePool.filter(player => player.teamSide === 'away'));
  }

  get selectedHomeStartingPlayers(): UctPlayer[] {
    return this.selectedStartingPlayers.filter(player => player.teamSide === 'home');
  }

  get selectedAwayStartingPlayers(): UctPlayer[] {
    return this.selectedStartingPlayers.filter(player => player.teamSide === 'away');
  }

  get selectedHomeSubstitutes(): UctPlayer[] {
    return this.selectedSubstitutes.filter(player => player.teamSide === 'home');
  }

  get selectedAwaySubstitutes(): UctPlayer[] {
    return this.selectedSubstitutes.filter(player => player.teamSide === 'away');
  }

  isSquadSubstitute(player: UctPlayer): boolean {
    return Number(player.is_substitute) === 1 && Number(player.is_playing) !== 1;
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

  get visiblePlatforms(): typeof this.platforms {
    return this.platforms.filter(platform => platform.id !== 'sorare');
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
    return null;
  }

  isPlatformGenerated(platform: FantasyPlatform): boolean {
    return this.generatedGames().includes(platform);
  }

  isPlatformGenerationStatusLoading(platform: FantasyPlatform): boolean {
    return !this.isPlatformGenerated(platform) && !this.checkedGeneratedPlatforms.has(platform);
  }

  get salaryPlaceholder(): string {
    return this.selectedPlatform === 'draftkings' ? 'Salary' : 'Salary';
  }

  get salaryInputMode(): string {
    return this.selectedPlatform === 'fanduel' ? 'decimal' : 'numeric';
  }

  get salaryPattern(): string {
    return this.selectedPlatform === 'fanduel'
      ? '[0-9]{1,2}(\\.[0-9])?'
      : '[0-9]{4,5}';
  }

  get salaryMaxLength(): number {
    return this.selectedPlatform === 'fanduel' ? 4 : 5;
  }

  get totalSelectedSalary(): number {
    const total = this.availablePool.reduce((sum, player) => sum + Number(this.salaries.get(player.id) || 0), 0);

    return Math.round(total * 100) / 100;
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
    return !this.squadCompositionMessage();
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
    if (!this.hasRequiredPositionCoverage) return this.squadCompositionMessage();
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
    const minimum = this.minimumSquadPositionCount(position);
    return this.positionCount(this.availablePool, position) >= minimum;
  }

  squadPositionCount(position: string): number {
    return this.positionCount(this.availablePool, position);
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

  goToGeneratedTeams(game?: FantasyPlatform): void {
    if (this.navigatingToTeams || this.submitting) {
      return;
    }

    this.navigatingToTeams = true;
    this.router.navigate(['/user/profile'], {
      queryParams: {
        tab: 'teams',
        match: this.matchId,
        sport: this.currentSport(),
        game: game || this.selectedGame()
      }
    }).then(navigated => {
      if (!navigated) {
        this.navigatingToTeams = false;
      }
    }).catch(() => {
      this.navigatingToTeams = false;
      this.showAlert('Unable to open My Teams', 'Please check your connection and try again.', 'error');
    });
  }

  togglePlayingXi(): void {
    this.showPlayingXi = !this.showPlayingXi;
  }

  toggleSubstitutes(): void {
    this.showSubstitutes = !this.showSubstitutes;
  }

  nextStep(): void {
    if (this.step === 0) {
      this.showAlert('Choose platform', 'Select DraftKings or FanDuel to start the UCT workflow.', 'warning');
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

    if (this.isPlatformGenerated(platform)) {
      this.goToGeneratedTeams(platform);
      return;
    }

    if (this.selectedPlatform && this.selectedPlatform !== platform && this.availablePool.length) {
      this.resetUctSelections();
    }

    this.selectedPlatform = platform;
    this.generationStatus = this.generationMessages[platform][0];
    this.setActiveStep(1);
  }

  handlePlatformAction(platform: FantasyPlatform): void {
    if (this.isPlatformGenerated(platform)) {
      this.goToGeneratedTeams(platform);
      return;
    }

    if (this.matchDataLoading) {
      this.showAlert('Lineup is loading', 'Confirmed players are still loading. Please wait a moment.', 'info');
      return;
    }

    this.selectPlatform(platform);
  }

  salaryValue(player: UctPlayer): string {
    return this.salaries.get(player.id) || '';
  }

  updateSalary(player: UctPlayer, input: HTMLInputElement): void {
    if (!this.requiresSalary) return;

    const cleanValue = this.cleanSalaryInput(input.value);
    input.value = cleanValue;

    if (cleanValue) {
      this.salaries.set(player.id, cleanValue);
    } else {
      this.salaries.delete(player.id);
    }

    if (cleanValue && this.isValidSalaryValue(cleanValue) && this.isSalaryInputAlert() && !this.pendingSalaryPlayer()) {
      this.uctAlert = null;
    }
  }

  normalizeSalaryOnBlur(player: UctPlayer, input: HTMLInputElement): void {
    if (this.selectedPlatform !== 'fanduel') {
      return;
    }

    const currentValue = this.salaries.get(player.id) || '';
    const numericValue = Number(currentValue);

    if (!currentValue || !Number.isFinite(numericValue)) {
      return;
    }

    const normalizedValue = String(numericValue);
    input.value = normalizedValue;
    this.salaries.set(player.id, normalizedValue);
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

    if (this.selectedPlatform === 'fanduel' && event.key === '.') {
      const input = event.target as HTMLInputElement | null;

      if (input && !input.value.includes('.')) {
        return;
      }
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

    if (!this.canSelectAnotherSalaryPlayer(player)) {
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
    this.focusSalaryInput(player);
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

    if (!this.canSelectAnotherSalaryPlayer(player)) {
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
    this.focusSalaryInput(player);
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

    const compositionMessage = this.squadCompositionMessage();
    if (compositionMessage) {
      return compositionMessage;
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
    const invalidPlayer = this.availablePool.find(player => {
      const salaryValue = this.salaries.get(player.id) || '';

      return !this.isValidSalaryValue(salaryValue);
    });

    if (invalidPlayer) {
      const salaryValue = this.salaries.get(invalidPlayer.id) || '';

      if (!salaryValue) {
        return `${label} ${this.salaryPlaceholder.toLowerCase()} is required for ${invalidPlayer.player_name}.`;
      }

      if (!this.isValidSalaryValue(salaryValue)) {
        return this.salaryRangeMessage(invalidPlayer);
      }

      return this.salaryRangeMessage(invalidPlayer);
    }

    return '';
  }

  private cleanSalaryInput(value: string): string {
    if (this.selectedPlatform === 'fanduel') {
      const normalized = String(value || '').replace(/[^\d.]/g, '');
      const [whole = '', ...decimalParts] = normalized.split('.');
      const decimal = decimalParts.join('').slice(0, 1);
      const cleanWhole = whole.slice(0, 2);

      return decimalParts.length ? `${cleanWhole}.${decimal}` : cleanWhole;
    }

    return String(value || '').replace(/\D/g, '').slice(0, this.salaryMaxLength);
  }

  private isValidSalaryValue(value: string): boolean {
    const salary = Number(value);
    // Critical per-player entry rules: no total salary cap is enforced here.
    const validFormat = this.selectedPlatform === 'fanduel'
      ? /^\d{1,2}(?:\.\d)?$/.test(value)
      : /^\d{4,5}$/.test(value);
    const maxValue = this.selectedPlatform === 'fanduel' ? 29 : 15000;

    return validFormat
      && Number.isFinite(salary)
      && salary > 0
      && salary <= maxValue;
  }

  private canSelectAnotherSalaryPlayer(player: UctPlayer): boolean {
    if (!this.requiresSalary) {
      return true;
    }

    const pendingPlayer = this.pendingSalaryPlayer();

    if (!pendingPlayer || pendingPlayer.id === player.id) {
      return true;
    }

    const message = `Enter valid ${this.activePlatformName} ${this.salaryPlaceholder.toLowerCase()} for ${pendingPlayer.player_name}.`;

    this.showAlert(
      `${this.activePlatformName} ${this.salaryPlaceholder} required`,
      message,
      'warning'
    );
    this.focusSalaryInput(pendingPlayer);

    return false;
  }

  private focusSalaryInput(player: UctPlayer): void {
    if (!this.requiresSalary) {
      return;
    }

    setTimeout(() => {
      const input = document.querySelector<HTMLInputElement>(`input[data-salary-player-id="${player.id}"]`);

      input?.focus();
      input?.select();
    });
  }

  private isSalaryInputAlert(): boolean {
    const title = this.uctAlert?.title || '';

    return title === `${this.activePlatformName} ${this.salaryPlaceholder} required`;
  }

  private pendingSalaryPlayer(): UctPlayer | null {
    if (!this.requiresSalary) {
      return null;
    }

    return this.availablePool.find(player => !this.isValidSalaryValue(this.salaries.get(player.id) || '')) || null;
  }

  private squadCompositionMessage(): string {
    const gkCount = this.positionCount(this.availablePool, 'GK');
    const defCount = this.positionCount(this.availablePool, 'DEF');
    const midCount = this.positionCount(this.availablePool, 'MID');
    const fwdCount = this.positionCount(this.availablePool, 'FWD');

    if (gkCount < 1) {
      return 'My Squad must include at least 1 Goalkeeper (GK).';
    }

    if (this.selectedPlatform === 'draftkings') {
      const missing = [
        defCount < 2 ? `2 Defenders (DEF)` : '',
        midCount < 2 ? `2 Midfielders (MID)` : '',
        fwdCount < 2 ? `2 Forwards (FWD)` : ''
      ].filter(Boolean);

      if (missing.length) {
        return `DraftKings My Squad must include at least ${missing.join(', ')}.`;
      }

      if (defCount + midCount + fwdCount < 7) {
        return 'DraftKings My Squad needs at least 7 total DEF/MID/FWD players: 2 DEF, 2 MID, 2 FWD, plus 1 additional DEF/MID/FWD for UTIL.';
      }
    }

    if (this.selectedPlatform === 'fanduel') {
      const missing = [
        defCount < 2 ? '2 Defenders (DEF)' : '',
        midCount < 2 ? '2 Midfielders (MID)' : '',
        fwdCount < 1 ? '1 Forward (FWD)' : ''
      ].filter(Boolean);

      if (missing.length) {
        return `FanDuel My Squad must include at least ${missing.join(', ')} from the Playing XI or substitutes.`;
      }
    }

    if (!this.requiresSalary) {
      const missingPositions = ['GK', 'DEF', 'MID', 'FWD']
        .filter(position => this.positionCount(this.availablePool, position) < 1);

      if (missingPositions.length) {
        return `My Squad must include at least 1 ${missingPositions.join(', ')} player.`;
      }
    }

    return '';
  }

  private minimumSquadPositionCount(position: string): number {
    const normalized = String(position || '').toUpperCase();

    if (normalized === 'GK') return 1;
    if (this.selectedPlatform === 'draftkings' && ['DEF', 'MID', 'FWD'].includes(normalized)) return 2;
    if (this.selectedPlatform === 'fanduel' && ['DEF', 'MID'].includes(normalized)) return 2;
    if (this.selectedPlatform === 'fanduel' && normalized === 'FWD') return 1;

    return 1;
  }

  private salaryFormatHint(): string {
    return this.selectedPlatform === 'fanduel'
      ? 'FanDuel units greater than 0 up to 29 (decimals allowed)'
      : 'DraftKings salary from 1000 to 15000';
  }

  private salaryRangeMessage(player: UctPlayer): string {
    return this.selectedPlatform === 'fanduel'
      ? `Enter valid FanDuel units greater than 0 up to 29 for ${player.player_name}. Use at most one decimal digit, such as 1.2, 2.3 or 4.5.`
      : `Enter a valid DraftKings salary from 1000 to 15000 for ${player.player_name}.`;
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

    this.api.createUctTeams(payload)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
        
          this.stopGeneratingStatus();
          this.submitting = false;

          if (res?.success !== false) {
            const game = this.selectedGame();

            this.userGeneratedGames.add(game);
            this.api.rememberGeneratedGame(this.matchId, game);
            this.goToGeneratedTeams(game);
            return;
          }

          if (this.markPlatformGeneratedFromMessage(res?.message)) {
            return;
          }

          this.resetAfterSubmitFailure(res?.message || 'Unable to generate UCT teams. Please try again.');
        },
        error: (err) => {
          console.error('Generate UCT backend error:', err);
          this.stopGeneratingStatus();
          this.submitting = false;
          const message = err?.error?.message || err?.error?.error || '';

          if (this.markPlatformGeneratedFromMessage(message)) {
            return;
          }

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
    return player.logo || this.playerImageFallback;
  }

  usePlayerImageFallback(event: Event): void {
    const image = event.target as HTMLImageElement | null;

    if (image && image.src !== this.playerImageFallback) {
      image.src = this.playerImageFallback;
    }
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

  private currentSport(): string {
    const context = this.createUctContext as Record<string, unknown> | null;
    const match = this.detail?.match as unknown as Record<string, unknown> | undefined;

    const sport = this.firstValue(context, ['sport', 'sport_name', 'sportName'])
      || this.firstValue(match, ['sport', 'sport_name', 'sportName'])
      || 'Football';

    const normalized = sport.trim().toLowerCase();
    return normalized === 'soccer' ? 'football' : normalized;
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

  private generatedGames(): FantasyPlatform[] {
    const games = new Set<FantasyPlatform>();
    this.userGeneratedGames.forEach(game => games.add(game));
    this.addGeneratedGames(games, this.createUctContext?.generatedGames);

    const match = this.detail?.match as unknown as Record<string, unknown> | undefined;
    if (match) {
      this.addGeneratedGames(games, match['generated_games']);
      this.addGeneratedGames(games, match['generatedGames']);
      this.addGeneratedGames(games, match['games_generated']);
      this.addGeneratedGames(games, match['gamesGenerated']);
      this.addGeneratedGames(games, match['generated_platforms']);
      this.addGeneratedGames(games, match['generatedPlatforms']);
      this.addGeneratedGames(games, match['platforms_generated']);
      this.addGeneratedGames(games, match['platformsGenerated']);

      (['sorare', 'draftkings', 'fanduel'] as FantasyPlatform[]).forEach(game => {
        const values = [
          match[`${game}_generated`],
          match[`${game}_uct_generated`],
          match[`${game}_teams_generated`],
          match[`${game}_generated_at`],
          match[`${game}_teams_count`]
        ];

        if (values.some(value => this.isTruthy(value) || Number(value) > 0)) {
          games.add(game);
        }
      });
    }

    return Array.from(games);
  }

  private loadUserGeneratedGames(matchId: string): void {
    if (!matchId) {
      return;
    }

    this.api.GetMyTeams()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res: any) => {
          const rows = this.flattenGeneratedRows(res?.data);

          rows
            .filter((row: any) => this.rowMatchesCurrentMatch(row, matchId))
            .forEach((row: any) => this.addGeneratedGamesFromRow(this.userGeneratedGames, row));

          this.userGeneratedGames.forEach(game => {
            this.checkedGeneratedPlatforms.add(game);
            this.api.rememberGeneratedGame(matchId, game);
          });
        },
        error: () => {
        }
      });
  }

  private provisionalDetail(context: CreateUctContext): MatchDetail {
    const team = (name: string, code: string) => ({
      id: 0,
      name: name || code || 'TBD',
      short_name: code || this.shortCodeFromName(name),
      logo: '',
      playing_xi: [],
      substitutes: []
    });

    return {
      match: {
        id: Number(context.id || 0),
        provider_match_id: String(context.id || ''),
        series_id: '',
        seriesname: context.series || 'Football',
        matchdate: context.kickoffISO || '',
        start_time: context.kickoffISO || '',
        status: context.status || 'Scheduled',
        is_active: 1,
        lineupavailable: 1,
        lineup_status: 'available',
        venue_name: context.venue || '',
        hometeamname: context.homeName || '',
        awayteamname: context.awayName || '',
        home_team_name: context.homeCode || '',
        away_team_name: context.awayCode || ''
      },
      home_team: team(context.homeName || '', context.homeCode || ''),
      away_team: team(context.awayName || '', context.awayCode || ''),
      counts: {
        total_players: 0,
        home_playing_xi: 0,
        away_playing_xi: 0,
        home_substitutes: 0,
        away_substitutes: 0
      }
    };
  }

  private loadGeneratedGamesByPlatform(matchId: string): void {
    if (!matchId) {
      return;
    }

    (['sorare', 'draftkings', 'fanduel'] as FantasyPlatform[]).forEach(game => {
      this.authService.getUserMyTeams(matchId, this.currentSport(), game)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (res: any) => {
            const teams = this.generatedTeamsFromResponse(res);
            const totalTeams = Number(res?.total_teams || res?.data?.total_teams || teams.length || 0);

            if (res?.success !== false && totalTeams > 0) {
              this.userGeneratedGames.add(game);
              this.api.rememberGeneratedGame(matchId, game);
            }
            this.checkedGeneratedPlatforms.add(game);
          },
          error: () => {
            // Do not leave the UI in an endless checking state. The generation
            // endpoint still enforces the server-side duplicate rule.
            this.checkedGeneratedPlatforms.add(game);
          }
        });
    });
  }

  private generatedTeamsFromResponse(res: any): unknown[] {
    const collections = [
      res?.teams,
      res?.generated_teams,
      res?.generatedTeams,
      res?.lineups,
      res?.data?.teams,
      res?.data?.generated_teams,
      res?.data?.generatedTeams,
      res?.data?.lineups,
      Array.isArray(res?.data) ? res.data : null,
      Array.isArray(res) ? res : null,
      res?.team_a,
      res?.team_b
    ];

    return collections.find(collection => Array.isArray(collection) && collection.length > 0) || [];
  }


  private rowMatchesCurrentMatch(row: any, matchId: string): boolean {
    const ids = this.currentMatchIds(matchId);

    return [
      row?.match_id,
      row?.matchId,
      row?.id,
      row?.provider_match_id,
      row?.providerMatchId,
      row?.fixture_id,
      row?.fixtureId,
      row?.match?.id,
      row?.match?.provider_match_id,
      row?.match?.providerMatchId
    ].some(value => ids.has(String(value ?? '')));
  }

  private currentMatchIds(matchId: string): Set<string> {
    const match = this.detail?.match;

    return new Set([
      matchId,
      match?.id,
      match?.provider_match_id
    ]
      .map(value => String(value ?? '').trim())
      .filter(Boolean));
  }

  private flattenGeneratedRows(value: unknown): any[] {
    if (!Array.isArray(value)) {
      return [];
    }

    return value.flatMap((row: any) => {
      const nestedRows = [
        row?.matches,
        row?.games,
        row?.platforms,
        row?.generations,
        row?.generated_games
      ].filter(Array.isArray);

      return nestedRows.length ? [row, ...nestedRows.flat()] : [row];
    });
  }

  private addGeneratedGamesFromRow(games: Set<FantasyPlatform>, row: any): void {
    this.addGeneratedGames(games, row);
    const directGame = this.normalizeGame(row?.game || row?.fantasy_platform || row?.platform || row?.name);

    if (directGame) {
      games.add(directGame);
    }

    this.addGeneratedGames(games, row?.generated_games);
    this.addGeneratedGames(games, row?.generatedGames);
    this.addGeneratedGames(games, row?.games_generated);
    this.addGeneratedGames(games, row?.gamesGenerated);
    this.addGeneratedGames(games, row?.generated_platforms);
    this.addGeneratedGames(games, row?.generatedPlatforms);
    this.addGeneratedGames(games, row?.platforms_generated);
    this.addGeneratedGames(games, row?.platformsGenerated);
    this.addGeneratedGames(games, row?.teams_generated_by_game);
    this.addGeneratedGames(games, row?.teamsGeneratedByGame);
    this.addGeneratedGames(games, row?.platform_counts);
    this.addGeneratedGames(games, row?.platformCounts);
    this.addGeneratedGames(games, row?.game_counts);
    this.addGeneratedGames(games, row?.gameCounts);

    (['sorare', 'draftkings', 'fanduel'] as FantasyPlatform[]).forEach(game => {
      const values = [
        row?.[`${game}_generated`],
        row?.[`${game}_uct_generated`],
        row?.[`${game}_teams_generated`],
        row?.[`${game}_generated_at`],
        row?.[`${game}_teams_count`]
      ];

      if (values.some(value => this.isTruthy(value) || Number(value) > 0)) {
        games.add(game);
      }
    });
  }

  private markPlatformGeneratedFromMessage(message: unknown): boolean {
    const game = this.normalizeGame(message);

    if (!game || !/already\s+generated/i.test(String(message ?? ''))) {
      return false;
    }

    this.userGeneratedGames.add(game);
    this.api.rememberGeneratedGame(this.matchId, game);
    this.submitError = '';
    this.generatedTeams = [];
    this.showAlert('UCT already generated', `${this.platformLabel(game)} teams are already generated for this match. You can view them in My Teams.`, 'info');
    this.goToGeneratedTeams(game);

    return true;
  }

  private addGeneratedGames(games: Set<FantasyPlatform>, value: unknown): void {
    if (Array.isArray(value)) {
      value.forEach(item => this.addGeneratedGames(games, item));
      return;
    }

    if (value && typeof value === 'object') {
      const source = value as Record<string, unknown>;
      const game = this.normalizeGame(source['game'] || source['platform'] || source['fantasy_platform'] || source['name']);
      const generated = source['generated'] ?? source['teams_generated'] ?? source['is_generated'] ?? source['generated_at'];

      if (game && (generated === undefined || generated === null || this.isTruthy(generated) || Number(generated) > 0)) {
        games.add(game);
      }

      Object.entries(source).forEach(([key, nestedValue]) => {
        const keyedGame = this.normalizeGame(key);

        if (keyedGame && (this.isTruthy(nestedValue) || Number(nestedValue) > 0)) {
          games.add(keyedGame);
          return;
        }

        if (nestedValue && typeof nestedValue === 'object') {
          this.addGeneratedGames(games, nestedValue);
        }
      });
      return;
    }

    String(value ?? '')
      .split(/[,|]/)
      .map(item => this.normalizeGame(item))
      .filter((game): game is FantasyPlatform => !!game)
      .forEach(game => games.add(game));
  }

  private normalizeGame(value: unknown): FantasyPlatform | null {
    const text = String(value ?? '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '');

    if (text.includes('sorare')) return 'sorare';
    if (text.includes('draftkings') || text.includes('draftking') || text === 'dk') return 'draftkings';
    if (text.includes('fanduel') || text === 'fd') return 'fanduel';

    return null;
  }

  private platformLabel(game: FantasyPlatform): string {
    if (game === 'draftkings') return 'DraftKings';
    if (game === 'fanduel') return 'FanDuel';
    return 'Sorare';
  }

  private isTruthy(value: unknown): boolean {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'number') return value > 0;

    return ['1', 'true', 'yes', 'y', 'available', 'released', 'confirmed', 'ready', 'generated'].includes(
      String(value ?? '').trim().toLowerCase()
    );
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
      game: this.selectedGame(),
      team_a: this.homeAvailablePool.map(player => this.toGeneratePlayer(player)),
      team_b: this.awayAvailablePool.map(player => this.toGeneratePlayer(player))
    };
  }

  private selectedGame(): FantasyPlatform {
    switch (this.selectedPlatform) {
      case 'draftkings':
        return 'draftkings';
      case 'fanduel':
        return 'fanduel';
      case 'sorare':
      default:
        return 'sorare';
    }
  }

  private toGeneratePlayer(player: UctPlayer): UctGeneratePlayer {
    const payload: UctGeneratePlayer = {
      name: player.player_name,
      role: player.position,
      is_substitute: Number(player.is_substitute) === 1
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
      this.api.getMatchDetails(this.matchId, true)
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
      const elementId = step === 0
        ? 'platformCardGrid'
        : step === 7
          ? 'uctGeneratingPanel'
          : 'uctStepContent';
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
    const messages = this.selectedPlatform
      ? this.generationMessages[this.selectedPlatform]
      : this.generationMessages.sorare;
    let index = 0;
    this.generationStatus = messages[index];
    this.generatingStatusTimer = setInterval(() => {
      index = (index + 1) % messages.length;
      this.generationStatus = messages[index];
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
