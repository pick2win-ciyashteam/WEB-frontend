import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class TokenService {

  private TOKEN_KEY = 'token';
  private ADMIN_TOKEN_KEY = 'admin_token';

  saveToken(token: string) {
    localStorage.setItem(this.TOKEN_KEY, token);
  }

  getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  hasValidToken(): boolean {
    return this.isJwtValid(this.getToken());
  }

  hasValidAdminToken(): boolean {
    return this.isJwtValid(this.getAdminToken());
  }

  private isJwtValid(token: string | null): boolean {

    if (!token) {
      return false;
    }

    try {
      const parts = token.split('.');
      if (parts.length !== 3) {
        return false;
      }

      const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
      const paddedBase64 = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=');
      const payload = JSON.parse(atob(paddedBase64)) as { exp?: number; nbf?: number };
      const nowSeconds = Date.now() / 1000;

      return (typeof payload.exp !== 'number' || payload.exp > nowSeconds)
        && (typeof payload.nbf !== 'number' || payload.nbf <= nowSeconds);
    } catch {
      return false;
    }
  }

  clear() {
    localStorage.removeItem(this.TOKEN_KEY);
  }

  saveAdminToken(token: string) {
    localStorage.setItem(this.ADMIN_TOKEN_KEY, token);
  }

  getAdminToken(): string | null {
    return localStorage.getItem(this.ADMIN_TOKEN_KEY);
  }

  clearAdmin() {
    localStorage.removeItem(this.ADMIN_TOKEN_KEY);
  }
}
