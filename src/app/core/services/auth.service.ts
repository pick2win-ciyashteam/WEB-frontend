import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { TokenService } from './token.service';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  private API = 'https://newpick.onrender.com/api/auth/admin/login';

  constructor(
    private http: HttpClient,
    private tokenService: TokenService,
    private router: Router
  ) {}

  login(credentials: any): Observable<any> {
    return this.http.post<any>(this.API, credentials).pipe(
      tap(res => {
        console.log('login:', res);

        if (res.success && res.token) {
          this.tokenService.saveToken(res.token);
        }
      })
    );
  }

  logout() {
    this.tokenService.clear();
    localStorage.clear();
    sessionStorage.clear();
    this.router.navigate(['/auth/login']);
  }

  isLoggedIn(): boolean {
    return !!this.tokenService.getToken();
  }
}