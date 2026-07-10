import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { AdminActivityLogCategory, AdminBannerCreatePayload, AdminCoinExpiryWindow, AdminCountryCreatePayload, AdminFixturesPayload, AdminLeagueCreatePayload, AdminLoginPayload, AdminMatchTogglePayload, AdminRevenueTab, AdminSubscriptionCreatePayload, AdminSupportListReports, AdminSupportStatus, AdminSupportTicketReports, AdminUsersQuery } from '../interfaces/admin';

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

  createAdmin(data: { name: string; email: string; mobile: string; password: string; role: string; access_level: string }): Observable<any> { return this.http.post(`${this.BASE}/admin/admin-auth/create-admin`, data); }

  getAdmins(params: { page?: number; limit?: number } = {}): Observable<any> { return this.http.get(`${this.BASE}/admin/admin-auth/get-admins`, { params: this.cleanParams({ page: 1, limit: 20, ...params }) }); }
  getAdminProfile(): Observable<any> { return this.http.get(`${this.BASE}/admin/admin-auth/profile`); }

  updateAdmin(id: number | string, data: Record<string, unknown>): Observable<any> { return this.http.patch(`${this.BASE}/admin/admin-auth/update-admin/${id}`, data); }

  updateAdminProfile(data: { name?: string; mobile?: string; currency?: number }): Observable<any> { return this.http.patch(`${this.BASE}/admin/admin-auth/update-profile`, data); }
  updateAdminCredentials(data: { currentPassword: string; newPassword: string; confirmPassword: string; new2FACode: string }): Observable<any> { return this.http.patch(`${this.BASE}/admin/admin-auth/update-credentials`, data); }

  toggleAdmin2Fa(enabled: boolean): Observable<any> { return this.http.post(`${this.BASE}/admin/admin-auth/toggle-2fa`, { enabled }); }
  
  removeAdmin(id: number | string): Observable<any> { return this.http.delete(`${this.BASE}/admin/admin-auth/remove-admin/${id}`); }

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

  getUserSeriesLeagues(): Observable<any> {
    return this.http.get(`${this.BASE}/user/series/leagues`);
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

  getAdminSupportTickets(params: { status?: string; search?: string; page?: number; limit?: number } = {}): Observable<AdminSupportListReports> {
    return this.http.get<AdminSupportListReports>(`${this.BASE}/admin/support`, {
      params: this.cleanParams({ page: 1, limit: 20, ...params })
    });
  }

  getAdminSupportTicket(id: number | string): Observable<AdminSupportTicketReports> {
    return this.http.get<AdminSupportTicketReports>(`${this.BASE}/admin/support/${id}`);
  }

  replyAdminSupportTicket(id: number | string, data: { admin_reply: string; status: AdminSupportStatus }): Observable<any> {
    return this.http.patch(`${this.BASE}/admin/support/${id}/reply`, data);
  }

  updateAdminSupportTicketStatus(id: number | string, status: AdminSupportStatus): Observable<any> {
    return this.http.patch(`${this.BASE}/admin/support/${id}/status`, { status });
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

  sendNotificationToAll(data: { title: string; body: string; data?: Record<string, string> }): Observable<any> {
    return this.http.post(`${this.BASE}/admin/notification/send-to-all`, data, {
      headers: new HttpHeaders({ 'Content-Type': 'application/json' })
    });
  }

  sendNotificationToUser(userId: number | string, data: { title: string; body: string; data?: Record<string, string> }): Observable<any> {
    return this.http.post(`${this.BASE}/admin/notification/send-to-user`, { user_id: String(userId), ...data }, {
      headers: new HttpHeaders({ 'Content-Type': 'application/json' })
    });
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

  updateAdminUserAccountStatus(id: number | string, accountStatus: 'active' | 'blocked'): Observable<any> {
    return this.http.patch(`${this.BASE}/admin/reports/users/${id}/account-status`, { account_status: accountStatus });
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

  getAdminReportsActivityLog(params: { category?: AdminActivityLogCategory; page?: number; limit?: number } = {}): Observable<any> {
    return this.http.get(`${this.BASE}/admin/reports/activity-log`, {
      params: this.cleanParams({ category: 'all', page: 1, limit: 20, ...params })
    });
  }

  getAdminReportsRevenue(params: { tab?: AdminRevenueTab; month?: number; year?: number } = {}): Observable<any> {
    return this.http.get(`${this.BASE}/admin/reports/revenue`, { params: this.cleanParams({ tab: 'today', ...params }) });
  }

  getAdminExpensesByMonth(month: number, year: number): Observable<any> { return this.http.get(`${this.BASE}/admin/reports/expenses/by-month`, { params: this.cleanParams({ month, year }) }); }
  getAdminExpensesFyReport(year: number): Observable<any> { return this.http.get(`${this.BASE}/admin/reports/expenses/fy-report`, { params: this.cleanParams({ year }) }); }
  getAdminReportsProfitFy(year: number): Observable<any> { return this.http.get(`${this.BASE}/admin/reports/profit/fy`, { params: this.cleanParams({ year }) }); }
  getAdminPaymentsSummary(params: { tab?: 'today' | 'by_month' | 'fy_report'; month?: number; year?: number } = {}): Observable<any> { return this.http.get(`${this.BASE}/admin/reports/payments/summary`, { params: this.cleanParams({ tab: 'today', ...params }) }); }
  getAdminPaymentTransactions(params: { tab?: string; page?: number; limit?: number } = {}): Observable<any> { return this.http.get(`${this.BASE}/admin/reports/payments/transactions`, { params: this.cleanParams({ tab: 'all', page: 1, limit: 20, ...params }) }); }
  createAdminExpenseCategory(data: { name: string; frequency: string; has_roles: number }): Observable<any> { return this.http.post(`${this.BASE}/admin/reports/expenses/category`, data); }
  deleteAdminExpenseCategory(id: number): Observable<any> { return this.http.delete(`${this.BASE}/admin/reports/expenses/category/${id}`); }
  addAdminExpenseRole(categoryId: number, name: string): Observable<any> { return this.http.post(`${this.BASE}/admin/reports/expenses/category/${categoryId}/role`, { name }); }
  deleteAdminExpenseRole(id: number): Observable<any> { return this.http.delete(`${this.BASE}/admin/reports/expenses/role/${id}`); }
  saveAdminExpenseEntry(data: { category_id: number; role_id?: number; month: number; year: number; amount_inr: number }): Observable<any> { return this.http.patch(`${this.BASE}/admin/reports/expenses/entry`, data); }

  private cleanParams(params: Record<string, unknown>): Record<string, string> {
    return Object.entries(params).reduce((acc, [key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        acc[key] = String(value);
      }

      return acc;
    }, {} as Record<string, string>);
  }
}
