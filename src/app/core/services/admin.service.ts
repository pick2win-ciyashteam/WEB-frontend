import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { AdminBannerCreatePayload, AdminCountryCreatePayload, AdminFixturesPayload, AdminLoginPayload, AdminMatchTogglePayload, AdminSubscriptionCreatePayload } from '../interfaces/admin';

@Injectable({
  providedIn: 'root'
})
export class AdminService {

  // private BASE = 'https://pick2win-backend-website.onrender.com/api';

  private BASE = 'https://pick2win.io/backend/api';

  constructor(private http: HttpClient) { }

  login(data: AdminLoginPayload): Observable<any> {
    return this.http.post(`${this.BASE}/admin/admin-auth/login`, data);
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

  getCountries(): Observable<any> {
    return this.http.get(`${this.BASE}/admin/country/get`);
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

  getAdminReportsGeography(): Observable<any> {
    return this.http.get(`${this.BASE}/admin/admin-reports/geography`);
  }

  getAdminReportsPackBuyers(): Observable<any> {
    return this.http.get(`${this.BASE}/admin/admin-reports/pack-buyers`);
  }

  getAdminReportsActivityDormancy(): Observable<any> {
    return this.http.get(`${this.BASE}/admin/admin-reports/activity-dormancy`);
  }
}
