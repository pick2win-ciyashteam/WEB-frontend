import { Component, OnInit } from '@angular/core';
import { UserProfile } from 'src/app/core/interfaces/content';
import { ApiService } from 'src/app/core/services/api.service';
import { AuthService } from 'src/app/core/services/auth.service';
import { ProfileService } from 'src/app/core/services/profile.service';

@Component({
  selector: 'app-my-profile',
  templateUrl: './my-profile.component.html',
  styleUrls: ['./my-profile.component.css']
})
export class MyProfileComponent implements OnInit {
  activeTab: 'profile' | 'teams' | 'feedback' = 'profile';
  profile$ = this.profileService.profile$;
  loading$ = this.profileService.loading$;
  error$ = this.profileService.error$;
  deleteModalOpen = false;
  deleteConsent = false;
  accountDeleted = false;
  deletingAccount = false;
  deleteError = '';
  deletionTimestamp = '';
  showTodayLineupsCta = false;

  constructor(
    private api: ApiService,
    private authService: AuthService,
    private profileService: ProfileService
  ) {}

  ngOnInit(): void {
    this.profileService.loadProfile().subscribe();
    this.loadTodayLineupsCta();
  }

  setTab(tab: 'profile' | 'teams' | 'feedback') {
    this.activeTab = tab;
  }

  openDeleteModal(): void {
    this.deleteModalOpen = true;
    this.deleteConsent = false;
    this.accountDeleted = false;
    this.deletingAccount = false;
    this.deleteError = '';
    this.deletionTimestamp = '';
  }

  closeDeleteModal(): void {
    if (this.deletingAccount) {
      return;
    }

    this.deleteModalOpen = false;
  }

  executeDeleteAccount(): void {
    if (!this.deleteConsent || this.deletingAccount) {
      return;
    }

    this.deletingAccount = true;
    this.deleteError = '';

    this.api.deleteAccount().subscribe({
      next: (res) => {
        this.deletingAccount = false;

        if (res?.success === false) {
          this.deleteError = res?.message || 'Unable to delete account. Please try again.';
          return;
        }

        this.accountDeleted = true;
        this.deletionTimestamp = new Date().toISOString().replace('T', ' ').slice(0, 19) + ' UTC';
        setTimeout(() => this.authService.logout(), 1400);
      },
      error: (err) => {
        this.deletingAccount = false;
        this.deleteError = err?.error?.message || err?.error?.error || 'Unable to delete account. Please try again.';
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

  get forfeitedCoins(): number {
    return this.availableCoins(this.profileService.profile);
  }

  totalCoins(profile: UserProfile | null): number {
    return Number(profile?.coins?.total_coins ?? 0);
  }

  usedCoins(profile: UserProfile | null): number {
    return Number(profile?.coins?.used_coins ?? 0);
  }

  availableCoins(profile: UserProfile | null): number {
    return Number(profile?.coins?.coins ?? 0);
  }

  subscriptionPurchased(profile: UserProfile | null): string {
    return this.formatDate(profile?.subscription?.start_date);
  }

  subscriptionExpires(profile: UserProfile | null): string {
    return this.formatDate(profile?.subscription?.expiry_date);
  }

  subscriptionStatus(profile: UserProfile | null): string {
    return profile?.subscription?.status || 'inactive';
  }

  subscriptionStatusClass(profile: UserProfile | null): string {
    return this.subscriptionStatus(profile).toLowerCase() === 'active' ? 'active' : 'used';
  }

  initials(profile: UserProfile | null): string {
    if (!profile?.fullname) {
      return 'U';
    }

    return profile.fullname
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map(part => part[0])
      .join('')
      .toUpperCase();
  }

  maskedMobile(profile: UserProfile | null): string {
    if (!profile?.mobile) {
      return '-';
    }

    const mobile = profile.mobile;
    return mobile.length > 4 ? `*** *** ${mobile.slice(-4)}` : mobile;
  }

  memberSince(profile: UserProfile | null): string {
    if (!profile?.created_at) {
      return '-';
    }

    return new Intl.DateTimeFormat('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    }).format(new Date(profile.created_at));
  }

  verifyLabel(profile: UserProfile | null): string {
    return profile?.email_verify && profile?.mobile_verify ? 'Dual Verified' : 'Verification Pending';
  }

  private formatDate(value?: string | null): string {
    if (!value) {
      return '-';
    }

    return new Intl.DateTimeFormat('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    }).format(new Date(value));
  }
}
