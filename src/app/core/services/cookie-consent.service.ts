import { Injectable } from '@angular/core';

type CookieConsentChoice = 'accepted' | 'rejected';

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
    pick2winTrackingEnabled?: boolean;
  }
}

@Injectable({
  providedIn: 'root'
})
export class CookieConsentService {
  private readonly storageKey = 'pick2win_cookie_consent';
  private readonly cookieName = 'pick2win_cookie_consent';

  getPreference(): CookieConsentChoice | null {
    const stored = this.readLocalStorage();

    if (stored === 'accepted' || stored === 'rejected') {
      return stored;
    }

    const cookie = this.readCookie();

    return cookie === 'accepted' || cookie === 'rejected' ? cookie : null;
  }

  accept(): void {
    this.savePreference('accepted');
    this.updateGoogleConsent('granted');
  }

  reject(): void {
    this.savePreference('rejected');
    this.updateGoogleConsent('denied');
  }

  enableSavedPreference(): void {
    const preference = this.getPreference();
    if (preference) {
      this.updateGoogleConsent(preference === 'accepted' ? 'granted' : 'denied');
    }
  }

  trackPageView(path: string, title: string): void {
    if (!window.pick2winTrackingEnabled || this.isAdminPath(path)) {
      return;
    }

    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({
      event: 'virtual_page_view',
      page_location: window.location.href,
      page_path: path,
      page_title: title
    });
  }

  isAdminPath(path: string): boolean {
    const pathname = path.split(/[?#]/, 1)[0];
    return pathname === '/admin' || pathname.startsWith('/admin/');
  }

  private updateGoogleConsent(state: 'granted' | 'denied'): void {
    if (!window.pick2winTrackingEnabled) {
      return;
    }

    window.dataLayer = window.dataLayer || [];
    window.gtag = window.gtag || function (...args: unknown[]): void {
      window.dataLayer!.push(args);
    };
    window.gtag('consent', 'update', {
      ad_storage: state,
      analytics_storage: state,
      ad_user_data: state,
      ad_personalization: state
    });
    window.dataLayer.push({ event: state === 'granted' ? 'cookie_consent_accepted' : 'cookie_consent_rejected' });
  }

  private savePreference(choice: CookieConsentChoice): void {
    try {
      localStorage.setItem(this.storageKey, choice);
    } catch {
      // Cookie fallback below is enough when localStorage is unavailable.
    }

    document.cookie = `${this.cookieName}=${choice}; Max-Age=31536000; Path=/; SameSite=Lax`;
  }

  private readLocalStorage(): string | null {
    try {
      return localStorage.getItem(this.storageKey);
    } catch {
      return null;
    }
  }

  private readCookie(): string | null {
    const match = document.cookie.match(new RegExp(`(?:^|; )${this.cookieName}=([^;]*)`));

    return match ? decodeURIComponent(match[1]) : null;
  }
}
