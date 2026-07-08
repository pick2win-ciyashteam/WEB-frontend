import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { SubscriptionPlan, UserProfile } from 'src/app/core/interfaces/content';
import { ApiService } from 'src/app/core/services/api.service';
import { AuthModalService } from 'src/app/core/services/auth-modal.service';
import { AuthService } from 'src/app/core/services/auth.service';
import { ProfileService } from 'src/app/core/services/profile.service';

interface PricingPack {
  id: number;
  name: string;
  icon: string;
  coins: number;
  bonusCoins: number;
  totalCoins: number;
  validityDays: number;
  price: string;
  perCoin: string;
  currencySymbol: string;
  currencyCode: string;
  tone: string;
}

type RazorpayConstructor = new (options: Record<string, unknown>) => { open: () => void };

declare global {
  interface Window {
    Razorpay?: RazorpayConstructor;
  }
}

@Component({
  selector: 'app-pricing',
  templateUrl: './pricing.component.html',
  styleUrls: ['./pricing.component.css']
})
export class PricingComponent implements OnInit, OnDestroy {
  loggedIn$ = this.authService.loggedIn$;
  profile$ = this.profileService.profile$;
  loading = true;
  errorMessage = '';
  paymentError = '';
  paymentMessage = '';
  creditingCoins = false;
  purchasingPlanId: number | null = null;
  plans: SubscriptionPlan[] = [];
  generatedStateLoaded = false;
  hasGeneratedAnyUct = false;
  pricingPacks: PricingPack[] = [];

selectedPlan: SubscriptionPlan | null = null;
paymentProcessing = false;
paymentSucceeded = false;
paymentMethodsOpen = false;

  constructor(
    private api: ApiService,
    private authModal: AuthModalService,
    private authService: AuthService,
    private profileService: ProfileService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    if (this.authService.isLoggedIn()) {
      this.profileService.loadProfile(true).subscribe(() => this.refreshPricingPacks());
      this.loadGeneratedMatchState();
    } else {
      this.generatedStateLoaded = true;
    }

    this.api.getSubscriptionPlans().subscribe({
      next: (res) => {
        // console.log('subscription plans:', res);

        if (res?.success && Array.isArray(res.data) && res.data.length) {
          this.plans = [...res.data].sort((a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0));
          this.refreshPricingPacks();
        } else {
          this.plans = [];
          this.pricingPacks = [];
        }
        this.loading = false;
      },
      error: () => {
        this.errorMessage = 'Unable to load subscription plans. Please try again later.';
        this.loading = false;
      }
    });
  }

  ngOnDestroy(): void {
  }

  openSignup(): void {
    this.authModal.open('signup');
  }

  openPaymentMethods(): void {
    this.paymentMethodsOpen = true;
  }

  closePaymentMethods(): void {
    this.paymentMethodsOpen = false;
  }

  claimFreeMatch(): void {
    if (this.authService.isLoggedIn()) {
      this.router.navigate(['/lineouts']);
      return;
    }

    this.openSignup();
  }

  showFreeTrialBanner(profile: UserProfile | null): boolean {
    return this.authService.isLoggedIn()
      && this.generatedStateLoaded
      && !this.hasGeneratedAnyUct
      && Number(profile?.free_trial_used) === 0
      && String(profile?.free_trial_status || '').toLowerCase() === 'available';
  }

  openLogin(): void {
    this.authModal.open('login');
  }

  buyStaticPack(coins: number): void {
    const plan = this.plans.find(item => Number(item.coins) === coins);

    if (!plan) {
      this.paymentError = 'This coin pack is not available from backend yet. Please try again later.';
      return;
    }

    this.buyPlan(plan);
  }

  buyPricingPack(pack: PricingPack): void {
    const plan = this.plans.find(item => item.id === pack.id);
    if (!plan) {
      this.paymentError = 'This coin pack is not available from backend yet. Please try again later.';
      return;
    }
    this.buyPlan(plan);
  }

