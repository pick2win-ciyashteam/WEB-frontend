import { Injectable } from '@angular/core';

type CookieConsentChoice = 'accepted' | 'rejected';

declare global {
  interface Window {
    dataLayer?: unknown[];
  }
}

@Injectable({
  providedIn: 'root'
})
export class CookieConsentService {
  private readonly storageKey = 'pick2win_cookie_consent';
  private readonly cookieName = 'pick2win_cookie_consent';
  private readonly gtmId = 'GTM-N3SSCT94';
  private tagsLoaded = false;

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
    this.enableMarketingTags();
  }

  reject(): void {
    this.savePreference('rejected');
  }

  enableSavedPreference(): void {
    if (this.getPreference() === 'accepted') {
      this.enableMarketingTags();
    }
  }

  private enableMarketingTags(): void {
    if (this.tagsLoaded || typeof document === 'undefined') {
      return;
    }

    if (document.getElementById('pick2win-gtm-script')) {
      this.tagsLoaded = true;
      return;
    }

    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({
      event: 'cookie_consent_accepted',
      analytics_storage: 'granted',
      ad_storage: 'granted'
    });

    const firstScript = document.getElementsByTagName('script')[0];
    const script = document.createElement('script');
    script.id = 'pick2win-gtm-script';
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtm.js?id=${this.gtmId}`;

    firstScript?.parentNode?.insertBefore(script, firstScript);
    this.tagsLoaded = true;
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
