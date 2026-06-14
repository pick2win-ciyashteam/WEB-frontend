import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map, catchError, of } from 'rxjs';
import { ApiService } from '../services/api.service';

export const createUctGuard: CanActivateFn = (route) => {
  const api = inject(ApiService);
  const router = inject(Router);

  const matchId = route.paramMap.get('id');

  if (!matchId) {
    return router.createUrlTree(['/user/profile'], {
      queryParams: { tab: 'teams' }
    });
  }

  return api.getSeriesMatches().pipe(
    map((res: any) => {
      const match = (res?.data || [])
        .flatMap((s: any) => s.matches || [])
        .find((m: any) => String(m.id || m.provider_match_id) === String(matchId));

      if (!match) {
        return router.createUrlTree(['/user/profile'], {
          queryParams: { tab: 'teams', match: matchId }
        });
      }

      const status = String(match.status || '').toUpperCase();

      const lineupReady = isTruthy(match.lineupavailable)
        || isTruthy(match.lineup_available)
        || isTruthy(match.lineups_available)
        || isTruthy(match.is_lineup_available)
        || ['available', 'released', 'confirmed', 'ready'].includes(
          String(match.lineup_status || '').toLowerCase()
        );

      const alreadyGenerated = isTruthy(match.teams_generated)
        || isTruthy(match.teamsGenerated)
        || isTruthy(match.uct_generated)
        || isTruthy(match.is_uct_generated)
        || Number(match.generated_teams_count || 0) > 0
        || !!match.generated_at;

      const startTime = new Date(match.start_time || match.matchdate).getTime();
      const matchStarted = Number.isFinite(startTime) && Date.now() >= startTime;

      const blockedStatus = ['LIVE', 'FINISHED', 'FT', 'ENDED', 'CANCELLED', 'POSTPONED'].includes(status);

      if (!lineupReady || alreadyGenerated || matchStarted || blockedStatus) {
        return router.createUrlTree(['/user/profile'], {
          queryParams: {
            tab: 'teams',
            match: matchId
          }
        });
      }

      return true;
    }),
    catchError(() =>
      of(router.createUrlTree(['/user/profile'], {
        queryParams: { tab: 'teams', match: matchId }
      }))
    )
  );
};

function isTruthy(value: any): boolean {
  if (value === true || value === 1) return true;

  const text = String(value ?? '').trim().toLowerCase();

  return ['1', 'true', 'yes', 'y', 'available', 'released', 'confirmed', 'ready'].includes(text);
}