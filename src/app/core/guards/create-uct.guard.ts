import { inject } from '@angular/core';
import { CanActivateFn, CanDeactivateFn, Router } from '@angular/router';
import { map, catchError, of } from 'rxjs';
import { ApiService } from '../services/api.service';

export interface PendingGenerationComponent {
  canDeactivate: () => boolean;
}

export const createUctGuard: CanActivateFn = (route) => {
  const api = inject(ApiService);
  const router = inject(Router);

  const matchId = route.paramMap.get('id');

  if (!matchId) {
    return router.createUrlTree(['/user/profile'], {
      queryParams: { tab: 'teams' }
    });
  }

  // Lineups has already loaded and validated this match. Reuse that context so
  // navigation is not held up by fetching the complete series list again.
  const navigationMatch = router.getCurrentNavigation()?.extras.state?.['lineoutMatch'];

  if (isMatchingNavigationContext(navigationMatch, matchId)) {
    return canCreateUct(navigationMatch)
      ? true
      : teamsUrl(router, matchId);
  }

  return api.getSeriesMatches().pipe(
    map((res: any) => {
      const match = (res?.data || [])
        .flatMap((s: any) => s.matches || [])
        .find((m: any) => String(m.id || m.provider_match_id) === String(matchId));

      if (!match) {
        return teamsUrl(router, matchId);
      }

      return canCreateUct(match) ? true : teamsUrl(router, matchId);
    }),
    catchError(() => of(teamsUrl(router, matchId)))
  );
};

export const preventPendingUctGenerationGuard: CanDeactivateFn<PendingGenerationComponent> = (component) => {
  return component.canDeactivate();
};

function isMatchingNavigationContext(match: any, matchId: string): boolean {
  return !!match && String(match.id ?? match.provider_match_id ?? '') === String(matchId);
}

function canCreateUct(match: any): boolean {
  const status = String(match.status || '').toUpperCase();
  const lineupReady = isTruthy(match.lineupReady)
    || isTruthy(match.lineupavailable)
    || isTruthy(match.lineup_available)
    || isTruthy(match.lineups_available)
    || isTruthy(match.is_lineup_available)
    || ['available', 'released', 'confirmed', 'ready'].includes(
      String(match.lineup_status || '').toLowerCase()
    );
  const visibleGeneratedGames = generatedGames(match)
    .filter(game => game === 'draftkings' || game === 'fanduel');
  const alreadyGenerated = visibleGeneratedGames.length >= 2 || generatedGameCount(match) >= 2;
  const startTime = new Date(match.kickoffISO || match.start_time || match.matchdate).getTime();
  const matchStarted = Number.isFinite(startTime) && Date.now() >= startTime;
  const blockedStatus = ['LIVE', 'FINISHED', 'FT', 'ENDED', 'CANCELLED', 'POSTPONED'].includes(status);

  return lineupReady && !alreadyGenerated && !matchStarted && !blockedStatus;
}

function teamsUrl(router: Router, matchId: string) {
  return router.createUrlTree(['/user/profile'], {
    queryParams: { tab: 'teams', match: matchId }
  });
}

function isTruthy(value: any): boolean {
  if (value === true || value === 1) return true;

  const text = String(value ?? '').trim().toLowerCase();

  return ['1', 'true', 'yes', 'y', 'available', 'released', 'confirmed', 'ready'].includes(text);
}

function generatedGameCount(match: any): number {
  const value = firstValue(match, [
    'generated_game_count',
    'generated_games_count',
    'games_generated_count',
    'platforms_generated_count',
    'uct_generated_count'
  ]);
  const count = Number(value);

  return Number.isFinite(count) ? count : 0;
}

function generatedGames(match: any): string[] {
  const games = new Set<string>();

  addGeneratedGames(games, firstValue(match, [
    'generated_games',
    'generatedGames',
    'games_generated',
    'gamesGenerated',
    'generated_platforms',
    'generatedPlatforms',
    'platforms_generated',
    'platformsGenerated'
  ]));

  ['sorare', 'draftkings', 'fanduel'].forEach(game => {
    const values = [
      match?.[`${game}_generated`],
      match?.[`${game}_uct_generated`],
      match?.[`${game}_teams_generated`],
      match?.[`${game}_generated_at`],
      match?.[`${game}_teams_count`]
    ];

    if (values.some(value => isTruthy(value) || Number(value) > 0)) {
      games.add(game);
    }
  });

  return Array.from(games);
}

function addGeneratedGames(games: Set<string>, value: any): void {
  if (Array.isArray(value)) {
    value.forEach(item => addGeneratedGames(games, item));
    return;
  }

  if (value && typeof value === 'object') {
    const game = normalizeGame(value.game || value.platform || value.fantasy_platform || value.name);
    const generated = value.generated ?? value.teams_generated ?? value.is_generated ?? value.generated_at;

    if (game && (generated === undefined || generated === null || isTruthy(generated) || Number(generated) > 0)) {
      games.add(game);
    }
    return;
  }

  String(value ?? '')
    .split(/[,|]/)
    .map(item => normalizeGame(item))
    .filter((game): game is string => !!game)
    .forEach(game => games.add(game));
}

function normalizeGame(value: any): string | null {
  const text = String(value ?? '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '');

  if (text === 'sorare') return 'sorare';
  if (text === 'draftkings' || text === 'draftking' || text === 'dk') return 'draftkings';
  if (text === 'fanduel' || text === 'fd') return 'fanduel';

  return null;
}

function firstValue(source: any, keys: string[]): any {
  return keys.map(key => source?.[key]).find(value => value !== undefined && value !== null);
}
