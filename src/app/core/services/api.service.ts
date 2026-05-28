import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ResendOtpPayload, SignupPayload, VerifyEmailPayload, VerifySignupPayload } from '../interfaces/auth';

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

    getSeries(): Observable<any> {
    return this.http.get(`${this.BASE}/series/available`);
  }

  getaSeries(): Observable<any> {
    return this.http.get(`${this.BASE}/series/active`);
  }

  getSeriesById(id: number): Observable<any> {
    return this.http.get(`${this.BASE}/getseriesbyid/${id}`);
  }

}