  async buyPlan(plan: SubscriptionPlan): Promise<void> {
  this.paymentError = '';
  this.paymentMessage = '';

  if (!this.authService.isLoggedIn()) {
    this.authModal.open('login');
    return;
  }

  this.purchasingPlanId = plan.id;
  this.paymentSucceeded = false;

  try {
    await this.loadRazorpayScript();

    const amount = Math.round(Number(plan.price || 0) * 100);
    const currency = this.displayCurrencyCodeForPlan();
    const res = await firstValueFrom(this.api.buyCoins({
      plan_id: plan.id,
      amount,
      coins: this.totalCoinsForPlan(plan)
    }));

    if (res?.success === false) {
      this.paymentError = res?.message || 'Unable to start Razorpay payment.';
      this.purchasingPlanId = null;
      return;
    }

    const paymentUrl = this.paymentUrlFrom(res);
    if (paymentUrl) {
      window.location.href = paymentUrl;
      return;
    }

    const key = this.razorpayKeyFrom(res);
    const order = this.razorpayOrderFrom(res, amount, currency);

    if (!key) {
      this.paymentError = res?.message || 'Payment started, but backend did not return Razorpay key.';
      this.purchasingPlanId = null;
      return;
    }

    this.selectedPlan = plan;
    this.openRazorpayCheckout(plan, order, key);

  } catch (err: any) {
    const status = err?.status ? ` (${err.status})` : '';
    this.paymentError =
      err?.error?.message ||
      err?.error?.error ||
      err?.message ||
      `Unable to start Razorpay payment${status}.`;
  }

  this.purchasingPlanId = null;
}

  planClass(plan: SubscriptionPlan): string {
    if (plan.is_popular) {
      return 'popular';
    }

    if (plan.is_pro) {
      return 'value';
    }

    return '';
  }

  trackPlan(_: number, plan: SubscriptionPlan): number {
    return plan.id;
  }

  packTone(index: number): string {
    return ['pk-orange', 'pk-green', 'pk-blue', 'pk-purple', 'pk-gold'][index % 5] || 'pk-orange';
  }

  packIcon(index: number, name: string): string {
    const value = String(name || '').toLowerCase();

    if (value.includes('starter')) return 'rocket_launch';
    if (value.includes('basic')) return 'shield';
    if (value.includes('standard')) return 'star';
    if (value.includes('pro')) return 'diamond';

    return ['rocket_launch', 'shield', 'star', 'diamond', 'workspace_premium'][index % 5] || 'paid';
  }

  isPurchasing(plan: SubscriptionPlan): boolean {
    return this.purchasingPlanId === plan.id;
  }

  badgeLabel(plan: SubscriptionPlan): string {
    if (plan.is_popular) {
      return 'Most Popular';
    }

    if (plan.is_pro) {
      return 'Pro Tier';
    }

    return '';
  }

  badgeIcon(plan: SubscriptionPlan): string {
    if (plan.is_popular) {
      return 'star';
    }

    if (plan.is_pro) {
      return 'health_and_safety';
    }

    return '';
  }

  launchRegularPrice(plan: SubscriptionPlan): number {
    const price = Number(plan.price || 0);
    return price > 0 ? price / 0.7 : 0;
  }

  launchSaving(plan: SubscriptionPlan): number {
    return Math.max(0, this.launchRegularPrice(plan) - Number(plan.price || 0));
  }

  launchSavePercent(plan: SubscriptionPlan): number {
    const regularPrice = this.launchRegularPrice(plan);
    return regularPrice > 0 ? (this.launchSaving(plan) / regularPrice) * 100 : 0;
  }

  perCoinText(plan: SubscriptionPlan): string {
    const suffix = this.isLowestPricePerCoin(plan) ? ' - lowest' : '';
    return `~ $${Number(plan.price_per_coin || 0).toFixed(2)} per coin${suffix}`;
  }

