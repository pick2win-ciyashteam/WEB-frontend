import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, catchError, map, of, tap } from 'rxjs';
import { ADMIN_LOGIN_URL } from '../constants/admin-route.constants';
import { AdminService } from './admin.service';
import { TokenService } from './token.service';

@Injectable({
  providedIn: 'root'
})
export class AdminAuthService {

  private loggedInSubject = new BehaviorSubject<boolean>(false);
  loggedIn$ = this.loggedInSubject.asObservable();
  private readonly adminSessionCheck = () => this.refreshAdminSession();
  private readonly adminStorageListener = (event: StorageEvent) => {
    if (event.key === 'admin_token' || event.key === null) {
      this.refreshAdminSession();
    }
  };
  private readonly adminSessionCheckInterval = window.setInterval(
    () => this.refreshAdminSession(),
    15000
  );

  constructor(
    private adminService: AdminService,
    private tokenService: TokenService,
    private router: Router
  ) {
    this.refreshAdminSession();
    window.addEventListener('storage', this.adminStorageListener);
    window.addEventListener('focus', this.adminSessionCheck);
    document.addEventListener('visibilitychange', this.adminSessionCheck);
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
          if (!this.isLoggedIn()) {
            throw new Error('The server returned an invalid admin authentication token.');
          }
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
    return this.tokenService.hasValidAdminToken();
  }

  refreshAdminSession(): boolean {
    const loggedIn = this.isLoggedIn();
    const hadSession = this.loggedInSubject.value || !!this.tokenService.getAdminToken();

    if (!loggedIn && hadSession) {
      this.tokenService.clearAdmin();
    }

    this.loggedInSubject.next(loggedIn);

    if (!loggedIn && hadSession && this.router.url.startsWith('/admin/')) {
      this.router.navigate([ADMIN_LOGIN_URL], { replaceUrl: true });
    }

    return loggedIn;
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
    this.loggedInSubject.next(false);
    if (redirect) {
      this.router.navigate([ADMIN_LOGIN_URL], { replaceUrl: true });
    }
  }
}
