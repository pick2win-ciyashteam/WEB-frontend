import { Component, OnInit } from '@angular/core';
import { CookieConsentService } from '../../core/services/cookie-consent.service';

@Component({
  selector: 'app-cookie-consent',
  templateUrl: './cookie-consent.component.html',
  styleUrls: ['./cookie-consent.component.css']
})
export class CookieConsentComponent implements OnInit {
  showBanner = false;

  constructor(private cookieConsent: CookieConsentService) {}

  ngOnInit(): void {
    const preference = this.cookieConsent.getPreference();
    this.showBanner = !preference;
    this.cookieConsent.enableSavedPreference();
  }

  accept(): void {
    this.cookieConsent.accept();
    this.showBanner = false;
  }

  reject(): void {
    this.cookieConsent.reject();
    this.showBanner = false;
  }
}
