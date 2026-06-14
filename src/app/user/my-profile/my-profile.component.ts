import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { UserProfile } from 'src/app/core/interfaces/content';
import { ApiService } from 'src/app/core/services/api.service';
import { AuthService } from 'src/app/core/services/auth.service';
import { ProfileService } from 'src/app/core/services/profile.service';

@Component({
  selector: 'app-my-profile',
  templateUrl: './my-profile.component.html',
  styleUrls: ['./my-profile.component.css']
})
export class MyProfileComponent implements OnInit, OnDestroy {
  activeTab: 'profile' | 'teams' | 'feedback' = 'profile';
  profile$ = this.profileService.profile$;
  loading$ = this.profileService.loading$;
  error$ = this.profileService.error$;
  editModalOpen = false;
  editMobile = '';
  editEmail = '';
  mobileOtp = '';
  emailOtp = '';
  mobileOtpSent = false;
  emailOtpSent = false;
  mobileChanging = false;
  emailChanging = false;
  mobileMessage = '';
  emailMessage = '';
  mobileError = '';
  emailError = '';
  deleteModalOpen = false;
  deleteConsent = false;
  deleteOtp = '';
  deleteOtpSent = false;
  accountDeleted = false;
  deletingAccount = false;
  deleteMessage = '';
  deleteError = '';
  deletionTimestamp = '';
  showTodayLineupsCta = false;
  private todayLineupsTimer: any;
  private profileRefreshTimer: any;

  constructor(
    private api: ApiService,
    private authService: AuthService,
    private route: ActivatedRoute,
    private profileService: ProfileService
  ) {}

  ngOnInit(): void {
  this.applyTabFromRoute();
  this.refreshProfileFromRoute();
  this.loadTodayLineupsCta();
  this.startTodayLineupsRefresh();
}

  ngOnDestroy(): void {
    clearInterval(this.todayLineupsTimer);
    clearTimeout(this.profileRefreshTimer);
  }

  setTab(tab: 'profile' | 'teams' | 'feedback') {
    this.activeTab = tab;
  }

  openEditModal(profile: UserProfile): void {
    this.editModalOpen = true;
    this.editMobile = profile.mobile || '';
    this.editEmail = profile.email || '';
    this.mobileOtp = '';
    this.emailOtp = '';
    this.mobileOtpSent = false;
    this.emailOtpSent = false;
    this.mobileMessage = '';
    this.emailMessage = '';
    this.mobileError = '';
    this.emailError = '';
  }

  closeEditModal(): void {
    if (this.mobileChanging || this.emailChanging) {
      return;
    }

    this.editModalOpen = false;
  }

  requestMobileChange(): void {
    const newMobile = this.editMobile.trim();
    this.mobileMessage = '';
    this.mobileError = '';

    if (!/^[0-9]{7,15}$/.test(newMobile)) {
      this.mobileError = 'Enter a valid mobile number.';
      return;
    }

    this.mobileChanging = true;
    this.api.changeMobile({ new_mobile: newMobile }).subscribe({
      next: (res) => {
        console.log('change mobile response / OTP test:', res);
        this.mobileChanging = false;

        if (res?.success === false) {
          this.mobileError = res?.message || 'Unable to send mobile OTP.';
          return;
        }

        this.mobileOtpSent = true;
        this.mobileMessage = res?.message || 'OTP sent to the new mobile number.';
      },
      error: (err) => {
        console.error('change mobile error:', err);
        this.mobileChanging = false;
        this.mobileError = err?.error?.message || err?.error?.error || 'Unable to send mobile OTP.';
      }
    });
  }

  verifyMobileOtp(): void {
    const otp = this.mobileOtp.trim();
    this.mobileMessage = '';
    this.mobileError = '';

    if (!/^[0-9]{4,8}$/.test(otp)) {
      this.mobileError = 'Enter the OTP sent to your mobile.';
      return;
    }

    this.mobileChanging = true;
    this.api.verifyMobileChange({ type: 'mobile', otp }).subscribe({
      next: (res) => {
        console.log('verify mobile change response:', res);
        this.mobileChanging = false;

        if (res?.success === false) {
          this.mobileError = res?.message || 'Mobile OTP verification failed.';
          return;
        }

        this.mobileMessage = res?.message || 'Mobile number updated successfully.';
        this.mobileOtpSent = false;
        this.mobileOtp = '';
        this.profileService.loadProfile(true).subscribe();
      },
      error: (err) => {
        console.error('verify mobile change error:', err);
        this.mobileChanging = false;
        this.mobileError = err?.error?.message || err?.error?.error || 'Mobile OTP verification failed.';
      }
    });
  }

  requestEmailChange(): void {
    const newEmail = this.editEmail.trim();
    this.emailMessage = '';
    this.emailError = '';

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
      this.emailError = 'Enter a valid email address.';
      return;
    }

