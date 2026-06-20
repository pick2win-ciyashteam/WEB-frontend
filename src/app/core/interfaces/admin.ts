export interface AdminLoginPayload {
  email: string;
  password: string;
  twoFaCode: string;
}

export interface AdminFixturesPayload {
  from: string;
  to: string;
}

export interface AdminMatchTogglePayload {
  match_ids: number[];
  is_active: boolean;
}

export interface AdminSeriesMatch {
  id?: number;
  seriesid?: string;
  name?: string;
  season?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  status?: string | null;
  is_selected?: number;
  created_at?: string;
  match_id?: number | string | null;
  match_name?: string | null;
  match_date?: string | null;
  match_status?: string | null;
  home?: string | null;
  home_image?: string | null;
  away?: string | null;
  away_image?: string | null;
  total_matches?: number;
  matches?: AdminSeriesStoredMatch[];
  [key: string]: any;
}

export interface AdminSeriesStoredMatch {
  id: number;
  provider_match_id: string;
  series_id: string;
  start_time: string;
  status: string;
  lineupavailable: number;
  lineup_status: string;
  is_active: number;
  home_team_name: string;
  away_team_name: string;
  home_team_logo: string;
  away_team_logo: string;
  [key: string]: any;
}

export interface AdminCountryCreatePayload {
  name: string;
  code: string;
  dial_code: string;
  flag: string;
  is_active: number;
}

export interface AdminLeagueCreatePayload {
  name: string;
  region: string;
  tier: string;
  matches_30d: number;
}

export interface AdminLeague {
  id: number;
  league_code: string;
  name: string;
  region: string;
  tier: string;
  matches_30d: number;
  is_visible: boolean;
  created_at: string;
}

export interface AdminLeaguesReports {
  success: boolean;
  kpis: {
    total_leagues: number;
    shown_on_website: number;
    hidden: number;
    matches_30d: number;
  };
  leagues: AdminLeague[];
}

export interface AdminCountry {
  id: number;
  name: string;
  code: string;
  dial_code: string;
  flag: string;
  is_active?: number;
  created_at?: string;
  updated_at?: string;
}

export interface AdminBannerCreatePayload {
  name: string;
  heading: string;
  image_url: string;
  description: string;
  link: string;
  button: string;
  sort_order?: number;
}

export interface AdminBanner {
  id: number;
  name: string;
  heading?: string;
  image_url: string;
  description: string;
  link: string;
  button?: string;
  sort_order?: number;
  is_active?: number;
  created_at?: string;
  updated_at?: string;
}

export interface AdminSubscriptionCreatePayload {
  name: string;
  subtitle: string;
  coins: number;
  matches: number;
  price: number;
  currency: string;
  currency_symbol: string;
  validity_days: number;
  is_popular: number;
  is_pro: number;
  sort_order: number;
  is_active?: number;
  regular_price?: number;
  offer_price?: number;
  offer_label?: string;
  is_offer_active?: number;
}

export interface AdminSubscription extends AdminSubscriptionCreatePayload {
  id: number;
  is_active?: number;
  created_at?: string;
  updated_at?: string;
}

export interface AdminDashboardReportMetric {
  count: number;
  percentage?: string;
  this_week?: number;
}

export interface AdminDashboardReports {
  total_users: AdminDashboardReportMetric;
  verified: AdminDashboardReportMetric;
  coin_pack_buyers: AdminDashboardReportMetric;
  active_30d: AdminDashboardReportMetric;
  dormant_30d: AdminDashboardReportMetric;
}

export interface AdminGeographyTotals {
  total_users: number;
  verified: number;
  coin_buyers: number;
  active_30d: number;
  dormant_30d: number;
  lifetime_revenue: string;
}

export interface AdminGeographyMarket {
  country: string;
  total_users: number;
  verified: number;
  coin_buyers: number;
  active_30d: number;
  dormant_30d: number;
  lifetime_revenue: string;
  percentage_of_total: string;
}

export interface AdminGeographyReports {
  total_markets: number;
  totals: AdminGeographyTotals;
  data: AdminGeographyMarket[];
}

export interface AdminDashboardGlance {
  total_users: number;
  total_growth_wk: string;
  active_purchased: number;
  active_growth_wk: string;
  idle_no_pack: number;
  ucts_used_today: number;
  users_today: number;
}

export interface AdminDashboardLifecycle {
  deleted_accounts: number;
  active_rate_pct: number;
  verified_users: number;
}

export interface AdminDashboardCountry {
  country: string;
  users: number;
  pct: number;
}

export interface AdminDashboardActivity {
  type: string;
  fullname: string;
  country: string;
  plan_name: string | null;
  coins: number | null;
  match_label?: string;
  time_ago_sec: number;
  created_at: string;
}

