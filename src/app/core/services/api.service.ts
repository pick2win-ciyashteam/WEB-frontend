import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ResendOtpPayload, SignupPayload, VerifyEmailPayload, VerifySignupPayload } from '../interfaces/auth';
import { ApiDataResponse, ApiListResponse, Banner, BuyCoinsPayload, BuyCoinsResponse, CheckoutSessionPayload, CheckoutSessionResponse, Country, MatchDetail, Series, StripeConfigResponse, SubscriptionPlan, TodayLineupsResponse, UctGeneratePayload, UctGenerateResponse, UserProfile } from '../interfaces/content';

@Injectable({
  providedIn: 'root'
})
export class ApiService {

  private BASE = 'https://pick2win-backend-website.onrender.com/api/user'

  constructor(private http: HttpClient) { }


  signup(data: SignupPayload): Observable<any> {
    return this.http.post(`${this.BASE}/user-auth/signup`, data);
  }

  verifyMobileOtp(data: VerifySignupPayload): Observable<any> {
    return this.http.post(`${this.BASE}/user-auth/verify-mobile-otp`, data);
  }

  verifyEmailOtp(data: VerifyEmailPayload): Observable<any> {
    return this.http.post(`${this.BASE}/user-auth/verify-email-otp`, data);
  }

  resendOtp(data: ResendOtpPayload): Observable<any> {
    return this.http.post(`${this.BASE}/user-auth/resend-otp`, data);
  }

  getProfile(): Observable<ApiDataResponse<UserProfile>> {
    return this.http.get<ApiDataResponse<UserProfile>>(`${this.BASE}/user-auth/profile`);
  }

  deleteAccount(): Observable<any> {
    return this.http.delete(`${this.BASE}/user-auth/delete`);
  }

  changeMobile(data: { new_mobile: string }): Observable<any> {
    return this.http.post(`${this.BASE}/user-auth/change-mobile`, data);
  }

  verifyMobileChange(data: { type: 'mobile'; otp: string }): Observable<any> {
    return this.http.post(`${this.BASE}/user-auth/verify-mobile-change`, data);
  }

  changeEmail(data: { new_email: string }): Observable<any> {
    return this.http.post(`${this.BASE}/user-auth/change-email`, data);
  }

  verifyEmailChange(data: { type: 'email'; otp: string }): Observable<any> {
    return this.http.post(`${this.BASE}/user-auth/verify-email-change`, data);
  }

  forgotPassword(data: { email: string }): Observable<any> {
    return this.http.post(`${this.BASE}/user-auth/forgot-password`, data);
  }

  resetPassword(data: { email: string; password: string; otp: string }): Observable<any> {
    return this.http.post(`${this.BASE}/user-auth/reset-password`, data);
  }

  getCountries(): Observable<ApiListResponse<Country>> {
    return this.http.get<ApiListResponse<Country>>(`${this.BASE}/countries/get-all`);
  }

  getCountryByName(name: string): Observable<ApiDataResponse<Country>> {
    return this.http.get<ApiDataResponse<Country>>(`${this.BASE}/countries/${encodeURIComponent(name)}`);
  }

  getSubscriptionPlans(): Observable<ApiListResponse<SubscriptionPlan>> {
    return this.http.get<ApiListResponse<SubscriptionPlan>>(`${this.BASE}/plans`);
  }


getStripeConfig(): Observable<StripeConfigResponse> {
  return this.http.get<StripeConfigResponse>(`${this.BASE}/deposite/stripe/config`);
}

buyCoins(data: BuyCoinsPayload): Observable<BuyCoinsResponse> {
  return this.http.post<BuyCoinsResponse>(`${this.BASE}/deposite/buy-coins`, data);
}

  getBanners(): Observable<ApiListResponse<Banner>> {
    return this.http.get<ApiListResponse<Banner>>(`${this.BASE}/banner`);
  }

  getSeriesMatches(): Observable<ApiListResponse<Series>> {
    return this.http.get<ApiListResponse<Series>>(`${this.BASE}/series`);
  }

  getTodayLineups(): Observable<TodayLineupsResponse> {
    return this.http.get<TodayLineupsResponse>(`${this.BASE}/lineup/today-lineups`);
  }

  getMatchDetails(matchId: number | string): Observable<ApiDataResponse<MatchDetail>> {
    return this.http.get<ApiDataResponse<MatchDetail>>(`${this.BASE}/matches/${matchId}`);
  }

  createUctTeams(data: UctGeneratePayload): Observable<UctGenerateResponse> {
    return this.http.post<UctGenerateResponse>(`${this.BASE}/teams/generate-teams`, data);
  }

  getMyteams(): Observable<ApiListResponse<Country>> {
    return this.http.get<ApiListResponse<Country>>(`${this.BASE}/countries/get-all`);
  }

  // getSeriesById(id: number): Observable<any> {
  //   return this.http.get(`${this.BASE}/getseriesbyid/${id}`);
  // }

}
