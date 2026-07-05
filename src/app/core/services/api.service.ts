import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ResendOtpPayload, SignupPayload, VerifyEmailPayload, VerifySignupPayload } from '../interfaces/auth';
import { ApiDataResponse, ApiListResponse, Banner, BuyCoinsPayload, BuyCoinsResponse, CheckoutSessionPayload, CheckoutSessionResponse, Country, FeedbackAnswerPayload, FeedbackPostPayload, FeedbackQuestion, MatchDetail, Series, StripeConfigResponse, SubscriptionPlan, SupportPayload, SupportResponse, SupportTicketResponse, SupportTicketsResponse, TodayLineupsResponse, UctGeneratePayload, UctGenerateResponse, UserProfile } from '../interfaces/content';
import { TokenService } from './token.service';

@Injectable({
  providedIn: 'root'
})
export class ApiService {

  // private BASE = 'https://pick2win-backend-website.onrender.com/api'

  private BASE = 'https://pick2win.io/backend/api'


  constructor(
    private http: HttpClient,
    private tokenService: TokenService
  ) { }


  signup(data: SignupPayload): Observable<any> {
    return this.http.post(`${this.BASE}/user/user-auth/signup`, data);
  }

  verifyMobileOtp(data: VerifySignupPayload): Observable<any> {
    return this.http.post(`${this.BASE}/user/user-auth/verify-mobile-otp`, data);
  }

  verifyEmailOtp(data: VerifyEmailPayload): Observable<any> {
    return this.http.post(`${this.BASE}/user/user-auth/verify-email-otp`, data);
  }

  resendOtp(data: ResendOtpPayload): Observable<any> {
    return this.http.post(`${this.BASE}/user/user-auth/resend-otp`, data);
  }

  getProfile(): Observable<ApiDataResponse<UserProfile>> {
    return this.http.get<ApiDataResponse<UserProfile>>(`${this.BASE}/user/user-auth/profile`);
  }

  deleteAccount(): Observable<any> {
    return this.http.post(`${this.BASE}/user/user-auth/delete-account`, {});
  }

  confirmDeleteAccount(data: { otp: string }): Observable<any> {
    return this.http.post(`${this.BASE}/user/user-auth/confirm-delete-account`, data);
  }

  changeMobile(data: { new_mobile: string }): Observable<any> {
    return this.http.post(`${this.BASE}/user/user-auth/change-mobile`, data);
  }

  verifyMobileChange(data: { type: 'mobile'; otp: string }): Observable<any> {
    return this.http.post(`${this.BASE}/user/user-auth/verify-mobile-change`, data);
  }

  changeEmail(data: { new_email: string }): Observable<any> {
    return this.http.post(`${this.BASE}/user/user-auth/change-email`, data);
  }

  verifyEmailChange(data: { type: 'email'; otp: string }): Observable<any> {
    return this.http.post(`${this.BASE}/user/user-auth/verify-email-change`, data);
  }

  forgotPassword(data: { email: string }): Observable<any> {
    return this.http.post(`${this.BASE}/user/user-auth/forgot-password`, data);
  }

  resetPassword(data: { email: string; password: string; otp: string }): Observable<any> {
    return this.http.post(`${this.BASE}/user/user-auth/reset-password`, data);
  }

  registerDevice(data: { fcm_token: string; device_type: 'web' }): Observable<any> {
    return this.http.post(`${this.BASE}/user/user-auth/register-device`, data);
  }

  getFeedback(): Observable<any> {
    return this.http.get(`${this.BASE}/admin/feedback/feedback-get`, this.userAuthOptions());
  }

  postFeedback(data: FeedbackPostPayload): Observable<any> {
    return this.http.post(`${this.BASE}/admin/feedback/user-post`, data, this.userAuthOptions());
  }

  postSupport(data: SupportPayload): Observable<SupportResponse> {
    return this.http.post<SupportResponse>(`${this.BASE}/user/support`, data, this.userAuthOptions());
  }

  getSupportTickets(page = 1, limit = 20): Observable<SupportTicketsResponse> {
    const params = new HttpParams()
      .set('page', page)
      .set('limit', limit);

    return this.http.get<SupportTicketsResponse>(`${this.BASE}/user/support`, {
      ...this.userAuthOptions(),
      params
    });
  }

