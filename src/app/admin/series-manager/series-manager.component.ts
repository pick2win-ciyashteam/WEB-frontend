import { Component, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { AdminSeriesMatch, AdminSeriesStoredMatch } from 'src/app/core/interfaces/admin';
import { AdminService } from 'src/app/core/services/admin.service';

type SeriesManagerTab = 'fixtures' | 'active';

@Component({
  selector: 'app-series-manager',
  templateUrl: './series-manager.component.html',
  styleUrls: ['./series-manager.component.css']
})
export class SeriesManagerComponent implements OnInit {
  activeTab: SeriesManagerTab = 'fixtures';
  fixturesLoading = false;
  toggleLoading = false;
  activeSeriesLoading = false;
  message = '';
  errorMessage = '';
  fixtures: AdminSeriesMatch[] = [];
  activeSeries: AdminSeriesMatch[] = [];
  selectedMatchIds = new Set<number>();
  confirmToggleOpen = false;
  selectedSeries: AdminSeriesMatch | null = null;

  dateForm = this.fb.group({
    from: ['', Validators.required],
    to: ['', Validators.required]
  });

  constructor(private fb: FormBuilder, private adminService: AdminService) { }

  get selectedMatchIdsArray(): string {
    return Array.from(this.selectedMatchIds).join(', ');
  }

  get selectedFixtures(): AdminSeriesMatch[] {
    return this.fixtures.filter((item) => {
      const matchId = this.getMatchId(item);
      return matchId ? this.selectedMatchIds.has(matchId) : false;
    });
  }

  ngOnInit(): void {
    this.loadActiveSeries();
  }

  setTab(tab: SeriesManagerTab): void {
    this.activeTab = tab;

    if (tab === 'active' && !this.activeSeries.length) {
      this.loadActiveSeries();
    }
  }

  loadFixtures(): void {
    this.dateForm.markAllAsTouched();
    this.message = '';
    this.errorMessage = '';

    if (this.dateForm.invalid) {
      this.errorMessage = 'Please select from and to dates.';
      return;
    }

    this.fixturesLoading = true;

    this.adminService.getFixtures({
      from: this.dateForm.value.from || '',
      to: this.dateForm.value.to || ''
    }).subscribe({
      next: (res) => {
        this.fixtures = this.extractList(res);
        this.selectedMatchIds.clear();
        this.fixturesLoading = false;
        this.message = this.fixtures.length ? 'Fixtures loaded successfully.' : 'No fixtures found for selected dates.';
      },
      error: (err) => {
        console.log('get fixtures error:', err);
        this.fixtures = [];
        this.fixturesLoading = false;
        this.errorMessage = err?.error?.message || err?.error?.error || 'Unable to load fixtures.';
      }
    });
  }

  loadActiveSeries(): void {
    this.activeSeriesLoading = true;

    this.adminService.getActiveSeries().subscribe({
      next: (res) => {
        console.log('active series response:', res);
        this.activeSeries = this.extractList(res);
        console.log('active series list:', this.activeSeries);
        this.activeSeriesLoading = false;
      },
      error: (err) => {
        console.log('get active series error:', err);
        this.activeSeries = [];
        this.activeSeriesLoading = false;
      }
    });
  }

  openSeriesMatches(item: AdminSeriesMatch): void {
    this.selectedSeries = this.activeSeries.find((series) => series.id === item.id || series.seriesid === item.seriesid) || item;
    console.log('selected series:', this.selectedSeries);
    console.log('selected series matches:', this.getSeriesMatches(this.selectedSeries));
  }

  closeSeriesMatches(): void {
    this.selectedSeries = null;
  }

  getSeriesMatches(item: AdminSeriesMatch | null): AdminSeriesStoredMatch[] {
    if (!item) {
      return [];
    }

    const matches = item.matches ?? item['series_matches'] ?? item['match_data'];

    if (Array.isArray(matches)) {
      return matches;
    }

    if (typeof matches === 'string') {
      try {
        const parsed = JSON.parse(matches);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    }

    if (matches && typeof matches === 'object' && Array.isArray(matches.data)) {
      return matches.data;
    }

    return [];
  }

  toggleFixtureSelection(item: AdminSeriesMatch, checked: boolean): void {
    const matchId = this.getMatchId(item);

    if (!matchId) {
      return;
    }

    if (checked) {
      this.selectedMatchIds.add(matchId);
      return;
    }

    this.selectedMatchIds.delete(matchId);
  }

  isSelected(item: AdminSeriesMatch): boolean {
    const matchId = this.getMatchId(item);
    return matchId ? this.selectedMatchIds.has(matchId) : false;
  }

  openToggleConfirm(): void {
    this.message = '';
    this.errorMessage = '';

    if (!this.selectedMatchIds.size) {
      this.errorMessage = 'Please select fixtures first.';
      return;
    }

    this.confirmToggleOpen = true;
  }

  closeToggleConfirm(): void {
    if (this.toggleLoading) {
      return;
    }

    this.confirmToggleOpen = false;
  }

  confirmToggleSelectedMatches(): void {
    this.message = '';
    this.errorMessage = '';

    const matchIds = Array.from(this.selectedMatchIds);

    if (!matchIds.length) {
      this.errorMessage = 'Please select fixtures first.';
      this.confirmToggleOpen = false;
      return;
    }

    this.toggleLoading = true;

    this.adminService.toggleMatches({
      match_ids: matchIds,
      is_active: true
    }).subscribe({
      next: (res) => {
        this.toggleLoading = false;
        this.confirmToggleOpen = false;
        this.message = res?.message || 'Selected matches activated successfully.';
        this.selectedMatchIds.clear();
        this.loadActiveSeries();
        this.activeTab = 'active';
      },
      error: (err) => {
        console.log('toggle matches error:', err);
        this.toggleLoading = false;
        this.confirmToggleOpen = false;
        this.errorMessage = err?.error?.message || err?.error?.error || 'Unable to toggle selected matches.';
      }
    });
  }

  getMatchId(item: AdminSeriesMatch): number | null {
    const rawId = item.match_id ?? item['fixture_id'] ?? item.id;
    const id = Number(rawId);
    return Number.isFinite(id) && id > 0 ? id : null;
  }

  getMatchName(item: AdminSeriesMatch): string {
    return this.toText(item.match_name || item.name || item['fixture_name']);
  }

  getTeams(item: AdminSeriesMatch): string {
    const home = this.getTeamName(item, 'home');
    const away = this.getTeamName(item, 'away');

    if (home || away) {
      return `${home || '-'} vs ${away || '-'}`;
    }

    return '-';
  }

  getMatchDate(item: AdminSeriesMatch): string {
    return this.toText(item.match_date || item['date'] || item['starting_at'] || item.start_date);
  }

  getSeriesId(item: AdminSeriesMatch): string {
    return this.toText(item.seriesid || item['league']?.id || item['league_id']);
  }

  getLeagueName(item: AdminSeriesMatch): string {
    return this.toText(item['league']?.name || item['league_name'] || item['series_name']);
  }

  getVenue(item: AdminSeriesMatch): string {
    const venueName = item['venue']?.name || item['venue_name'];
    const city = item['venue']?.city || item['city'];

    if (venueName || city) {
      return [venueName, city].filter(Boolean).join(', ');
    }

    return '-';
  }

  getTeamName(item: AdminSeriesMatch, side: 'home' | 'away'): string {
    const value = item[side] as any;

    if (value && typeof value === 'object') {
      return this.toText(value.name);
    }

    return this.toText(value || item[`${side}_name`] || (side === 'home' ? item['localteam_name'] : item['visitorteam_name']));
  }

  getTeamImage(item: AdminSeriesMatch, side: 'home' | 'away'): string {
    const value = item[side] as any;

    if (value && typeof value === 'object') {
      return this.toText(value.image, '');
    }

    return this.toText(item[`${side}_image`], '');
  }

  getScore(item: AdminSeriesMatch): string {
    const score = item['score'];

    if (score && typeof score === 'object') {
      const home = score.home ?? '-';
      const away = score.away ?? '-';
      return `${home} - ${away}`;
    }

    return '-';
  }

  getStoredMatchTeams(match: AdminSeriesStoredMatch): string {
    return `${this.toText(match.home_team_name)} vs ${this.toText(match.away_team_name)}`;
  }

  getStoredMatchLogo(match: AdminSeriesStoredMatch, side: 'home' | 'away'): string {
    return this.toText(side === 'home' ? match.home_team_logo : match.away_team_logo, '');
  }

  getStoredMatchName(match: AdminSeriesStoredMatch, side: 'home' | 'away'): string {
    return this.toText(side === 'home' ? match.home_team_name : match.away_team_name);
  }

  private toText(value: any, fallback = '-'): string {
    if (value === null || value === undefined || value === '') {
      return fallback;
    }

    return String(value);
  }

  private extractList(res: any): AdminSeriesMatch[] {
    if (Array.isArray(res?.data)) {
      return res.data;
    }

    if (Array.isArray(res?.data?.data)) {
      return res.data.data;
    }

    if (Array.isArray(res?.fixtures)) {
      return res.fixtures;
    }

    if (Array.isArray(res?.data?.fixtures)) {
      return res.data.fixtures;
    }

    return Array.isArray(res) ? res : [];
  }
}
