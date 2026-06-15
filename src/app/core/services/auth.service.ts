import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { TokenService } from './token.service';
import { Router } from '@angular/router';
import { ProfileService } from './profile.service';

const API = 'https://pick2win.io/backend/api';

const httpOptions = {
  headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
};

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  private loggedInSubject = new BehaviorSubject<boolean>(false);
  loggedIn$ = this.loggedInSubject.asObservable();

  constructor(
    private http: HttpClient,
    private tokenService: TokenService,
    private router: Router,
    private profileService: ProfileService
  ) {
    this.loggedInSubject.next(this.isLoggedIn());
  }

  login(email: string, password: string): Observable<any> {
    return this.http.post<any>(
      API + '/user/user-auth/login',
      {
        email: email,
        password: password,
      },
      httpOptions
    ).pipe(
      tap(res => {
        console.log('login:', res);

        const token = res?.token || res?.accessToken || res?.data?.token || res?.data?.accessToken;

        if (token && res?.success !== false) {
          this.tokenService.saveToken(token);
          this.loggedInSubject.next(true);
        }
      })
    );
  }

  logout() {
    const token = this.tokenService.getToken();
    const logoutOptions = token
      ? {
          headers: new HttpHeaders({
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          })
        }
      : httpOptions;

    this.clearSession();

    this.http.post(API + '/user/user-auth/logout', {}, logoutOptions).subscribe({
      next: (res) => {
        console.log('logout:', res);
      },
      error: (err) => {
        console.log('logout error:', err);
      }
    });
  }

  private clearSession() {
    this.tokenService.clear();
    localStorage.removeItem('user');
    localStorage.removeItem('currentUser');
    localStorage.removeItem('pick2win_user');
    sessionStorage.clear();
    this.profileService.clearProfile();
    this.loggedInSubject.next(false);
    this.router.navigate(['/'], { replaceUrl: true });
  }

  isLoggedIn(): boolean {
    return !!this.tokenService.getToken();
  }
}
