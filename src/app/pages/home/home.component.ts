import { Component, OnDestroy, OnInit } from '@angular/core';
import { Banner } from 'src/app/core/interfaces/content';
import { ApiService } from 'src/app/core/services/api.service';
import { AuthModalService } from 'src/app/core/services/auth-modal.service';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent implements OnInit, OnDestroy {

  launchStatus = 'LAUNCHING SOON';

  days = '00';
  hours = '00';
  minutes = '00';
  seconds = '00';
  currentBanner = 0;
  banners: Banner[] = [];
  bannersLoading = true;
  showSplash = true;
  showLaunchModal = false;
  showTodayLineupsCta = false;

  private timer: any;
  private bannerTimer: any;
  private splashTimer: any;
  private launchDate = new Date('2026-06-10T09:00:00Z').getTime();
  private staticHomeBannerCount = 6;

  constructor(
    private authModal: AuthModalService,
    private api: ApiService
  ) {}

  openSignup() {
    this.showLaunchModal = false;
    this.authModal.open('signup');
  }

  ngOnInit(): void {
    this.updateCountdown();
    this.showLaunchModal = this.shouldShowLaunchModal();
    // Dynamic banners paused for now. Static home banners are rendered in the template.
    // this.loadBanners();
    this.startStaticBannerTimer();
    this.loadTodayLineupsCta();
    this.timer = setInterval(() => this.updateCountdown(), 1000);
    this.splashTimer = setTimeout(() => this.closeSplash(), 2200);
  }

  ngOnDestroy(): void {
    clearInterval(this.timer);
    clearInterval(this.bannerTimer);
    clearTimeout(this.splashTimer);
  }

  showBanner(index: number): void {
    this.currentBanner = index;
  }

  nextBanner(): void {
    const bannerCount = this.banners.length || this.staticHomeBannerCount;

    if (!bannerCount) {
      return;
    }

    this.currentBanner = (this.currentBanner + 1) % bannerCount;
  }

  openBannerLink(banner: Banner): void {
    if (banner.link) {
      window.open(banner.link, '_blank', 'noopener');
    }
  }

  trackByBannerId(_: number, banner: Banner): number {
    return banner.id;
  }

  bannerRouterLink(banner: Banner): string {
    const link = String(banner.link || '').trim();

    if (!link) {
      return '/';
    }

    return link.startsWith('/') ? link : `/${link}`;
  }

  closeSplash(): void {
    this.showSplash = false;
    clearTimeout(this.splashTimer);
  }

  closeLaunchModal(): void {
    this.showLaunchModal = false;
  }

  updateCountdown(): void {
    const now = new Date().getTime();
    const diff = this.launchDate - now;

    if (diff <= 0) {
      this.launchStatus = 'LIVE NOW';
      this.days = this.hours = this.minutes = this.seconds = '00';
      this.showLaunchModal = false;
      clearInterval(this.timer);
      return;
    }

    this.days = String(Math.floor(diff / (1000 * 60 * 60 * 24))).padStart(2, '0');
    this.hours = String(Math.floor((diff / (1000 * 60 * 60)) % 24)).padStart(2, '0');
    this.minutes = String(Math.floor((diff / (1000 * 60)) % 60)).padStart(2, '0');
    this.seconds = String(Math.floor((diff / 1000) % 60)).padStart(2, '0');
  }

  private loadBanners(): void {
    this.bannersLoading = true;

    this.api.getBanners().subscribe({
      next: (res) => {
        console.log('Home banner API response:', res);
        this.banners = res?.success && Array.isArray(res.data) ? res.data : [];
        this.currentBanner = 0;
        this.bannersLoading = false;
        this.startBannerTimer();
      },
      error: (error) => {
        console.log('Home banner API error:', error);
        this.banners = [];
        this.bannersLoading = false;
      }
    });
  }

  private loadTodayLineupsCta(): void {
    this.api.getTodayLineups().subscribe({
      next: (res) => {
        this.showTodayLineupsCta = !!res?.success && !!res.any_lineup_today;
      },
      error: () => {
        this.showTodayLineupsCta = false;
      }
    });
  }

  private startBannerTimer(): void {
    clearInterval(this.bannerTimer);

    if (this.banners.length > 1) {
      this.bannerTimer = setInterval(() => this.nextBanner(), 5000);
    }
  }

  private startStaticBannerTimer(): void {
    clearInterval(this.bannerTimer);
    this.bannerTimer = setInterval(() => this.nextBanner(), 5000);
  }

  private shouldShowLaunchModal(): boolean {
    return Date.now() < this.launchDate;
  }
}