    this.emailChanging = true;
    this.api.changeEmail({ new_email: newEmail }).subscribe({
      next: (res) => {
        console.log('change email response / OTP test:', res);
        this.emailChanging = false;

        if (res?.success === false) {
          this.emailError = res?.message || 'Unable to send email OTP.';
          return;
        }

        this.emailOtpSent = true;
        this.emailMessage = res?.message || 'OTP sent to the new email address.';
      },
      error: (err) => {
        console.error('change email error:', err);
        this.emailChanging = false;
        this.emailError = err?.error?.message || err?.error?.error || 'Unable to send email OTP.';
      }
    });
  }

  verifyEmailOtp(): void {
    const otp = this.emailOtp.trim();
    this.emailMessage = '';
    this.emailError = '';

    if (!/^[0-9]{4,8}$/.test(otp)) {
      this.emailError = 'Enter the OTP sent to your email.';
      return;
    }

    this.emailChanging = true;
    this.api.verifyEmailChange({ type: 'email', otp }).subscribe({
      next: (res) => {
        console.log('verify email change response:', res);
        this.emailChanging = false;

        if (res?.success === false) {
          this.emailError = res?.message || 'Email OTP verification failed.';
          return;
        }

        this.emailMessage = res?.message || 'Email address updated successfully.';
        this.emailOtpSent = false;
        this.emailOtp = '';
        this.profileService.loadProfile(true).subscribe();
      },
      error: (err) => {
        console.error('verify email change error:', err);
        this.emailChanging = false;
        this.emailError = err?.error?.message || err?.error?.error || 'Email OTP verification failed.';
      }
    });
  }

  private applyTabFromRoute(): void {
    const tab = this.route.snapshot.queryParamMap.get('tab');

    if (tab === 'teams' || tab === 'feedback' || tab === 'profile') {
      this.activeTab = tab;
    }
  }

  private refreshProfileFromRoute(): void {
    const shouldRefreshAfterPayment = this.route.snapshot.queryParamMap.has('refresh');

    this.profileService.loadProfile(true).subscribe(profile => {
      // console.log('Profile component data:', profile);
    });

    if (shouldRefreshAfterPayment) {
      clearTimeout(this.profileRefreshTimer);
      this.profileRefreshTimer = setTimeout(() => {
        this.profileService.loadProfile(true).subscribe(profile => {
          // console.log('Profile component refreshed data:', profile);
        });
      }, 1200);
    }
  }

  openDeleteModal(): void {
    this.deleteModalOpen = true;
    this.deleteConsent = false;
    this.deleteOtp = '';
    this.deleteOtpSent = false;
    this.accountDeleted = false;
    this.deletingAccount = false;
    this.deleteMessage = '';
    this.deleteError = '';
    this.deletionTimestamp = '';
  }

  closeDeleteModal(): void {
    if (this.deletingAccount) {
      return;
    }

    this.deleteModalOpen = false;
  }

  requestDeleteAccountOtp(): void {
    if (!this.deleteConsent || this.deletingAccount) {
      return;
    }

    this.deletingAccount = true;
    this.deleteMessage = '';
    this.deleteError = '';

    this.api.deleteAccount().subscribe({
      next: (res) => {
        this.deletingAccount = false;

        if (res?.success === false) {
          this.deleteError = res?.message || 'Unable to delete account. Please try again.';
          return;
        }

        this.deleteOtpSent = true;
        this.deleteMessage = res?.message || 'Delete account OTP sent. Please enter OTP to confirm.';
      },
      error: (err) => {
        this.deletingAccount = false;
        this.deleteError = err?.error?.message || err?.error?.error || 'Unable to send delete OTP. Please try again.';
      }
    });
  }

  confirmDeleteAccount(): void {
    if (!this.deleteConsent || this.deletingAccount) {
      return;
    }

    const otp = this.deleteOtp.trim().slice(0, 6);
    this.deleteMessage = '';
    this.deleteError = '';

    if (!/^[0-9]{6}$/.test(otp)) {
      this.deleteError = 'Enter the 6-digit OTP sent for account deletion.';
      return;
    }

    this.deletingAccount = true;

    this.api.confirmDeleteAccount({ otp }).subscribe({
      next: (res) => {
        this.deletingAccount = false;

        if (res?.success === false) {
          this.deleteError = res?.message || 'Delete OTP verification failed.';
          return;
        }

        this.accountDeleted = true;
        this.deletionTimestamp = new Date().toISOString().replace('T', ' ').slice(0, 19) + ' UTC';
        setTimeout(() => this.authService.logout(), 1400);
      },
      error: (err) => {
        this.deletingAccount = false;
        this.deleteError = err?.error?.message || err?.error?.error || 'Delete OTP verification failed.';
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

  private startTodayLineupsRefresh(): void {
    clearInterval(this.todayLineupsTimer);
    this.todayLineupsTimer = setInterval(() => this.loadTodayLineupsCta(), 60000);
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

  purchasedCoins(profile: UserProfile | null): number {
    return Math.max(0, this.totalCoins(profile) - 1);
  }

  coinUsagePercent(profile: UserProfile | null): number {
    const total = this.totalCoins(profile);

    if (!total) {
      return 0;
    }

    return Math.min(100, Math.max(0, (this.usedCoins(profile) / total) * 100));
  }

  subscriptionPurchased(profile: UserProfile | null): string {
    return this.formatDate(profile?.subscription?.start_date);
  }

  subscriptionExpires(profile: UserProfile | null): string {
    return this.formatDate(profile?.subscription?.expiry_date);
  }

  subscriptionDaysLeft(profile: UserProfile | null): string {
    const expiryValue = profile?.subscription?.expiry_date;

    if (!expiryValue) {
      return '-';
    }

    const expiry = new Date(expiryValue);

    if (Number.isNaN(expiry.getTime())) {
      return '-';
    }

    const diffMs = expiry.getTime() - Date.now();

    if (diffMs <= 0) {
      return 'Expired';
    }

    const daysLeft = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    return daysLeft <= 1 ? 'Today' : `${daysLeft} days`;
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
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }).format(new Date(value));
  }
}
