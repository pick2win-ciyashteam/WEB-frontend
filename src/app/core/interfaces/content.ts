export interface ApiListResponse<T> {
  success: boolean;
  data: T[];
  total?: number;
  count?: number;
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
  matches: number;
  price: string;
  price_per_coin: string;
  currency: string;
  currency_symbol: string;
  validity_days: number;
  is_popular: number;
  is_pro: number;
  sort_order: number;
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
  data?: {
    url?: string;
    checkout_url?: string;
    session_url?: string;
    id?: string;
  };
}

export interface Banner {
  id: number;
  name: string;
  image_url: string;
  description: string;
  link: string;
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
  home_team_name: string;
  away_team_name: string;
  home_team_logo: string;
  away_team_logo: string;
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
  coins?: number;
}
