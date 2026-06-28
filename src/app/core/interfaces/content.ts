export interface ApiListResponse<T> {
  success: boolean;
  data: T[];
  total?: number;
  count?: number;
  already_submitted?: boolean;
  message?: string;
}

export interface ApiDataResponse<T> {
  success: boolean;
  data: T;
}

export interface Country {
  name: string;
  code: string;
  dial_code: string;
  flag: string;
}

export interface SubscriptionPlan {
  id: number;
  name: string;
  subtitle: string;
  coins: number;
  bonus_coins?: number;
  total_coins?: number;
  matches: number;
  price: string;
  price_per_coin: string;
  price_per_total_coin?: string | number | null;
  currency: string;
  currency_symbol: string;
  validity_days: number;
  is_popular: number;
  is_pro: number;
  sort_order: number;
  regular_price?: string | number;
  offer_price?: string | number;
  discount_pct?: string | number | null;
  offer_label?: string;
  is_offer_active?: number | boolean;
}

export interface CheckoutSessionPayload {
  plan_id: number;
  success_url: string;
  cancel_url: string;
}

export interface CheckoutSessionResponse {
  success: boolean;
  message?: string;
  url?: string;
  checkout_url?: string;
  session_url?: string;
  payment_url?: string;
  redirect_url?: string;
  session_id?: string;
  sessionId?: string;
  id?: string;
  publishableKey?: string;
  publishable_key?: string;
  public_key?: string;
  stripe_publishable_key?: string;
  data?: {
    url?: string;
    checkout_url?: string;
    session_url?: string;
    payment_url?: string;
    redirect_url?: string;
    session_id?: string;
    sessionId?: string;
    id?: string;
    publishableKey?: string;
    publishable_key?: string;
    public_key?: string;
    stripe_publishable_key?: string;
  };
}

export interface StripeConfigResponse {
  success: boolean;
  message?: string;
  publishableKey?: string;
  publishable_key?: string;
  public_key?: string;
  stripe_publishable_key?: string;
  data?: {
    publishableKey?: string;
    publishable_key?: string;
    public_key?: string;
    stripe_publishable_key?: string;
  };
}

export interface BuyCoinsPayload {
  plan_id: number;
  amount: number;
  coins: number;
}

export interface BuyCoinsResponse {
  success: boolean;
  message?: string;
  data?: unknown;  
  clientSecret?: string;
}

export interface FeedbackPostPayload {
  category: string;
  importance: string;
  subject: string;
  description: string;
  email: string;
  location: string;
  email_followup: boolean;
}

export interface FeedbackQuestionOption {
  id: number;
  emoji: string;
  label: string;
  description: string;
  sort_order: number;
}

export interface FeedbackQuestion {
  id: number;
  question: string;
  hint: string | null;
  question_type?: string;
  is_mandatory: number;
  sort_order: number;
  options?: FeedbackQuestionOption[];
}

export interface FeedbackAnswerPayload {
  answers: {
    q1: string;
    q2: string[];
    q3: string;
    q4: string;
    q5: string;
    q6: string;
    q7: string;
    q8: string;
    q9: string;
    q10: string;
    q11: number;
  };
}

export interface UctGeneratePlayer {
  name: string;
  role: string;
  mandate?: 'YES' | 'NO';
  captain?: 'C' | 'VC' | 'CVC';
}

export interface UctGeneratePayload {
  match_id: number | string;
  team_a: UctGeneratePlayer[];
  team_b: UctGeneratePlayer[];
}

export interface UctGenerateResponse {
  success: boolean;
  message?: string;
  data?: unknown;
}

export interface Banner {
  id: number;
  name: string;
  heading?: string;
  image_url: string;
  description: string;
  link: string;
  button:string;
}

export interface Match {
  id: number;
  provider_match_id: string;
  series_id: string;
  start_time: string;
  status: string;
  matchdate: string;
  lineupavailable: number;
  lineup_status: string;
  is_active: number;
  venue_name?: string;
  venue_city?: string;
  seriesname?: string;
  hometeamname?: string;
  awayteamname?: string;
  match_name?: string;
  home_team_name: string;
  away_team_name: string;
  home_team_logo: string;
  away_team_logo: string;
  teams_generated?: boolean | number | string;
  generated_teams_count?: number;
  generated_at?: string | null;
}

export interface Series {
  id: number;
  seriesid: string;
  name: string;
  season: string | null;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
  status: string;
  is_selected: number;
  total_matches: number;
  matches: Match[];
}

export interface MatchPlayer {
  id: number;
  match_id: number;
  team_id: number;
  player_name: string;
  position: 'GK' | 'DEF' | 'MID' | 'FWD' | string;
  is_playing: number;
  is_substitute: number;
  provider_player_id: string | null;
  logo: string | null;
  created_at: string;
}

export interface MatchTeam {
  id: number;
  name: string;
  short_name: string;
  logo: string;
  playing_xi: MatchPlayer[];
  substitutes: MatchPlayer[];
}

export interface MatchDetail {
  match: {
    id: number;
    provider_match_id: string;
    series_id: string;
    seriesname: string;
    matchdate: string;
    start_time: string;
    status: string;
    is_active: number;
    lineupavailable: number;
    lineup_status: string;
    venue_name?: string;
    venue_city?: string;
    hometeamname?: string;
    awayteamname?: string;
    home_team_name?: string;
    away_team_name?: string;
    match_name?: string;
  };
  home_team: MatchTeam;
  away_team: MatchTeam;
  counts: {
    total_players: number;
    home_playing_xi: number;
    away_playing_xi: number;
    home_substitutes: number;
    away_substitutes: number;
  };
}

export interface TodayLineupsResponse {
  success: boolean;
  date: string;
  any_lineup_today: boolean;
  data: unknown[];
}

export interface UserCoins {
  total_coins: number;
  used_coins: number;
  coins: number;
}

export interface UserSubscription {
  plan_id: number;
  plan_name: string;
  matches_allowed: number;
  matches_used: number;
  matches_remaining: number;
  amount: string;
  start_date: string;
  expiry_date: string;
  status: string;
}

export interface UserProfile {
  id: number;
  fullname: string;
  email: string;
  mobile: string;
  country: string;
  date_of_birth: string;
  email_verify: number;
  mobile_verify: number;
  account_status: string;
  created_at: string;
  free_trial_used?: number | string;
  free_trial_status?: string;
  coins?: UserCoins;
  subscription?: UserSubscription | null;
}
