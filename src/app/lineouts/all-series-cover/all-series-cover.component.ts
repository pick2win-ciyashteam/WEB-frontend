import { Component, Input } from '@angular/core';

interface CoveredSeries {
  flag: string;
  region: string;
  name: string;
  season: string;
  matches: string;
  note: string;
}

interface CoverageTier {
  key: 't1' | 't2' | 't3';
  label: string;
  title: string;
  meta: string;
  series: CoveredSeries[];
}

@Component({
  selector: 'app-all-series-cover',
  templateUrl: './all-series-cover.component.html',
  styleUrls: ['./all-series-cover.component.css']
})
export class AllSeriesCoverComponent {
  @Input() embedded = false;

  readonly tiers: CoverageTier[] = [
    {
      key: 't1',
      label: 'Tier 01 - Absolute Core',
      title: 'Mandatory - highest UCT & fantasy value',
      meta: '10 leagues - around 70% of expected traffic',
      series: [
        { flag: 'GB', region: 'England', name: 'English Premier League', season: 'Aug 2025 -> May 2026', matches: '380 matches', note: 'Largest fantasy ecosystem globally' },
        { flag: 'UEFA', region: 'UEFA - Europe', name: 'UEFA Champions League', season: 'Sep 2025 -> Jun 2026', matches: '189 matches', note: 'New 36-team Swiss format' },
        { flag: 'FIFA', region: 'Global - FIFA', name: 'FIFA World Cup 2026', season: 'Jun 2026 -> Jul 2026', matches: '104 matches', note: '48-team expanded format' },
        { flag: 'ES', region: 'Spain', name: 'LaLiga EA Sports', season: 'Aug 2025 -> May 2026', matches: '380 matches', note: 'Global clubs - analytics audience' },
        { flag: 'IT', region: 'Italy', name: 'Serie A Enilive', season: 'Aug 2025 -> May 2026', matches: '380 matches', note: 'Tactical fantasy users' },
        { flag: 'DE', region: 'Germany', name: 'Bundesliga', season: 'Aug 2025 -> May 2026', matches: '306 matches', note: 'Analytics-heavy engagement' },
        { flag: 'UEFA', region: 'UEFA - Europe', name: 'UEFA Europa League', season: 'Sep 2025 -> May 2026', matches: '189 matches', note: 'Strong midweek usage' },
        { flag: 'FR', region: 'France', name: "Ligue 1 McDonald's", season: 'Aug 2025 -> May 2026', matches: '306 matches', note: '18-team format since 2023-24' },
        { flag: 'UEFA', region: 'UEFA - Europe', name: 'UEFA European Championship', season: 'Periodic - Euro 2028', matches: '51 matches', note: 'UK + Ireland co-hosted' },
        { flag: 'FIFA', region: 'Global - FIFA', name: 'FIFA World Cup Qualification', season: 'Multi-year campaigns', matches: '~870 matches', note: 'All confederations combined' }
      ]
    },
    {
      key: 't2',
      label: 'Tier 02 - High Value',
      title: 'Strong regional and cup competition coverage',
      meta: '10 leagues - around 25% of expected traffic',
      series: [
        { flag: 'US', region: 'USA - Canada', name: 'Major League Soccer (MLS)', season: 'Feb 2026 -> Dec 2026', matches: '510 matches', note: '30 teams - season-long' },
        { flag: 'NL', region: 'Netherlands', name: 'Eredivisie', season: 'Aug 2025 -> May 2026', matches: '306 matches', note: '18 teams - technical play' },
        { flag: 'PT', region: 'Portugal', name: 'Primeira Liga (Liga Portugal)', season: 'Aug 2025 -> May 2026', matches: '306 matches', note: '18 teams - European pathway' },
        { flag: 'UEFA', region: 'UEFA - Europe', name: 'UEFA Nations League', season: 'Sep 2026 -> Mar 2027', matches: '163 matches', note: 'League A/B/C/D + promotion' },
        { flag: 'FIFA', region: 'Global - FIFA', name: 'FIFA Club World Cup', season: 'Jun 2029', matches: '63 matches', note: '32-team expanded format' },
        { flag: 'UEFA', region: 'UEFA - Europe', name: 'UEFA Conference League', season: 'Sep 2025 -> May 2026', matches: '141 matches', note: 'Third UEFA club competition' },
        { flag: 'SCO', region: 'Scotland', name: 'Scottish Premiership', season: 'Aug 2025 -> May 2026', matches: '228 matches', note: '12 teams - post-split format' },
        { flag: 'GB', region: 'England - 2nd tier', name: 'EFL Championship', season: 'Aug 2025 -> May 2026', matches: '552 matches', note: '24 teams - 46-round season' },
        { flag: 'GB', region: 'England - cup', name: 'The Emirates FA Cup', season: 'Aug 2025 -> May 2026', matches: '~150 matches', note: '6 rounds + replays + final' },
        { flag: 'GB', region: 'England - cup', name: 'EFL Carabao Cup', season: 'Aug 2025 -> Mar 2026', matches: '~94 matches', note: 'English football League Cup' }
      ]
    },
    {
      key: 't3',
      label: 'Tier 03 - Established',
      title: 'Smaller markets and specialist competitions',
      meta: '10 leagues - around 5% of expected traffic',
      series: [
        { flag: 'BE', region: 'Belgium', name: 'Belgian Pro League (Jupiler)', season: 'Jul 2025 -> May 2026', matches: '270 matches', note: 'Regular + championship playoffs' },
        { flag: 'DK', region: 'Denmark', name: 'Danish Superliga', season: 'Jul 2025 -> May 2026', matches: '192 matches', note: '12 teams - 32 regular + 12 final' },
        { flag: 'SE', region: 'Sweden', name: 'Allsvenskan', season: 'Mar 2026 -> Nov 2026', matches: '240 matches', note: '16 teams - spring-to-autumn' },
        { flag: 'NO', region: 'Norway', name: 'Eliteserien', season: 'Apr 2026 -> Nov 2026', matches: '240 matches', note: '16 teams - spring-to-autumn' },
        { flag: 'AT', region: 'Austria', name: 'Austrian Bundesliga', season: 'Jul 2025 -> May 2026', matches: '192 matches', note: '12 teams - championship split' },
        { flag: 'CH', region: 'Switzerland', name: 'Swiss Super League', season: 'Jul 2025 -> May 2026', matches: '180 matches', note: '12 teams - 36-round season' },
        { flag: 'TR', region: 'Turkey', name: 'Trendyol Super Lig', season: 'Aug 2025 -> May 2026', matches: '342 matches', note: '19 teams - 38-round season' },
        { flag: 'UEFA', region: 'UEFA - Europe', name: 'UEFA Youth League', season: 'Sep 2025 -> Apr 2026', matches: '96 matches', note: 'U-19 champions academy track' },
        { flag: 'SA', region: 'South America', name: 'CONMEBOL Libertadores', season: 'Feb 2026 -> Nov 2026', matches: '157 matches', note: 'Continental club championship' },
        { flag: 'SA', region: 'South America', name: 'CONMEBOL Copa America', season: 'Periodic (next: 2027)', matches: '32 matches', note: '16-team continental cup' }
      ]
    }
  ];

  trackTier(_: number, tier: CoverageTier): string {
    return tier.key;
  }

  trackSeries(_: number, series: CoveredSeries): string {
    return series.name;
  }
}
