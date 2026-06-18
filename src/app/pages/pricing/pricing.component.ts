import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Router } from '@angular/router';
import { loadStripe } from '@stripe/stripe-js';
import { firstValueFrom } from 'rxjs';
import { CheckoutSessionResponse, StripeConfigResponse, SubscriptionPlan, UserProfile } from 'src/app/core/interfaces/content';
import { ApiService } from 'src/app/core/services/api.service';
import { AuthModalService } from 'src/app/core/services/auth-modal.service';
import { AuthService } from 'src/app/core/services/auth.service';
import { ProfileService } from 'src/app/core/services/profile.service';

interface PricingPack {
  name: string;
  subtitle: string;
  coins: number;
  matches: number;
  regularPrice: string;
  offerPrice: string;
  perCoin: string;
  saveText: string;
  tone: string;
  bestValue?: boolean;
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
  pricingPacks: PricingPack[] = [
    {
      name: 'Starter Pack',
      subtitle: 'First time / Casual',
      coins: 5,
      matches: 5,
      regularPrice: '15.00',
      offerPrice: '10.50',
      perCoin: '2.10',
      saveText: '',
      tone: 'pk-green'
    },
    {
      name: 'Basic Pack',
      subtitle: 'Regular weekly user',
      coins: 10,
      matches: 10,
      regularPrice: '27.50',
      offerPrice: '19.25',
      perCoin: '1.93',
      saveText: 'save 8%',
      tone: 'pk-blue'
    },
    {
      name: 'Standard Pack',
      subtitle: 'Multi-league active user',
      coins: 25,
      matches: 25,
      regularPrice: '62.50',
      offerPrice: '43.75',
      perCoin: '1.75',
      saveText: 'save 17%',
      tone: 'pk-purple'
    },
    {
      name: 'Pro Pack',
      subtitle: 'Heavy season-long user',
      coins: 50,
      matches: 50,
      regularPrice: '112.50',
      offerPrice: '78.75',
      perCoin: '1.58',
      saveText: 'save 25%',
      tone: 'pk-orange',
      bestValue: true
    }
  ];
  private stripePublishableKey = '';

  stripe: any;
elements: any;
paymentElement: any;

clientSecret = '';
selectedPlan: SubscriptionPlan | null = null;
checkoutOpen = false;
paymentProcessing = false;
paymentSucceeded = false;