  isLowestPricePerCoin(plan: SubscriptionPlan): boolean {
    const prices = this.plans
      .map(item => Number(item.price_per_coin))
      .filter(price => Number.isFinite(price) && price > 0);

    if (!prices.length) {
      return false;
    }

    return Number(plan.price_per_coin) === Math.min(...prices);
  }

  private toPricingPack(plan: SubscriptionPlan, index: number): PricingPack {
    const coins = Number(plan.coins || 0);
    const bonusCoins = Number(plan.bonus_coins || 0);
    const totalCoins = this.totalCoinsForPlan(plan);
    const price = Number(plan.price || 0);
    const perCoin = totalCoins > 0 ? price / totalCoins : 0;
    const currencyCode = this.displayCurrencyCodeForPlan();

    return {
      id: plan.id,
      name: plan.name,
      icon: this.packIcon(index, plan.name),
      coins,
      bonusCoins,
      totalCoins,
      validityDays: Number(plan.validity_days || 365),
      price: price.toFixed(2),
      perCoin: perCoin.toFixed(2),
      currencySymbol: this.currencySymbolForCode(currencyCode, '$'),
      currencyCode,
      tone: this.packTone(index)
    };
  }

  private refreshPricingPacks(): void {
    this.pricingPacks = this.plans.map((plan, index) => this.toPricingPack(plan, index));
  }

  private displayCurrencyCodeForPlan(): string {
    return 'USD';
  }

  private currencySymbolForCode(code: string, fallback: string): string {
    const symbols: Record<string, string> = {
      USD: '$',
      CAD: 'C$',
      GBP: '£',
      EUR: '€',
      AUD: 'A$',
      NZD: 'NZ$',
      INR: '₹'
    };

    return symbols[code] || fallback || code;
  }

  private isProPack(plan: SubscriptionPlan): boolean {
    return Number(plan.is_pro) === 1 || /\bpro\b/i.test(String(plan.name || ''));
  }

  totalCoinsForPlan(plan: SubscriptionPlan): number {
    const coins = Number(plan.coins || 0);
    const bonusCoins = Number(plan.bonus_coins || 0);
    return Number(plan.total_coins || 0) || coins + bonusCoins;
  }

  private loadRazorpayScript(): Promise<void> {
    if (window.Razorpay) {
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      const existing = document.querySelector<HTMLScriptElement>('script[src="https://checkout.razorpay.com/v1/checkout.js"]');

      if (existing) {
        if (window.Razorpay) {
          resolve();
          return;
        }

        existing.addEventListener('load', () => resolve(), { once: true });
        existing.addEventListener('error', () => reject(new Error('Unable to load Razorpay Checkout.')), { once: true });
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Unable to load Razorpay Checkout.'));
      document.body.appendChild(script);
    });
  }

  private openRazorpayCheckout(
    plan: SubscriptionPlan,
    order: { orderId: string; amount: number; currency: string },
    key: string
  ): void {
    if (!window.Razorpay) {
      this.paymentError = 'Razorpay Checkout is not available. Please try again.';
      return;
    }

    const options: Record<string, unknown> = {
      key,
      amount: order.amount,
      currency: order.currency,
      name: 'PICK2WIN Technologies Pvt Ltd',
      logo: 'assets/favicon.png',
      description: `${plan.name} - ${this.totalCoinsForPlan(plan)} coins`,
      notes: {
        plan_id: String(plan.id),
        coins: String(this.totalCoinsForPlan(plan))
      },
      theme: {
        color: '#f4b400'
      },
      handler: (response: Record<string, unknown>) => this.handleRazorpaySuccess(plan, order, response),
      modal: {
        ondismiss: () => {
          this.paymentProcessing = false;
          this.purchasingPlanId = null;
        }
      }
    };

    if (order.orderId) {
      options['order_id'] = order.orderId;
    }

    this.paymentProcessing = true;
    this.paymentError = '';
    new window.Razorpay(options).open();
  }

