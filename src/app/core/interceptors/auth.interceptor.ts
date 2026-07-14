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
        if ((error?.status === 401 || error?.status === 403) && token) {
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

  private isUserFeedbackRequest(request: HttpRequest<unknown>): boolean {
    return request.url.includes('/api/admin/feedback/');
  }
}
