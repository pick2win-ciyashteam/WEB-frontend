import { Component, HostListener, OnInit } from '@angular/core';
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
export class UctguideinfoComponent implements OnInit {
  menuOpen = false;
  scrolled = false;
  packLoading = true;
  packs: LandingPack[] = [];

  readonly processSteps = [
    { icon: 'person_add', title: 'Create your free account', text: 'Register and verify your email. No payment is required to sign up.' },
    { icon: 'database', title: 'Purchase coins', text: 'Choose the coin pack that fits your needs. No subscriptions or recurring charges.' },
    { icon: 'sports_soccer', title: 'Choose your sport', text: 'Start with Soccer today, with more supported sports on the roadmap.' },
    { icon: 'sports_esports', title: 'Choose a platform', text: 'Select DraftKings or FanDuel and the supported contest mode.' },
    { icon: 'groups', title: 'Build your player pool', text: 'Select players using your own knowledge. Every lineup uses only this pool.' },
    { icon: 'tune', title: 'Configure your strategy', text: 'Set optional mandatory players, Captain or MVP candidates, and preferences.' },
    { icon: 'auto_awesome', title: 'Generate combinations', text: 'Apply roster rules, salary-cap validation, and your configuration.' },
    { icon: 'download', title: 'Review and download', text: 'Inspect every result and download up to 20 rule-valid lineups as TXT.' }
  ];

  readonly benefits = [
    { icon: 'bolt', title: 'Save time', text: 'Create multiple combinations from one configuration instead of rebuilding every lineup.' },
    { icon: 'target', title: 'Stay in control', text: 'Every player, rule, configuration, and lineup comes from you.' },
    { icon: 'account_tree', title: 'Explore more', text: 'Test more valid combinations while keeping your player pool and strategy intact.' },
    { icon: 'visibility', title: 'Built on transparency', text: 'No AI picks, projections, recommendations, or hidden decision-making.' }
  ];

  constructor(private api: ApiService, private router: Router) {}

  ngOnInit(): void {
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

  @HostListener('window:scroll')
  onWindowScroll(): void {
    this.scrolled = window.scrollY > 20;
  }

  scrollTo(sectionId: string): void {
    this.menuOpen = false;
    document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  openLogin(): void {
    this.menuOpen = false;
    this.router.navigate(['/auth/login']);
  }

  openPricing(): void {
    this.menuOpen = false;
    this.router.navigate(['/pricing'], { fragment: 'coin-packs' });
  }
}