  getSupportTicket(id: number | string): Observable<SupportTicketResponse> {
    return this.http.get<SupportTicketResponse>(`${this.BASE}/user/support/${id}`, this.userAuthOptions());
  }

  getFeedbackQuestions(): Observable<ApiListResponse<FeedbackQuestion>> {
    return this.http.get<ApiListResponse<FeedbackQuestion>>(`${this.BASE}/admin/feedback/user-question`, this.userAuthOptions());
  }

  postFeedbackAnswers(data: FeedbackAnswerPayload): Observable<any> {
    return this.http.post(`${this.BASE}/admin/feedback/user-answers`, data, this.userAuthOptions());
  }

  getCountries(): Observable<ApiListResponse<Country>> {
    return this.http.get<ApiListResponse<Country>>(`${this.BASE}/user/countries/get-all`);
  }

  getSeriesLeagues(): Observable<any> {
    return this.http.get(`${this.BASE}/user/series/leagues`);
  }

  getCountryByName(name: string): Observable<ApiDataResponse<Country>> {
    return this.http.get<ApiDataResponse<Country>>(`${this.BASE}/user/countries/${encodeURIComponent(name)}`);
  }

  getSubscriptionPlans(): Observable<ApiListResponse<SubscriptionPlan>> {
    return this.http.get<ApiListResponse<SubscriptionPlan>>(`${this.BASE}/user/plans`);
  }


getStripeConfig(): Observable<StripeConfigResponse> {
  return this.http.get<StripeConfigResponse>(`${this.BASE}/user/deposite/stripe/config`);
}

buyCoins(data: BuyCoinsPayload): Observable<BuyCoinsResponse> {
  return this.http.post<BuyCoinsResponse>(`${this.BASE}/user/deposite/buy-coins`, data);
}

  getBanners(): Observable<ApiListResponse<Banner>> {
    return this.http.get<ApiListResponse<Banner>>(`${this.BASE}/user/banner`);
  }

  getSeriesMatches(): Observable<ApiListResponse<Series>> {
    return this.http.get<ApiListResponse<Series>>(`${this.BASE}/user/series`);
  }

  getTodayLineups(): Observable<TodayLineupsResponse> {
    return this.http.get<TodayLineupsResponse>(`${this.BASE}/user/lineup/today-lineups`);
  }

  getMatchDetails(matchId: number | string): Observable<ApiDataResponse<MatchDetail>> {
    return this.http.get<ApiDataResponse<MatchDetail>>(`${this.BASE}/user/matches/${matchId}`);
  }

  createUctTeams(data: UctGeneratePayload): Observable<UctGenerateResponse> {
    const url = `${this.BASE}/user/teams/generate-teams`;
    console.log('Generate UCT API request:', {
      url,
      headers: { 'Content-Type': 'application/json', 'x-api-key': '12345678' },
      body: data
    });

    return this.http.post<UctGenerateResponse>(
      url,
      data,
      { headers: { 'Content-Type': 'application/json', 'x-api-key': '12345678' } }
    );
  }

   GetMyTeams(): Observable<ApiListResponse<Country>> {
    return this.http.get<ApiListResponse<Country>>(`${this.BASE}/user/teams/generate-matches`);
  }

  MatchByTeams(id: number, game?: 'sorare' | 'draftkings' | 'fanduel'): Observable<any> {
    const gamePath = game ? `/${game}` : '';

    return this.http.get(`${this.BASE}/user/teams/user-my-teams/${id}${gamePath}`);
  }

  TeamsByPlayers(id: number): Observable<any> {
    return this.http.get(`${this.BASE}/user/teams/team-players/${id}`);
  }

   GetPurchaseHistory(): Observable<ApiListResponse<Country>> {
    return this.http.get<ApiListResponse<Country>>(`${this.BASE}/user/deposite/my-transactions`);
  }

  private userAuthOptions(): { headers?: HttpHeaders } {
    const token = this.tokenService.getToken();

    return token
      ? { headers: new HttpHeaders({ Authorization: `Bearer ${token}` }) }
      : {};
  }

}
