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

  createBanner(data: AdminBannerCreatePayload): Observable<any> {
    return this.http.post(`${this.BASE}/admin/banners`, data);
  }

  createSubscription(data: AdminSubscriptionCreatePayload): Observable<any> {
    return this.http.post(`${this.BASE}/admin/subscription`, data);
  }
}