  constructor(
    private api: ApiService,
    private authModal: AuthModalService,
    private authService: AuthService,
    private profileService: ProfileService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.handleStripeReturn();

    if (this.authService.isLoggedIn()) {
      this.profileService.loadProfile(true).subscribe();
      this.loadGeneratedMatchState();
    } else {
      this.generatedStateLoaded = true;
    }

    this.api.getSubscriptionPlans().subscribe({
      next: (res) => {
        // console.log('subscription plans:', res);

        if (res?.success && Array.isArray(res.data) && res.data.length) {
          this.plans = [...res.data].sort((a, b) => a.sort_order - b.sort_order);
        } else {
          this.errorMessage = 'No subscription plans available.';
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
    if (this.paymentElement) {
      this.paymentElement.unmount();
      this.paymentElement = null;
    }

    this.elements = null;
    this.stripe = null;
  }

  openSignup(): void {
    this.authModal.open('signup');
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
    const config = await firstValueFrom(this.api.getStripeConfig());
    const publishableKey = this.stripeConfigKeyFrom(config);

    if (!publishableKey) {
      this.paymentError = 'Stripe publishable key missing.';
      this.purchasingPlanId = null;
      return;
    }

    const res = await firstValueFrom(this.api.buyCoins({
      plan_id: plan.id,
      amount: Number(plan.price),
      coins: Number(plan.coins)
    }));

    if (!res?.success || !res.clientSecret) {
      this.paymentError = res?.message || 'Client secret not received.';
      this.purchasingPlanId = null;
      return;
    }

    this.clientSecret = res.clientSecret;
    this.selectedPlan = plan;
    this.checkoutOpen = true;

    this.stripe = await loadStripe(publishableKey);

    this.elements = this.stripe.elements({
      clientSecret: this.clientSecret,
      appearance: {
        theme: 'stripe',
        variables: {
          colorPrimary: '#f4b400',
          colorBackground: '#ffffff',
          colorText: '#102235',
          colorDanger: '#d72638',
          fontFamily: 'Inter, system-ui, sans-serif',
          borderRadius: '10px',
          spacingUnit: '4px'
        }
      }
    });

    setTimeout(() => {
      this.paymentElement = this.elements.create('payment');
      this.paymentElement.mount('#payment-element');
    });

  } catch (err: any) {
    this.paymentError =
      err?.error?.message ||
      err?.error?.error ||
      'Unable to start payment.';
  }

  this.purchasingPlanId = null;
}

async confirmPayment(): Promise<void> {
  if (!this.stripe || !this.elements) return;

  this.paymentProcessing = true;
  this.paymentError = '';

  const submitResult = await this.elements.submit();

  if (submitResult.error) {
    this.paymentError = submitResult.error.message;
    this.paymentProcessing = false;
    return;
  }

  const { error, paymentIntent } = await this.stripe.confirmPayment({
    elements: this.elements,
    redirect: 'if_required'
  });

  if (error) {
    this.paymentError = error.message || 'Payment failed.';
  } else if (paymentIntent?.status === 'succeeded') {
    this.paymentSucceeded = true;
    this.paymentMessage = 'Payment successful. Coins added successfully.';
    this.clientSecret = '';

    if (this.paymentElement) {
      this.paymentElement.unmount();
      this.paymentElement = null;
    }

    this.profileService.loadProfile(true).subscribe();

   setTimeout(() => {
  this.checkoutOpen = false;
  this.selectedPlan = null;
  this.paymentSucceeded = false;

  this.router.navigate(['/user/profile'], {
    queryParams: { refresh: Date.now() }
  });
}, 1800);

  }

  this.paymentProcessing = false;
}

closeCheckout(): void {
  if (this.paymentProcessing) {
    return;
  }

  this.checkoutOpen = false;
  this.clientSecret = '';
  this.selectedPlan = null;
  this.paymentSucceeded = false;

  if (this.paymentElement) {
    this.paymentElement.unmount();
    this.paymentElement = null;
  }
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
    return ['pk-green', 'pk-blue', 'pk-purple', 'pk-orange'][index] || 'pk-green';
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
    return `~ ${plan.currency_symbol}${Number(plan.price_per_coin || 0).toFixed(2)} per coin${suffix}`;
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

  private handleStripeReturn(): void {
    const params = this.route.snapshot.queryParamMap;
    const payment = params.get('payment');

    if (payment === 'cancelled') {
      this.paymentError = 'Payment cancelled. No coins were added.';
      return;
    }

    if (payment !== 'success') {
      return;
    }

    const planId = Number(params.get('plan_id') || params.get('plan'));
    const amount = Number(params.get('amount'));
    const coins = Number(params.get('coins'));
    const creditRef = params.get('credit_ref') || `${planId}_${amount}_${coins}`;
    const creditKey = `pick2win_coin_credit_${creditRef}`;

    if (!planId || !amount || !coins) {
      this.paymentError = 'Payment succeeded, but coin pack details are missing. Please contact support.';
      return;
    }

    if (sessionStorage.getItem(creditKey)) {
      this.paymentMessage = 'Payment already processed. Coins should be available in your account.';
      return;
    }

    this.creditingCoins = true;
    this.paymentMessage = 'Payment successful. Adding coins to your account...';

    this.api.buyCoins({ plan_id: planId, amount, coins }).subscribe({
      next: (res) => {
        this.creditingCoins = false;

        if (res?.success !== false) {
          sessionStorage.setItem(creditKey, '1');
          this.paymentMessage = res?.message || `${coins} coins added successfully.`;
          this.router.navigate(['/pricing'], { replaceUrl: true });
          return;
        }

        this.paymentError = res?.message || 'Payment succeeded, but coins could not be added. Please contact support.';
        this.paymentMessage = '';
      },
      error: (err) => {
        this.creditingCoins = false;
        this.paymentMessage = '';
        this.paymentError =
          err?.error?.message ||
          err?.error?.error ||
          'Payment succeeded, but coins could not be added. Please contact support.';
      }
    });
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

  private async openStripeCheckout(res: CheckoutSessionResponse): Promise<void> {
    const checkoutUrl = this.checkoutUrlFrom(res);

    if (res?.success !== false && checkoutUrl) {
      window.location.href = checkoutUrl;
      return;
    }

    const sessionId = this.checkoutSessionIdFrom(res);
    const publishableKey = this.stripePublishableKeyFrom(res) || await this.loadStripePublishableKey();

    if (res?.success !== false && sessionId && publishableKey) {
      const stripe = await loadStripe(publishableKey);

      if (!stripe) {
        this.purchasingPlanId = null;
        this.paymentError = 'Stripe could not be loaded. Please try again.';
        return;
      }

      const stripeCheckout = stripe as unknown as {
        redirectToCheckout?: (options: { sessionId: string }) => Promise<{ error?: { message?: string } }>;
      };

      if (!stripeCheckout.redirectToCheckout) {
        this.purchasingPlanId = null;
        this.paymentError = 'Stripe checkout redirect is not available. Backend should return checkout_url for hosted checkout.';
        return;
      }

      const result = await stripeCheckout.redirectToCheckout({ sessionId });

      this.purchasingPlanId = null;
      this.paymentError = result.error?.message || 'Unable to redirect to Stripe checkout. Please try again.';
      return;
    }

    this.purchasingPlanId = null;
    this.paymentError = res?.message || 'Stripe checkout session was not returned by backend. Please try again.';
  }

  private checkoutUrlFrom(res: CheckoutSessionResponse): string {
    return (
      res?.url ||
      res?.checkout_url ||
      res?.session_url ||
      res?.payment_url ||
      res?.redirect_url ||
      res?.data?.url ||
      res?.data?.checkout_url ||
      res?.data?.session_url ||
      res?.data?.payment_url ||
      res?.data?.redirect_url ||
      ''
    );
  }

  private checkoutSessionIdFrom(res: CheckoutSessionResponse): string {
    return (
      res?.session_id ||
      res?.sessionId ||
      res?.id ||
      res?.data?.session_id ||
      res?.data?.sessionId ||
      res?.data?.id ||
      ''
    );
  }

  private stripePublishableKeyFrom(res: CheckoutSessionResponse): string {
    return (
      res?.publishableKey ||
      res?.publishable_key ||
      res?.public_key ||
      res?.stripe_publishable_key ||
      res?.data?.publishableKey ||
      res?.data?.publishable_key ||
      res?.data?.public_key ||
      res?.data?.stripe_publishable_key ||
      ''
    );
  }

  private async loadStripePublishableKey(): Promise<string> {
    if (this.stripePublishableKey) {
      return this.stripePublishableKey;
    }

    try {
      const res = await firstValueFrom(this.api.getStripeConfig());
      this.stripePublishableKey = this.stripeConfigKeyFrom(res);
      return this.stripePublishableKey;
    } catch {
      return '';
    }
  }

  private stripeConfigKeyFrom(res: StripeConfigResponse): string {
    return (
      res?.publishableKey ||
      res?.publishable_key ||
      res?.public_key ||
      res?.stripe_publishable_key ||
      res?.data?.publishableKey ||
      res?.data?.publishable_key ||
      res?.data?.public_key ||
      res?.data?.stripe_publishable_key ||
      ''
    );
  }
}
