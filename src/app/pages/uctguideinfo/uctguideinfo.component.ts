import { Component, HostListener, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ApiService } from '../../core/services/api.service';

interface LandingPack {
  name: string;
  coins: number;
  bonusCoins: number;
  totalCoins: number;
  price: number;
  validityDays: number;
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
  offerPack: LandingPack = {
    name: 'Starter Pack',
    coins: 3,
    bonusCoins: 0,
    totalCoins: 3,
    price: 2,
    validityDays: 365
  };

  readonly processSteps = [
    { icon: 'person_add', title: 'Sign Up', text: 'Create your secure PICK2WIN account.' },
    { icon: 'login', title: 'Login', text: 'Sign in and open your personal workspace.' },
    { icon: 'format_list_numbered', title: 'Lineups', text: 'Choose an available match from Lineouts.' },
    { icon: 'bolt', title: 'Run UCT', text: 'Start the guided configuration workflow.' },
    { icon: 'sports_esports', title: 'Fantasy Platform', text: 'Select DraftKings or FanDuel.' },
    { icon: 'style', title: 'Select Cards', text: 'Pick players and configure your strategy.' },
    { icon: 'auto_awesome', title: 'Generate Teams', text: 'Create up to 20 rule-valid lineups.' },
    { icon: 'download', title: 'Download TXT', text: 'Review and download your generated teams.' }
  ];

  constructor(private api: ApiService, private router: Router) {}

  ngOnInit(): void {
    this.api.getSubscriptionPlans().subscribe({
      next: (res: any) => {
        const plans = Array.isArray(res?.data) ? [...res.data] : [];
        plans.sort((a: any, b: any) => Number(a.sort_order || 0) - Number(b.sort_order || 0));
        const plan = plans[0];
        if (plan) {
          const coins = Number(plan.coins || 0);
          const bonusCoins = Number(plan.bonus_coins || 0);
          this.offerPack = {
            name: plan.name || 'Starter Pack',
            coins,
            bonusCoins,
            totalCoins: Number(plan.total_coins || 0) || coins + bonusCoins,
            price: Number(plan.price || 0),
            validityDays: Number(plan.validity_days || 365)
          };
        }
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
}
