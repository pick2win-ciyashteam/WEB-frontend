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

export interface AdminCountryCreatePayload {
  name: string;
  code: string;
  dial_code: string;
  flag: string;
  is_active: number;
}

export interface AdminBannerCreatePayload {
  name: string;
  image_url: string;
  description: string;
  link: string;
  button: string;
  sort_order?: number;
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
