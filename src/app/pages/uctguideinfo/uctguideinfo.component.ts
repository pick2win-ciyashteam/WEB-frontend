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
    { icon: 'how_to_reg', title: 'Create Your Free Account', text: 'Register and verify your email. No payment is required to get started.' },
    { icon: 'paid', title: 'Purchase Coins', text: 'Choose the coin pack that fits your needs. No monthly subscriptions or recurring charges.' },
    { icon: 'sports_soccer', title: 'Choose Your Sport', text: 'Start with Soccer today, with more supported sports coming soon.' },
    { icon: 'fact_check', title: 'Choose a Lineup Configuration', text: 'Select the supported lineup configuration for your chosen sport.' },
    { icon: 'group_add', title: 'Build Your Player Pool', text: 'Select the players you want to include. Every generated lineup uses only your selected player pool.' },
    { icon: 'tune', title: 'Configure Your Lineup', text: 'Set your preferred lineup configuration and player preferences.' },
    { icon: 'auto_fix_high', title: 'Generate Lineup Combinations', text: 'PICK2WIN applies the selected roster rules and creates multiple rule-valid lineup combinations.' },
    { icon: 'download_for_offline', title: 'Review & Download', text: 'Review every generated lineup before downloading up to 20 rule-valid lineup combinations as TXT.' }
  ];

  readonly benefits = [
    { icon: 'bolt', title: 'Save Time', text: 'Create multiple rule-valid lineup combinations in seconds.' },
    { icon: 'my_location', title: 'Better Coverage', text: 'Generate multiple rule-valid lineup combinations from your selected player pool.' },
    { icon: 'psychology', title: 'Complete Control', text: 'Every player, configuration, and lineup starts with your own selections.' },
    { icon: 'attach_money', title: 'Affordable Pricing', text: 'Affordable coin-based pricing with no monthly subscriptions.' },
    { icon: 'calendar_month', title: '365-Day Validity', text: 'Every purchased coin pack is valid for 365 days.' },
    { icon: 'verified_user', title: 'Transparent', text: 'Built around your selections. No hidden decision-making.' }
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
