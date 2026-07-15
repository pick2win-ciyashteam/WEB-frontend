import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { BehaviorSubject, of } from 'rxjs';

import { LineupsComponent } from './lineups.component';
import { ApiService } from '../../core/services/api.service';
import { AuthModalService } from '../../core/services/auth-modal.service';
import { AuthService } from '../../core/services/auth.service';
import { ProfileService } from '../../core/services/profile.service';
import { NO_ERRORS_SCHEMA } from '@angular/core';

describe('LineupsComponent', () => {
  let component: LineupsComponent;
  let fixture: ComponentFixture<LineupsComponent>;
  const loggedIn$ = new BehaviorSubject<boolean>(true);

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [LineupsComponent],
      providers: [
        {
          provide: ApiService,
          useValue: {
            getSeriesMatches: () => of({ success: true, data: [] })
          }
        },
        {
          provide: AuthModalService,
          useValue: {
            open: jasmine.createSpy('open')
          }
        },
        {
          provide: AuthService,
          useValue: {
            loggedIn$: loggedIn$.asObservable(),
            isLoggedIn: () => true
          }
        },
        {
          provide: ProfileService,
          useValue: {
            profile$: of(null),
            loadProfile: () => of(null)
          }
        },
        {
          provide: Router,
          useValue: {
            navigate: jasmine.createSpy('navigate')
          }
        }
      ],
      schemas: [NO_ERRORS_SCHEMA]
    });
    fixture = TestBed.createComponent(LineupsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('counts a today match with yes lineup flag as ready for UCT', () => {
    setMatches([seriesMatch({ lineupavailable: 'yes' })]);

    expect(component.readyAndNotGeneratedCount).toBe(1);
  });

  it('counts a today match with lineups available status as ready for UCT', () => {
    setMatches([seriesMatch({ lineupavailable: 0, lineup_status: 'Lineups Available' })]);

    expect(component.readyAndNotGeneratedCount).toBe(1);
  });

  it('accepts released-lineup aliases returned by the backend', () => {
    setMatches([seriesMatch({ is_lineup_released: 1 })]);

    expect(component.readyAndNotGeneratedCount).toBe(1);
  });

  it('accepts announced lineup status returned by the backend', () => {
    setMatches([seriesMatch({ lineup_status: 'announced' })]);

    expect(component.readyAndNotGeneratedCount).toBe(1);
  });

  it('counts a today match with starting lineup counts as ready for UCT', () => {
    setMatches([seriesMatch({
      lineupavailable: 0,
      lineup_status: 'not_available',
      home_playing_xi_count: 11,
      away_playing_xi_count: 11
    })]);

    expect(component.readyAndNotGeneratedCount).toBe(1);
  });

  it('counts a today match with a non-zero numeric lineup flag as ready for UCT', () => {
    setMatches([seriesMatch({ lineupavailable: '2' })]);

    expect(component.readyAndNotGeneratedCount).toBe(1);
  });

  it('counts a today match with nested playing XI arrays as ready for UCT', () => {
    setMatches([seriesMatch({
      lineupavailable: 0,
      lineup_status: 'not_available',
      home_team: { playing_xi: Array.from({ length: 11 }) },
      away_team: { playing_xi: Array.from({ length: 11 }) }
    })]);

    expect(component.readyAndNotGeneratedCount).toBe(1);
  });

  it('does not count generated teams as ready for UCT', () => {
    setMatches([seriesMatch({ lineupavailable: 1, teams_generated: 'yes' })]);

    expect(component.readyAndNotGeneratedCount).toBe(0);
  });

  it('maps all active backend series matches and shows venue details', () => {
    const backendMatches = [
      seriesMatch({
        id: 240002,
        provider_match_id: '19609133',
        start_time: '2026-06-14T11:05:00.000Z',
        lineupavailable: 1,
        venue_name: 'Los Angeles Stadium',
        venue_city: 'Inglewood',
        seriesname: 'World Cup',
        hometeamname: 'United States',
        awayteamname: 'Paraguay',
        home_team_name: 'USA',
        away_team_name: 'PAR'
      }),
      seriesMatch({
        id: 210009,
        provider_match_id: '19609158',
        start_time: '2026-06-14T11:30:00.000Z',
        venue_name: 'Houston Stadium',
        venue_city: 'Houston',
        seriesname: 'World Cup',
        home_team_name: 'GER',
        away_team_name: 'CUW'
      }),
      seriesMatch({
        id: 210010,
        provider_match_id: '19609138',
        start_time: '2026-06-14T14:30:00.000Z',
        venue_name: 'Dallas Stadium',
        venue_city: 'Arlington',
        seriesname: 'World Cup',
        home_team_name: 'NED',
        away_team_name: 'JPN'
      }),
      seriesMatch({
        id: 210011,
        provider_match_id: '19609157',
        start_time: '2026-06-14T17:30:00.000Z',
        venue_name: 'Philadelphia Stadium',
        venue_city: 'Philadelphia',
        seriesname: 'World Cup',
        home_team_name: 'CIV',
        away_team_name: 'ECU'
      })
    ];

    (component as any).matches = (component as any).mapSeriesMatches([{
      id: 1692855,
      seriesid: '732',
      name: 'World Cup',
      season: null,
      start_date: null,
      end_date: null,
      created_at: '2026-06-14T00:40:52.000Z',
      status: 'active',
      is_selected: 1,
      total_matches: 4,
      matches: backendMatches
    }]);

    expect(component.visibleMatches.length).toBe(4);
    expect(component.visibleMatches[0].league).toBe('World Cup');
    expect(component.visibleMatches[0].venue).toBe('Los Angeles Stadium, Inglewood');
    expect(component.visibleMatches.map(match => match.home.code)).toEqual(['USA', 'GER', 'NED', 'CIV']);
    expect(component.visibleMatches[0].home.name).toBe('United States');
    expect(component.visibleMatches[0].away.name).toBe('Paraguay');
  });

  it('uses match_name as a full-name fallback when full team fields are missing', () => {
    setMatches([seriesMatch({
      home_team_name: 'GER',
      away_team_name: 'CUW',
      hometeamname: undefined,
      awayteamname: undefined,
      match_name: 'Germany vs Curacao'
    })]);

    expect(component.visibleMatches[0].home.code).toBe('GER');
    expect(component.visibleMatches[0].home.name).toBe('Germany');
    expect(component.visibleMatches[0].away.code).toBe('CUW');
    expect(component.visibleMatches[0].away.name).toBe('Curacao');
  });

  function setMatches(matches: any[]): void {
    (component as any).matches = (component as any).mapSeriesMatches([{
      id: 1,
      seriesid: 'series-1',
      name: 'Test League',
      season: '2026',
      start_date: null,
      end_date: null,
      created_at: '',
      status: 'active',
      is_selected: 1,
      total_matches: matches.length,
      matches
    }]);
  }

  function seriesMatch(overrides: Record<string, unknown>): any {
    return {
      id: 10,
      provider_match_id: 'provider-10',
      series_id: '1',
      start_time: new Date().toISOString(),
      status: 'UPCOMING',
      matchdate: new Date().toISOString(),
      lineupavailable: 0,
      lineup_status: 'not_available',
      is_active: 1,
      home_team_name: 'Home FC',
      away_team_name: 'Away FC',
      home_team_logo: '',
      away_team_logo: '',
      teams_generated: false,
      generated_teams_count: 0,
      generated_at: null,
      ...overrides
    };
  }
});
