import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { TokenService } from './token.service';
import { Router } from '@angular/router';

const API = 'https://pick2win-backend-website.onrender.com/api/user/';

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
    private router: Router
  ) {
    this.loggedInSubject.next(this.isLoggedIn());
  }

  login(email: string, password: string): Observable<any> {
    return this.http.post<any>(
      API + 'user-auth/login',
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
    this.tokenService.clear();
    localStorage.clear();
    sessionStorage.clear();
    this.loggedInSubject.next(false);
    this.router.navigate(['/']);
  }

  isLoggedIn(): boolean {
    return !!this.tokenService.getToken();
  }
}
