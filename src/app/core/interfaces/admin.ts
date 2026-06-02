export interface AdminLoginPayload {
  email: string;
  password: string;
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
  image_url: string;
  description: string;
  link: string;
  button: string;
  sort_order?: number;
}

export interface AdminBanner {
  id: number;
  name: string;
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
