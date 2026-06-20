import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { AdminBannerCreatePayload, AdminCoinExpiryWindow, AdminCountryCreatePayload, AdminFixturesPayload, AdminLeagueCreatePayload, AdminLoginPayload, AdminMatchTogglePayload, AdminSubscriptionCreatePayload, AdminUsersQuery } from '../interfaces/admin';

@Injectable({
  providedIn: 'root'
})
export class AdminService {

  private BASE = 'https://pick2win.io/backend/api';

  constructor(private http: HttpClient) { }

  login(data: AdminLoginPayload): Observable<any> {
    return this.http.post(`${this.BASE}/admin/admin-auth/login`, data);
  }

  logout(): Observable<any> {
    return this.http.post(`${this.BASE}/admin/admin-auth/logout`, {});
  }

  getFixtures(data: AdminFixturesPayload): Observable<any> {
    return this.http.post(`${this.BASE}/admin/sportmonks/fixtures`, data);
  }

  toggleMatches(data: AdminMatchTogglePayload): Observable<any> {
    return this.http.post(`${this.BASE}/admin/sportmonks/matches/toggle`, data);
  }

  getActiveSeries(): Observable<any> {
    return this.http.get(`${this.BASE}/admin/sportmonks/series/active`);
  }

  createCountry(data: AdminCountryCreatePayload): Observable<any> {
    return this.http.post(`${this.BASE}/admin/country/create`, data);
  }

  deleteCountry(id: number | string): Observable<any> {
    return this.http.delete(`${this.BASE}/admin/country/${id}`);
  }

  toggleCountry(id: number | string): Observable<any> {
    return this.http.patch(`${this.BASE}/admin/country/${id}/toggle`, {});
  }

  updateCountry(id: number | string, data: Partial<AdminCountryCreatePayload>): Observable<any> {
    return this.http.patch(`${this.BASE}/admin/country/${id}`, data);
  }

  getCountries(): Observable<any> {
    return this.http.get(`${this.BASE}/admin/country/get`);
  }

  getAdminReportsCountries(): Observable<any> {
    return this.http.get(`${this.BASE}/admin/reports/countries`);
  }

  getAdminReportsLeagues(): Observable<any> {
    return this.http.get(`${this.BASE}/admin/reports/leagues`);
  }

  getAdminReportsSeries(status: 'all' | 'live' | 'upcoming' | 'completed' = 'all'): Observable<any> {
    return this.http.get(`${this.BASE}/admin/reports/series`, {
      params: this.cleanParams({ status })
    });
  }

  createAdminLeague(data: AdminLeagueCreatePayload): Observable<any> {
    return this.http.post(`${this.BASE}/admin/reports/leagues`, data);
  }

  updateAdminLeague(id: number | string, data: Partial<AdminLeagueCreatePayload>): Observable<any> {
    return this.http.patch(`${this.BASE}/admin/reports/leagues/${id}`, data);
  }

  toggleAdminLeagueVisibility(id: number | string): Observable<any> {
    return this.http.patch(`${this.BASE}/admin/reports/leagues/${id}/toggle-visibility`, {});
  }

  deleteAdminLeague(id: number | string): Observable<any> {
    return this.http.delete(`${this.BASE}/admin/reports/leagues/${id}`);
  }

  getAdminReportsUctOverview(): Observable<any> {
    return this.http.get(`${this.BASE}/admin/reports/uct-overview`);
  }

  getAdminReportsUctMatchDrilldown(matchId: number | string): Observable<any> {
    return this.http.get(`${this.BASE}/admin/reports/uct-match-drilldown`, {
      params: this.cleanParams({ match_id: matchId })
    });
  }

  getAdminReportsUctActivityList(params: { period?: string; page?: number; limit?: number; year?: number; month?: number } = {}): Observable<any> {
    return this.http.get(`${this.BASE}/admin/reports/uct-activity-list`, {
      params: this.cleanParams({ period: 'today', page: 1, limit: 20, ...params })
    });
  }

  getAdminReportsVotesSummary(): Observable<any> {
    return this.http.get(`${this.BASE}/admin/reports/votes-summary`);
  }

  getAdminReportsVotesList(params: { vote?: string; page?: number; limit?: number } = {}): Observable<any> {
    return this.http.get(`${this.BASE}/admin/reports/votes-list`, {
      params: this.cleanParams({ page: 1, limit: 20, ...params })
    });
  }

  getAdminReportsDetailedSummary(): Observable<any> {
    return this.http.get(`${this.BASE}/admin/reports/detailed-summary`);
  }