export interface AdminDashboardTodayMatchItem {
  id: number;
  home_team: string;
  away_team: string;
  series: string;
  start_time: string;
  status: string;
  ucts_used: number;
  countries_active: number;
}

export interface AdminDashboardTodayMatch {
  total_ucts_today: number;
  matches: AdminDashboardTodayMatchItem[];
}

export interface AdminDashboardLiveReports {
  success: boolean;
  users_at_a_glance: AdminDashboardGlance;
  monetization_lifecycle: AdminDashboardLifecycle;
  top_countries_by_users: AdminDashboardCountry[];
  recent_activity: AdminDashboardActivity[];
  today_match: AdminDashboardTodayMatch;
}

export interface AdminUsersKpis {
  total_users: number;
  active_accounts: number;
  idle_users: number;
  deleted: number;
}

export interface AdminUsersPagination {
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

export interface AdminUsersFilters {
  search: string;
  country: string;
  status: string;
}

export interface AdminUserReportItem {
current_pack: any;
pack_status: string;
  id: number;
  user_code: string;
  fullname: string;
  email: string;
  country: string;
  packs_purchased: string[];
  coins: number;
  joined: string;
  status: 'active' | 'idle' | 'deleted' | 'suspended' | string;
}

export interface AdminUsersReports {
  success: boolean;
  kpis: AdminUsersKpis;
  pagination: AdminUsersPagination;
  filters: AdminUsersFilters;
  users: AdminUserReportItem[];
}

export interface AdminUsersQuery {
  page?: number;
  limit?: number;
  search?: string;
  country?: string;
  status?: string;
}

export type AdminCoinExpiryWindow = '07d' | '15d' | '30d' | 'expired';

export interface AdminCoinExpirySummary {
  reminder_30d: number;
  reminder_15d: number;
  already_expired: number;
  coins_expired_all_time: number;
}

export interface AdminCoinExpiryUser {
  id: number;
  user_code: string;
  fullname: string;
  country: string;
  coins_left: number;
  last_purchase_date: string;
  expiry_date: string;
  days_left: number;
}

export interface AdminCoinExpiryReports {
  success: boolean;
  summary: AdminCoinExpirySummary;
  window: AdminCoinExpiryWindow;
  users_in_window: number;
  coins_still_to_use: number;
  users: AdminCoinExpiryUser[];
}

export interface AdminCountriesReportRow {
  country: string;
  total_users: number;
  coin_buyers: number;
  no_pack: number;
  share_pct: number;
}

export interface AdminManageCountryReport {
  country: string;
  users: number;
}

export interface AdminCountriesReportTotals {
  total_users: number;
  coin_buyers: number;
  no_pack: number;
  share_pct: number;
}

export interface AdminCountriesReports {
  success: boolean;
  total_users_overall: number;
  total_countries: number;
  by_country: AdminCountriesReportRow[];
  breakdown: AdminCountriesReportRow[];
  manage_countries: AdminManageCountryReport[];
  totals: AdminCountriesReportTotals;
}

export interface AdminUctOverviewKpis {
  ucts_used_today: number;
  teams_generated: number;
  active_fixtures: number;
  failed_refunded: number;
}

export interface AdminUctTodayMatch {
  id: number;
  match: string;
  series: string;
  status: string;
  ucts_used: number;
  teams_generated: number;
  share_pct: number;
}

export interface AdminUctCoinsReconciliation {
  coins_purchased: number;
  coins_consumed: number;
  coins_expired: number;
  coins_in_wallets: number;
  is_balanced: boolean;
  breakdown_pct: {
    consumed_pct: number;
    expired_pct: number;
    wallets_pct: number;
  };
}

export interface AdminUctOverviewReports {
  success: boolean;
  kpis: AdminUctOverviewKpis;
  today_matches: {
    total_ucts_today: number;
    matches: AdminUctTodayMatch[];
  };
  coins_reconciliation: AdminUctCoinsReconciliation;
}

export interface AdminUctDrilldownMatch {
  id: number;
  home_team: string;
  away_team: string;
  series: string;
  start_time: string;
  status: string;
  ucts_used: number;
  teams_generated: number;
}

export interface AdminUctCountryUsage {
  country: string;
  users: number;
  pct: number;
}

export interface AdminUctBuildPoint {
  label: string;
  count: number;
}

export interface AdminUctMatchDrilldownReports {
  success: boolean;
  match: AdminUctDrilldownMatch;
  users_region_wise: AdminUctCountryUsage[];
  lineouts_to_kickoff: AdminUctBuildPoint[];
}

export interface AdminUctActivityDaily {
  date: string;
  ucts: number;
  teams_generated: number;
  failed_refunded: number;
  success_rate_pct: number;
}

export interface AdminUctGeneration {
  uct_id: string;
  fullname: string;
  match: string;
  country: string;
  teams: number;
  coins_used: number;
  time_ago_sec: number;
  status: string;
  created_at: string;
}

export interface AdminUctActivityListReports {
  success: boolean;
  period: string;
  range: {
    start_date: string;
    end_date: string;
  };
  summary: {
    total_ucts: number;
    total_teams: number;
    failed_refunded: number;
    success_rate_pct: number;
    avg_per_day: number;
  };
  daily_breakdown: AdminUctActivityDaily[];
  pagination: AdminUsersPagination;
  recent_generations: AdminUctGeneration[];
}

export interface AdminVotesCountPct {
  count: number;
  pct: number;
}

export interface AdminVotesSummaryReports {
  success: boolean;
  kpis: {
    feedback_responses: number;
usage_frequency: string|null|undefined;
    like_uct: AdminVotesCountPct;
    want_changes: AdminVotesCountPct;
    dislike: AdminVotesCountPct;
  };
  insight: {
    sentiment_score: number;
    likes_vs_last_period: number;
    trend: string;
    avg_rating: number;
  };
  how_users_feel: {
    like_uct_pct: number;
    breakdown: Array<{
      label: string;
      count: number;
      pct: number;
    }>;
  };
  most_requested_changes: Array<{
    label?: string;
    title?: string;
    change?: string;
    count?: number;
    pct?: number;
    [key: string]: any;
  }>;
}

export interface AdminVotesFeedbackItem {
  id: number;
  feedback_code: string;
  fullname: string;
  region: string;
  vote: 'like_uct' | 'want_changes' | 'dislike' | string;
  vote_label: string;
  rating: number;
  usage_frequency?: string;
  device?: string;
  comment: string;
  date: string;
}

export interface AdminVotesListReports {
  success: boolean;
  pagination: AdminUsersPagination;
  filters: {
    vote: string;
  };
  feedback: AdminVotesFeedbackItem[];
}

export interface AdminPackBuyersSummary {
  unique_buyers: number;
  total_purchases: number;
  total_coins_sold: number;
  coins_consumed: number;
  coins_remaining: number;
  usage_pct: string;
  total_revenue: string;
}

export interface AdminPackBuyersLast30d {
  purchases: number;
  revenue: string;
}

export interface AdminPackPlanPerformance {
  plan_id: number;
  plan_name: string;
  plan_coins: number;
  plan_price: number;
  purchases: number;
  unique_buyers: number;
  coins_sold: number;
  coins_consumed: number;
  coins_remaining: number;
  usage_pct: string;
  avg_coins_per_user: string;
  still_active: number;
  last_30d: AdminPackBuyersLast30d;
  total_revenue: string;
}

export interface AdminPackCurrencyStats {
  buyers: number;
  revenue: string;
}

export interface AdminPackRevenueByCurrency {
  plan_name: string;
  plan_coins: number;
  currencies: Record<string, AdminPackCurrencyStats>;
}

export interface AdminPackRecentPurchase {
  user_id: number;
  user_name: string | null;
  user_email: string | null;
  country: string | null;
  plan_name: string;
  plan_coins: number;
  amount: string;
  currency: string;
  purchased_at: string;
  coins_used: number;
  coins_remaining: number;
}

export interface AdminPackBuyersReports {
  summary: AdminPackBuyersSummary;
  plan_performance: AdminPackPlanPerformance[];
  revenue_by_currency: AdminPackRevenueByCurrency[];
  recent_purchases: AdminPackRecentPurchase[];
}

export interface AdminActivityMetric {
  count: number;
  percentage: string;
}

export interface AdminActivityDormancyOverview {
  dau: AdminActivityMetric;
  wau: AdminActivityMetric;
  mau: AdminActivityMetric;
  dormant_30d: AdminActivityMetric;
}

export interface AdminDormancyBuckets {
  total_verified: number;
  active_30d: AdminActivityMetric;
  dormant_30_60d: AdminActivityMetric;
  dormant_60_90d: AdminActivityMetric;
  dormant_90d_plus: AdminActivityMetric;
}

export interface AdminReengagementSegment {
  priority: string;
  key: string;
  title: string;
  description: string;
  count: number;
  action: string;
}

export interface AdminDormant90dCohort {
  total: number;
  preview: Record<string, any>[];
}

export interface AdminActivityDormancyReports {
  overview: AdminActivityDormancyOverview;
  dormancy_buckets: AdminDormancyBuckets;
  reengagement_segments: AdminReengagementSegment[];
  dormant_90d_cohort: AdminDormant90dCohort;
}
