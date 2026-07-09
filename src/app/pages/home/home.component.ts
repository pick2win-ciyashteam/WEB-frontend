import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Banner } from 'src/app/core/interfaces/content';
import { ApiService } from 'src/app/core/services/api.service';
import { AuthService } from 'src/app/core/services/auth.service';
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
  showSplash = false;
  showLaunchModal = false;
  currentLaunchBanner = 0;
  readonly launchingBanners = [
    'assets/launching_banner.jpeg',
    'assets/launching_banner2.jpeg'
  ];
  showTodayLineupsCta = false;
  loggedIn$ = this.authService.loggedIn$;

  private timer: any;
  private bannerTimer: any;
  private todayLineupsTimer: any;
  private splashTimer: any;
  private launchBannerTimer: any;
  private launchDate = new Date('2026-06-24T09:00:00Z').getTime();
  private launchSplashStorageKey = 'pick2win_launch_splash_seen';
  private launchingBannerStorageKey = 'pick2win_launching_banner_july_2026_seen';
  private launchingBannerEndsAt = new Date('2026-07-11T23:11:11+05:30').getTime();
  private staticHomeBannerCount = 6;

  constructor(
    private authModal: AuthModalService,
    private api: ApiService,
    private authService: AuthService,
    private router: Router
  ) {}

  openSignup() {
    this.showLaunchModal = false;
    this.authModal.open('signup');
  }

  openFreeMatchCta(): void {
    if (this.authService.isLoggedIn()) {
      this.router.navigate(['/lineouts']);
      return;
    }

    this.openSignup();
  }

  freeMatchCtaText(): string {
    return this.authService.isLoggedIn()
      ? 'Go to lineouts ->'
      : 'Sign up - your first match is free ->';
  }

  ngOnInit(): void {
    this.updateCountdown();
    this.showSplash = this.shouldShowSplash();
    this.showLaunchModal = this.shouldShowLaunchModal();
    this.startLaunchingBannerTimer();
    // Dynamic banners paused for now. Static home banners are rendered in the template.
    // this.loadBanners();
    this.startStaticBannerTimer();
    this.loadTodayLineupsCta();
    this.startTodayLineupsRefresh();
    this.timer = setInterval(() => this.updateCountdown(), 1000);
  }

  ngOnDestroy(): void {
    clearInterval(this.timer);
    clearInterval(this.bannerTimer);
    clearInterval(this.todayLineupsTimer);
    clearInterval(this.launchBannerTimer);
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
    this.markSplashSeen();
    clearTimeout(this.splashTimer);
  }

  closeLaunchModal(): void {
    this.showLaunchModal = false;
    clearInterval(this.launchBannerTimer);
    this.markLaunchingBannerSeen();
  }

  showLaunchingBanner(index: number): void {
    this.currentLaunchBanner = index;
    this.startLaunchingBannerTimer();
  }

  previousLaunchingBanner(): void {
    this.currentLaunchBanner =
      (this.currentLaunchBanner - 1 + this.launchingBanners.length) % this.launchingBanners.length;
    this.startLaunchingBannerTimer();
  }

  nextLaunchingBanner(): void {
    this.currentLaunchBanner = (this.currentLaunchBanner + 1) % this.launchingBanners.length;
  }

  updateCountdown(): void {
    const now = new Date().getTime();
    const diff = this.launchDate - now;

    if (diff <= 0) {
      this.launchStatus = 'LIVE NOW';
      this.days = this.hours = this.minutes = this.seconds = '00';
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
      
        this.banners = res?.success && Array.isArray(res.data) ? res.data : [];
        this.currentBanner = 0;
        this.bannersLoading = false;
        this.startBannerTimer();
      },
      error: (error) => {
       
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

  private startTodayLineupsRefresh(): void {
    clearInterval(this.todayLineupsTimer);
    this.todayLineupsTimer = setInterval(() => this.loadTodayLineupsCta(), 60000);
  }

  private startLaunchingBannerTimer(): void {
    clearInterval(this.launchBannerTimer);

    if (this.showLaunchModal && this.launchingBanners.length > 1) {
      this.launchBannerTimer = setInterval(() => this.nextLaunchingBanner(), 4500);
    }
  }

  private shouldShowLaunchModal(): boolean {
    if (Date.now() >= this.launchingBannerEndsAt) {
      return false;
    }

    try {
      const shouldShow = localStorage.getItem(this.launchingBannerStorageKey) !== 'true';

      if (shouldShow) {
        localStorage.setItem(this.launchingBannerStorageKey, 'true');
      }

      return shouldShow;
    } catch {
      return true;
    }
  }

  private markLaunchingBannerSeen(): void {
    try {
      localStorage.setItem(this.launchingBannerStorageKey, 'true');
    } catch {
      // If storage is blocked, the modal still closes for the current component instance.
    }
  }

  private shouldShowSplash(): boolean {
    if (Date.now() >= this.launchDate) {
      return false;
    }

    try {
      return sessionStorage.getItem(this.launchSplashStorageKey) !== 'true';
    } catch {
      return true;
    }
  }

  private markSplashSeen(): void {
    try {
      sessionStorage.setItem(this.launchSplashStorageKey, 'true');
    } catch {
      // If storage is blocked, the splash still closes for the current component instance.
    }
  }
}
