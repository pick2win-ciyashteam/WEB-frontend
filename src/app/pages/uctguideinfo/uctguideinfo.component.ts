import { AfterViewInit, Component, HostListener, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ApiService } from '../../core/services/api.service';

interface LandingPack {
  id: number;
  name: string;
  coins: number;
  bonusCoins: number;
  totalCoins: number;
  price: number;
  validityDays: number;
  popular: boolean;
  pro: boolean;
}

@Component({
  selector: 'app-uctguideinfo',
  templateUrl: './uctguideinfo.component.html',
  styleUrls: ['./uctguideinfo.component.css']
})
export class UctguideinfoComponent implements OnInit, AfterViewInit, OnDestroy {
  menuOpen = false;
  scrolled = false;
  exitModalOpen = false;
  packLoading = true;
  packs: LandingPack[] = [];
  private revealObserver?: IntersectionObserver;
  private exitModalHandled = false;
  private historyGuardActive = false;

  readonly processSteps = [
    { icon: 'fact_check', title: 'Official Lineups', text: 'Start with confirmed available players.' },
    { icon: 'groups', title: 'Build My Squad', text: 'Create your own player pool.' },
    { icon: 'verified_user', title: 'Smart Validation', text: 'Validate your selections before generation.' },
    { icon: 'tune', title: 'Configure Your Strategy', text: 'Set your configuration and preferences.' },
    { icon: 'bolt', title: 'Generate Valid Lineup Combinations', text: 'Create up to 20 rule-valid combinations.' },
    { icon: 'search', title: 'Review', text: 'Review every generated lineup combination.' },
    { icon: 'open_in_new', title: 'Recreate', text: 'Recreate your selected lineup where you play.' }
  ];

  constructor(private api: ApiService, private router: Router) {}

  ngOnInit(): void {
    if (typeof window !== 'undefined') {
      window.history.pushState({ pick2winExitGuard: true }, '', window.location.href);
      this.historyGuardActive = true;
    }

    this.api.getSubscriptionPlans().subscribe({
      next: (res: any) => {
        const plans = Array.isArray(res?.data) ? [...res.data] : [];
        plans.sort((a: any, b: any) => Number(a.sort_order || 0) - Number(b.sort_order || 0));
        this.packs = plans.map((plan: any) => {
          const coins = Number(plan.coins || 0);
          const bonusCoins = Number(plan.bonus_coins || 0);
          return {
            id: Number(plan.id || 0),
            name: plan.name || 'Starter Pack',
            coins,
            bonusCoins,
            totalCoins: Number(plan.total_coins || 0) || coins + bonusCoins,
            price: Number(plan.price || 0),
            validityDays: Number(plan.validity_days || 365),
            popular: Number(plan.is_popular || 0) === 1,
            pro: Number(plan.is_pro || 0) === 1
          };
        });
        this.packLoading = false;
      },
      error: () => this.packLoading = false
    });
  }

  ngAfterViewInit(): void {
    const selector =
      '.promo-page .section-heading, .promo-page .benefit-grid > *, .promo-page .problem-grid > *, ' +
      '.promo-page .do-grid > *, .promo-page .process-grid > *, .promo-page .pack-card, ' +
      '.promo-page .supported-sports-section .sport-card, .promo-page .trust-grid > *, .promo-page .signup-grid > *, ' +
      '.promo-page .product-screens > *, .promo-page .faq-list, .promo-page .closing-card, ' +
      '.promo-page .reference-feature-grid > *, .promo-page .strategy-panels > *, .promo-page .squad-flow > article';
    const elements = document.querySelectorAll(selector);

    if (!('IntersectionObserver' in window)) {
      elements.forEach(element => element.classList.add('is-visible'));
      return;
    }

    this.revealObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          this.revealObserver?.unobserve(entry.target);
        }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });

    elements.forEach((element, index) => {
      element.classList.add('reveal');
      (element as HTMLElement).style.setProperty('--reveal-delay', `${Math.min(index % 4, 3) * 70}ms`);
      this.revealObserver?.observe(element);
    });
  }

  ngOnDestroy(): void {
    this.revealObserver?.disconnect();
    document.body.style.overflow = '';
  }

  @HostListener('window:scroll')
  onWindowScroll(): void {
    this.scrolled = window.scrollY > 20;

    const reachedBottom =
      window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 40;

    if (reachedBottom) {
      this.openExitModal();
    }
  }

  @HostListener('document:mouseout', ['$event'])
  onDocumentMouseOut(event: MouseEvent): void {
    if (!event.relatedTarget && event.clientY <= 8) {
      this.openExitModal();
    }
  }

  @HostListener('window:popstate')
  onBrowserBack(): void {
    if (!this.historyGuardActive) {
      return;
    }

    if (!this.exitModalHandled) {
      this.openExitModal();
      window.history.pushState({ pick2winExitGuard: true }, '', window.location.href);
      return;
    }

    this.historyGuardActive = false;
    window.history.back();
  }

  @HostListener('document:keydown.escape')
  closeExitModal(): void {
    if (!this.exitModalOpen) {
      return;
    }

    this.exitModalOpen = false;
    this.exitModalHandled = true;
    document.body.style.overflow = '';
  }

  openExitModal(): void {
    if (this.exitModalHandled || this.exitModalOpen) {
      return;
    }

    this.exitModalOpen = true;
    document.body.style.overflow = 'hidden';
  }

  exitModalSignup(): void {
    this.exitModalOpen = false;
    this.exitModalHandled = true;
    this.historyGuardActive = false;
    document.body.style.overflow = '';
    this.openSignup();
  }

  scrollTo(sectionId: string): void {
    this.menuOpen = false;
    document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  openLogin(): void {
    this.menuOpen = false;
    this.router.navigate(['/auth/login']);
  }

  openSignup(): void {
    this.menuOpen = false;
    this.router.navigate(['/auth/signup']);
  }

  openPricing(): void {
    this.menuOpen = false;
    this.router.navigate(['/pricing'], { fragment: 'coin-packs' });
  }
}
