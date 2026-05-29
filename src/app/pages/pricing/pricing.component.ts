import { Component, OnInit } from '@angular/core';
import { SubscriptionPlan } from 'src/app/core/interfaces/content';
import { ApiService } from 'src/app/core/services/api.service';
import { AuthModalService } from 'src/app/core/services/auth-modal.service';
import { AuthService } from 'src/app/core/services/auth.service';

@Component({
  selector: 'app-pricing',
  templateUrl: './pricing.component.html',
  styleUrls: ['./pricing.component.css']
})
export class PricingComponent implements OnInit {
  loggedIn$ = this.authService.loggedIn$;
  loading = true;
  errorMessage = '';
  paymentError = '';
  purchasingPlanId: number | null = null;
  plans: SubscriptionPlan[] = [];

  constructor(
    private api: ApiService,
    private authModal: AuthModalService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.api.getSubscriptionPlans().subscribe({
      next: (res) => {
        console.log('subscription plans:', res);

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

  openSignup(): void {
    this.authModal.open('signup');
  }

  openLogin(): void {
    this.authModal.open('login');
  }

  buyPlan(plan: SubscriptionPlan): void {
    this.paymentError = '';

    if (!this.authService.isLoggedIn()) {
      this.authModal.open('login');
      return;
    }

    this.purchasingPlanId = plan.id;

    this.api.createCheckoutSession({
      plan_id: plan.id,
      success_url: `${window.location.origin}/user/profile?payment=success&plan=${plan.id}`,
      cancel_url: `${window.location.origin}/pricing?payment=cancelled&plan=${plan.id}`
    }).subscribe({
      next: (res) => {
        const checkoutUrl =
          res?.url ||
          res?.checkout_url ||
          res?.session_url ||
          res?.data?.url ||
          res?.data?.checkout_url ||
          res?.data?.session_url;

        if (res?.success !== false && checkoutUrl) {
          window.location.href = checkoutUrl;
          return;
        }

        this.purchasingPlanId = null;
        this.paymentError = res?.message || 'Unable to start Stripe checkout. Please try again.';
      },
      error: (err) => {
        this.purchasingPlanId = null;
        this.paymentError =
          err?.error?.message ||
          err?.error?.error ||
          'Unable to start Stripe checkout. Please try again.';
      }
    });
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

  isPurchasing(plan: SubscriptionPlan): boolean {
    return this.purchasingPlanId === plan.id;
  }
}