  private handleRazorpaySuccess(
    plan: SubscriptionPlan,
    order: { orderId: string; amount: number; currency: string },
    response: Record<string, unknown>
  ): void {
    this.paymentMessage = 'Payment successful. Verifying and adding coins...';
    this.paymentError = '';

    this.api.verifyRazorpayPayment({
      plan_id: plan.id,
      amount: order.amount || Number(plan.price),
      coins: this.totalCoinsForPlan(plan),
      razorpay_order_id: String(response['razorpay_order_id'] || order.orderId || ''),
      razorpay_payment_id: String(response['razorpay_payment_id'] || ''),
      razorpay_signature: String(response['razorpay_signature'] || '')
    }).subscribe({
      next: (res: any) => {
        this.paymentProcessing = false;

        if (res?.success === false) {
          this.paymentMessage = '';
          this.paymentError = res?.message || 'Payment verified by Razorpay, but coins could not be added. Please contact support.';
          return;
        }

        this.paymentSucceeded = true;
        this.paymentMessage = res?.message || 'Payment successful. Coins added successfully.';
        this.profileService.loadProfile(true).subscribe();

        setTimeout(() => {
          this.selectedPlan = null;
          this.paymentSucceeded = false;
          this.router.navigate(['/user/profile'], {
            queryParams: { refresh: Date.now() }
          });
        }, 1500);
      },
      error: (err) => {
        this.paymentProcessing = false;
        this.paymentMessage = '';
        this.paymentError =
          err?.error?.message ||
          err?.error?.error ||
          'Payment completed, but verification failed. Please contact support with your Razorpay payment ID.';
      }
    });
  }

  private razorpayKeyFrom(res: any): string {
    const data = res?.data || {};
    const razorpay = res?.razorpay || data?.razorpay || {};

    return (
      res?.key ||
      res?.key_id ||
      res?.razorpay_key ||
      res?.razorpay_key_id ||
      data?.key ||
      data?.key_id ||
      data?.razorpay_key ||
      data?.razorpay_key_id ||
      razorpay?.key ||
      razorpay?.key_id ||
      razorpay?.razorpay_key ||
      razorpay?.razorpay_key_id ||
      ''
    );
  }

  private razorpayOrderFrom(res: any, fallbackAmount: number, fallbackCurrency: string): { orderId: string; amount: number; currency: string } {
    const data = res?.data || {};
    const order = data?.order || res?.order || {};
    const orderId =
      res?.order_id ||
      res?.razorpay_order_id ||
      data?.order_id ||
      data?.razorpay_order_id ||
      order?.id ||
      order?.order_id ||
      '';
    const amount = Number(res?.amount || data?.amount || order?.amount || fallbackAmount);
    const currency = String(res?.currency || data?.currency || order?.currency || fallbackCurrency || 'USD');

    return { orderId, amount, currency };
  }

  private paymentUrlFrom(res: any): string {
    const data = res?.data || {};

    return (
      res?.payment_url ||
      res?.paymentUrl ||
      res?.payment_link ||
      res?.short_url ||
      data?.payment_url ||
      data?.paymentUrl ||
      data?.payment_link ||
      data?.short_url ||
      ''
    );
  }

  private loadGeneratedMatchState(): void {
    this.generatedStateLoaded = false;

    this.api.GetMyTeams().subscribe({
      next: (res: any) => {
        const data = Array.isArray(res?.data) ? res.data : [];

        this.hasGeneratedAnyUct = data.some((match: any) => {
          const teamsGenerated = Number(match?.teams_generated || match?.total_teams || 0);
          return teamsGenerated > 0 || Boolean(match?.generated_at);
        });
        this.generatedStateLoaded = true;
      },
      error: () => {
        this.hasGeneratedAnyUct = false;
        this.generatedStateLoaded = true;
      }
    });
  }

}