  getAdminReportsCoinPacks(params: { period?: 'today' | 'monthly' | 'yearly'; month?: number; year?: number } = {}): Observable<any> {
    return this.http.get(`${this.BASE}/admin/reports/coin-packs`, { params: this.cleanParams({ period: 'today', ...params }) });
  }

  getAdminReportsCountrywiseCoin(params: { country?: string; period?: 'today' | 'monthly' | 'yearly'; month?: number; year?: number } = {}): Observable<any> {
    return this.http.get(`${this.BASE}/admin/reports/countrywise-coin`, { params: this.cleanParams({ period: 'today', ...params }) });
  }

  getAdminReportsDetailedList(params: { status?: string; page?: number; limit?: number } = {}): Observable<any> {
    return this.http.get(`${this.BASE}/admin/reports/detailed-list`, {
      params: this.cleanParams({ page: 1, limit: 20, ...params })
    });
  }

  updateAdminDetailedFeedback(id: number | string, status: string): Observable<any> {
    return this.http.patch(`${this.BASE}/admin/reports/detailed/${id}/status`, { status });
  }

  createBanner(data: AdminBannerCreatePayload): Observable<any> {
    return this.http.post(`${this.BASE}/admin/banners`, data);
  }

  getBanners(): Observable<any> {
    return this.http.get(`${this.BASE}/admin/banners`);
  }

  updateBanner(id: number | string, data: Partial<AdminBannerCreatePayload>): Observable<any> {
    return this.http.patch(`${this.BASE}/admin/banners/${id}`, data);
  }

  deleteBanner(id: number | string): Observable<any> {
    return this.http.delete(`${this.BASE}/admin/banners/${id}`);
  }

  createSubscription(data: AdminSubscriptionCreatePayload): Observable<any> {
    return this.http.post(`${this.BASE}/admin/subscription`, data);
  }

  getSubscriptions(): Observable<any> {
    return this.http.get(`${this.BASE}/admin/subscription`);
  }

  updateSubscription(id: number | string, data: Partial<AdminSubscriptionCreatePayload>): Observable<any> {
    return this.http.patch(`${this.BASE}/admin/subscription/${id}`, data);
  }

  deleteSubscription(id: number | string): Observable<any> {
    return this.http.delete(`${this.BASE}/admin/subscription/${id}`);
  }

  getAdminReportsOverview(): Observable<any> {
    return this.http.get(`${this.BASE}/admin/admin-reports/overview`);
  }

  getAdminReportsDashboard(): Observable<any> {
    return this.http.get(`${this.BASE}/admin/reports/dashboard`);
  }

  getAdminReportsUsers(params: AdminUsersQuery = {}): Observable<any> {
    return this.http.get(`${this.BASE}/admin/reports/users`, { params: this.cleanParams({ ...params }) });
  }

  getAdminReportsCoinExpiry(window: AdminCoinExpiryWindow = '30d'): Observable<any> {
    return this.http.get(`${this.BASE}/admin/reports/coin-expiry`, { params: this.cleanParams({ window }) });
  }

  notifyCoinExpiryUser(id: number | string, window: AdminCoinExpiryWindow): Observable<any> {
    return this.http.post(`${this.BASE}/admin/reports/coin-expiry/${id}/notify`, { window });
  }

  broadcastCoinExpiry(window: AdminCoinExpiryWindow): Observable<any> {
    return this.http.post(`${this.BASE}/admin/reports/coin-expiry/broadcast`, { window });
  }

  updateAdminUser(id: number | string, data: Record<string, unknown>): Observable<any> {
    return this.http.patch(`${this.BASE}/admin/users/${id}`, data);
  }

  suspendAdminUser(id: number | string): Observable<any> {
    return this.http.patch(`${this.BASE}/admin/users/${id}/suspend`, {});
  }

  restoreAdminUser(id: number | string): Observable<any> {
    return this.http.patch(`${this.BASE}/admin/users/${id}/restore`, {});
  }

  deleteAdminUser(id: number | string): Observable<any> {
    return this.http.delete(`${this.BASE}/admin/users/${id}`);
  }

  getAdminReportsGeography(): Observable<any> {
    return this.http.get(`${this.BASE}/admin/admin-reports/geography`);
  }

  getAdminReportsPackBuyers(): Observable<any> {
    return this.http.get(`${this.BASE}/admin/admin-reports/pack-buyers`);
  }

  getAdminReportsActivityDormancy(): Observable<any> {
    return this.http.get(`${this.BASE}/admin/admin-reports/activity-dormancy`);
  }

  private cleanParams(params: Record<string, unknown>): Record<string, string> {
    return Object.entries(params).reduce((acc, [key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        acc[key] = String(value);
      }

      return acc;
    }, {} as Record<string, string>);
  }
}
