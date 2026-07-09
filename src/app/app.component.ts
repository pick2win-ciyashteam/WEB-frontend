import { Component, OnDestroy, OnInit } from '@angular/core';
import { AuthModalService } from './core/services/auth-modal.service';
import { Subject, filter, takeUntil } from 'rxjs';
import { AuthService } from './core/services/auth.service';
import { FirebaseNotificationService } from './core/services/firebase-notification.service';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import { Meta, Title } from '@angular/platform-browser';

interface RouteSeoData {
  title: string;
  description: string;
  hashtags: string;
  url?: string;
}

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit, OnDestroy {
  title = 'pick2winWeb';
  private destroy$ = new Subject<void>();

  constructor(
    public authModal: AuthModalService,
    private authService: AuthService,
    private notificationService: FirebaseNotificationService,
    private router: Router,
    private activatedRoute: ActivatedRoute,
    private titleService: Title,
    private metaService: Meta
  ) {}

  ngOnInit() {
    this.watchRouteSeo();
    this.notificationService.requestPermissionOnAppOpen();

    this.authService.loggedIn$
      .pipe(
        filter(Boolean),
        takeUntil(this.destroy$)
      )
      .subscribe(() => {
        this.notificationService.initializeAfterLogin();
        this.notificationService.loadNotifications(1, 20).subscribe();
      });
  }

  private watchRouteSeo(): void {
    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        takeUntil(this.destroy$)
      )
      .subscribe(() => this.applyCurrentRouteSeo());

    this.applyCurrentRouteSeo();
  }

  private applyCurrentRouteSeo(): void {
    const activeRoute = this.deepestRoute(this.activatedRoute);
    const seo = activeRoute.snapshot.data?.['seo'] as RouteSeoData | undefined;

    if (!seo) {
      return;
    }

    const canonicalUrl = seo.url || this.absoluteCurrentUrl();
    const keywords = seo.hashtags
      .split(/\s+/)
      .map(tag => tag.replace(/^#/, '').trim())
      .filter(Boolean)
      .join(', ');

    this.titleService.setTitle(seo.title);
    this.metaService.updateTag({ name: 'description', content: seo.description });
    this.metaService.updateTag({ name: 'keywords', content: keywords });
    this.metaService.updateTag({ name: 'hashtags', content: seo.hashtags });
    this.metaService.updateTag({ name: 'robots', content: 'index, follow' });

    this.metaService.updateTag({ property: 'og:title', content: seo.title });
    this.metaService.updateTag({ property: 'og:description', content: seo.description });
    this.metaService.updateTag({ property: 'og:url', content: canonicalUrl });
    this.metaService.updateTag({ property: 'og:type', content: 'website' });

    this.metaService.updateTag({ name: 'twitter:card', content: 'summary_large_image' });
    this.metaService.updateTag({ name: 'twitter:title', content: seo.title });
    this.metaService.updateTag({ name: 'twitter:description', content: seo.description });

    this.updateCanonicalUrl(canonicalUrl);
  }

  private deepestRoute(route: ActivatedRoute): ActivatedRoute {
    let activeRoute = route;

    while (activeRoute.firstChild) {
      activeRoute = activeRoute.firstChild;
    }

    return activeRoute;
  }

  private absoluteCurrentUrl(): string {
    const path = this.router.url.split(/[?#]/)[0] || '/';
    return `https://pick2win.io${path === '/' ? '/' : path}`;
  }

  private updateCanonicalUrl(url: string): void {
    let link = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');

    if (!link) {
      link = document.createElement('link');
      link.rel = 'canonical';
      document.head.appendChild(link);
    }

    link.href = url;
  }

  closeAuthModal() {
    this.authModal.close();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
