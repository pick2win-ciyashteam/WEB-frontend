import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, catchError, map, of, tap } from 'rxjs';
import { AdminService } from './admin.service';
import { TokenService } from './token.service';

@Injectable({
  providedIn: 'root'
})
export class AdminAuthService {

  private loggedInSubject = new BehaviorSubject<boolean>(false);
  loggedIn$ = this.loggedInSubject.asObservable();

  constructor(
    private adminService: AdminService,
    private tokenService: TokenService,
    private router: Router
  ) {
    this.loggedInSubject.next(this.isLoggedIn());
  }

  login(email: string, password: string, twoFaCode: string): Observable<any> {
    return this.adminService.login({ email, password, twoFaCode }).pipe(
      tap(res => {
        const token =
          res?.token ||
          res?.accessToken ||
          res?.access_token ||
          res?.adminToken ||
          res?.data?.token ||
          res?.data?.accessToken ||
          res?.data?.access_token ||
          res?.data?.adminToken ||
          res?.data?.admin?.token ||
          res?.admin?.token;

        if (token && res?.success !== false) {
          this.tokenService.saveAdminToken(token);
          this.loggedInSubject.next(true);
        } else {
          console.log('Admin login response missing token:', res);
        }
      })
    );
  }

  logout(): void {
    this.adminService.logout().subscribe({
      error: (error) => console.log('Admin logout API error:', error)
    });
    this.clearAdminSession();
  }

  isLoggedIn(): boolean {
    return !!this.tokenService.getAdminToken();
  }

  /** Confirms a locally stored token is still a valid admin session on the server. */
  validateSession(): Observable<boolean> {
    if (!this.isLoggedIn()) {
      return of(false);
    }

    return this.adminService.getAdminProfile().pipe(
      map(response => response?.success !== false),
      catchError(() => of(false))
    );
  }

  clearAdminSession(redirect = true): void {
    this.tokenService.clearAdmin();
    this.tokenService.clear();
    localStorage.removeItem('user');
    localStorage.removeItem('currentUser');
    localStorage.removeItem('pick2win_user');
    sessionStorage.clear();
    this.loggedInSubject.next(false);
    if (redirect) {
      this.router.navigate(['/admin/login'], { replaceUrl: true });
    }
  }
}
