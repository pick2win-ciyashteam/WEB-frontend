import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { AdminBannerCreatePayload, AdminCountryCreatePayload, AdminFixturesPayload, AdminLoginPayload, AdminMatchTogglePayload, AdminSubscriptionCreatePayload } from '../interfaces/admin';

@Injectable({
  providedIn: 'root'
})
export class AdminService {

  private BASE = 'https://pick2win-backend-website.onrender.com/api';

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

  createCountry(data: AdminCountryCreatePayload): Observable<any> {
    return this.http.post(`${this.BASE}/admin/country/create`, data);
  }

  deleteCountry(id: number | string): Observable<any> {
    return this.http.delete(`${this.BASE}/user/countries/${id}`);
  }

  getCountries(): Observable<any> {
    return this.http.get(`${this.BASE}/user/countries/get`);
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
}
