import { Injectable } from '@angular/core';
import {
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpInterceptor
} from '@angular/common/http';
import { Observable } from 'rxjs';
import { TokenService } from '../services/token.service';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {

  constructor(private tokenService: TokenService) {}

  intercept(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    const token = this.isAdminApiRequest(request) && !this.isUserFeedbackRequest(request)
      ? this.tokenService.getAdminToken()
      : this.tokenService.getToken();

    if (token) {
      request = request.clone({
        setHeaders: {
          Authorization: `Bearer ${token}`
        }
      });
    }

    return next.handle(request);
  }

  private isAdminApiRequest(request: HttpRequest<unknown>): boolean {
    return request.url.includes('/api/admin/');
  }

  private isUserFeedbackRequest(request: HttpRequest<unknown>): boolean {
    return request.url.includes('/api/admin/feedback/');
  }
}
