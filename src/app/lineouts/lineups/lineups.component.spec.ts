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
