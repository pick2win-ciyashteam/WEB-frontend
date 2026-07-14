import { Injectable, Injector } from '@angular/core';
import {
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpInterceptor
} from '@angular/common/http';
import { Observable, catchError, throwError } from 'rxjs';
import { TokenService } from '../services/token.service';
import { AuthService } from '../services/auth.service';
import { AdminAuthService } from '../services/admin-auth.service';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {

  constructor(
    private tokenService: TokenService,
    private injector: Injector
  ) {}

  intercept(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    if (!this.isPick2WinApiRequest(request)) {
      return next.handle(request);
    }

    const usesAdminToken = this.isAdminApiRequest(request) && !this.isUserFeedbackRequest(request);
    const token = usesAdminToken
      ? this.tokenService.getAdminToken()
      : this.tokenService.getToken();

    if (token) {
      request = request.clone({
        setHeaders: {
          Authorization: `Bearer ${token}`
        }
      });
    }

    return next.handle(request).pipe(
      catchError(error => {
        if (this.isInvalidSessionResponse(error) && token) {
          if (usesAdminToken) {
            this.injector.get(AdminAuthService).clearAdminSession();
          } else {
            this.injector.get(AuthService).handleInvalidSession();
          }
        }

        return throwError(() => error);
      })
    );
  }

  private isAdminApiRequest(request: HttpRequest<unknown>): boolean {
    return request.url.includes('/api/admin/');
  }

  private isPick2WinApiRequest(request: HttpRequest<unknown>): boolean {
    try {
      const url = new URL(request.url, window.location.origin);
      return url.origin === 'https://pick2win.io' && url.pathname.startsWith('/backend/api/');
    } catch {
      return request.url.startsWith('/backend/api/');
    }
  }

  private isInvalidSessionResponse(error: any): boolean {
    if (error?.status === 401) {
      return true;
    }

    if (error?.status !== 403) {
      return false;
    }

    const message = String(
      error?.error?.message || error?.error?.error || error?.message || ''
    ).toLowerCase();

    return ['token', 'jwt', 'unauthenticated', 'authentication', 'session', 'expired']
      .some(term => message.includes(term));
  }

  private isUserFeedbackRequest(request: HttpRequest<unknown>): boolean {
    return request.url.includes('/api/admin/feedback/');
  }
}
