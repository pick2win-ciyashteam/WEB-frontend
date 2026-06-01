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
