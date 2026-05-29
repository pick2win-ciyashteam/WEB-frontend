import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ResendOtpPayload, SignupPayload, VerifyEmailPayload, VerifySignupPayload } from '../interfaces/auth';
import { ApiDataResponse, ApiListResponse, Banner, CheckoutSessionPayload, CheckoutSessionResponse, Country, MatchDetail, Series, SubscriptionPlan, UserProfile } from '../interfaces/content';

@Injectable({
  providedIn: 'root'
})
export class ApiService {

  private BASE = 'https://pick2win-backend-website.onrender.com/api/user';

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

  getCountries(): Observable<ApiListResponse<Country>> {
    return this.http.get<ApiListResponse<Country>>(`${this.BASE}/countries/get-all`);
  }

  getCountryByName(name: string): Observable<ApiDataResponse<Country>> {
    return this.http.get<ApiDataResponse<Country>>(`${this.BASE}/countries/${encodeURIComponent(name)}`);
  }

  getSubscriptionPlans(): Observable<ApiListResponse<SubscriptionPlan>> {
    return this.http.get<ApiListResponse<SubscriptionPlan>>(`${this.BASE}/plans`);
  }

  createCheckoutSession(data: CheckoutSessionPayload): Observable<CheckoutSessionResponse> {
    return this.http.post<CheckoutSessionResponse>(`${this.BASE}/payments/create-checkout-session`, data);
  }

  getBanners(): Observable<ApiListResponse<Banner>> {
    return this.http.get<ApiListResponse<Banner>>(`${this.BASE}/banner`);
  }

  getSeriesMatches(): Observable<ApiListResponse<Series>> {
    return this.http.get<ApiListResponse<Series>>(`${this.BASE}/series`);
  }

  getMatchDetails(matchId: number | string): Observable<ApiDataResponse<MatchDetail>> {
    return this.http.get<ApiDataResponse<MatchDetail>>(`${this.BASE}/matches/${matchId}`);
  }

  getSeriesById(id: number): Observable<any> {
    return this.http.get(`${this.BASE}/getseriesbyid/${id}`);
  }

}
