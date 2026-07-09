import { Component } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService } from 'src/app/core/services/api.service';
import { AuthModalService } from 'src/app/core/services/auth-modal.service';
import { AuthService } from 'src/app/core/services/auth.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {

  loginForm = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required]
  });

  forgotForm = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    otp: ['', [Validators.required, Validators.minLength(4), Validators.maxLength(6)]],
    password: ['', [Validators.required, Validators.minLength(6)]],
    confirmPassword: ['', [Validators.required, Validators.minLength(6)]]
  });

  loading = false;
  forgotLoading = false;
  resetLoading = false;

  showPassword = false;
  showResetPassword = false;
  showConfirmResetPassword = false;

  forgotModal = false;
  otpSent = false;
  forgotStep: 'email' | 'otp' | 'password' | 'success' = 'email';

  toast: { type: 'success' | 'error'; message: string } | null = null;
  private toastTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private fb: FormBuilder,
    private api: ApiService,
    private authModal: AuthModalService,
    private authService: AuthService,
    private router: Router
  ) {}

  openSignup() {
    this.authModal.open('signup');
  }

  openForgotPassword(event?: Event) {
  event?.preventDefault();
  this.hideToast();
  this.sanitizeLoginEmail();

  const emailCtrl = this.loginForm.get('email');
  emailCtrl?.markAsTouched();

  if (!emailCtrl?.value || emailCtrl.invalid) {
    this.showToast(
      'error',
      'Enter your email above first, then tap "Forgot password?"'
    );
    return;
  }

  const email = this.withoutSpaces(emailCtrl.value || '');

  this.forgotForm.reset({
    email,
    otp: '',
    password: '',
    confirmPassword: ''
  });

  this.otpSent = false;
  this.forgotStep = 'email';
  this.forgotModal = true;
  this.showResetPassword = false;
  this.showConfirmResetPassword = false;
}

  closeForgotPassword() {
    this.forgotModal = false;
    this.otpSent = false;
    this.forgotStep = 'email';
    this.forgotForm.reset();
  }

  sendForgotOtp(isResend = false) {
    this.sanitizeForgotEmail();
    const emailCtrl = this.forgotForm.get('email');
    emailCtrl?.markAsTouched();

    if (emailCtrl?.invalid) {
      this.showToast('error', 'Please enter valid email.');
      return;
    }

    this.forgotLoading = true;

    this.api.forgotPassword({ email: this.withoutSpaces(emailCtrl?.value || '') }).subscribe({
      next: (res) => {
        this.forgotLoading = false;
        this.otpSent = true;
        this.forgotForm.patchValue({ otp: '' });
        this.forgotForm.get('otp')?.markAsUntouched();
        this.forgotStep = 'otp';
        this.showToast('success', res?.message || (isResend ? 'OTP resent to your email.' : 'OTP sent to your email.'));
      },
      error: (err) => {
        this.forgotLoading = false;
        this.showToast(
          'error',
          err?.error?.message || err?.error?.error || 'Unable to send OTP.'
        );
      }
    });
  }

  verifyForgotOtp() {
  this.sanitizeForgotEmail();
  const otpCtrl = this.forgotForm.get('otp');
  otpCtrl?.setValue(String(otpCtrl?.value || '').replace(/\D/g, '').slice(0, 6));
  otpCtrl?.markAsTouched();

  if (otpCtrl?.invalid) {
    this.showToast('error', 'Please enter valid OTP.');
    return;
  }

  const email = this.withoutSpaces(this.forgotForm.value.email || '');
  const otp = otpCtrl?.value || '';

  if (!email || !otp) {
    this.showToast('error', 'Please enter valid OTP.');
    return;
  }

  this.forgotStep = 'password';
  this.showToast('success', 'OTP added. Create your new password.');
}

  resetPassword() {
    this.sanitizeForgotEmail();
    this.forgotForm.get('email')?.markAsTouched();
    this.forgotForm.get('otp')?.markAsTouched();
    this.forgotForm.get('password')?.markAsTouched();
    this.forgotForm.get('confirmPassword')?.markAsTouched();

    if (
      this.forgotForm.get('email')?.invalid ||
      this.forgotForm.get('otp')?.invalid ||
      this.forgotForm.get('password')?.invalid ||
      this.forgotForm.get('confirmPassword')?.invalid
    ) {
      this.showToast('error', 'Password must be minimum 6 characters.');
      return;
    }

    if (this.forgotForm.value.password !== this.forgotForm.value.confirmPassword) {
      this.showToast('error', 'Password and confirm password must match.');
      return;
    }

    const email = this.withoutSpaces(this.forgotForm.value.email || '');
    const otp = this.forgotForm.value.otp || '';
    const password = this.forgotForm.value.password || '';

    this.resetLoading = true;

    this.api.resetPassword({ email, otp, password }).subscribe({
      next: (res) => {
        this.resetLoading = false;
        this.showToast('success', res?.message || 'Password reset successful. Please login.');
        this.forgotStep = 'success';
        this.loginForm.patchValue({ email, password: '' });
      },
      error: (err) => {
        this.resetLoading = false;
        this.showToast(
          'error',
          err?.error?.message || err?.error?.error || 'Invalid OTP or reset failed.'
        );
      }
    });
  }

  finishForgotPassword() {
    const email = this.withoutSpaces(this.forgotForm.value.email || '');
    this.closeForgotPassword();
    this.loginForm.patchValue({ email, password: '' });
  }

  sanitizeLoginPassword(): void {
    const passwordCtrl = this.loginForm.get('password');
    const cleanPassword = this.withoutSpaces(passwordCtrl?.value || '');

    if (passwordCtrl?.value !== cleanPassword) {
      passwordCtrl?.setValue(cleanPassword, { emitEvent: false });
    }
  }

  sanitizeLoginEmail(): void {
    const emailCtrl = this.loginForm.get('email');
    const cleanEmail = this.withoutSpaces(emailCtrl?.value || '');

    if (emailCtrl?.value !== cleanEmail) {
      emailCtrl?.setValue(cleanEmail, { emitEvent: false });
    }
  }

  sanitizeForgotEmail(): void {
    const emailCtrl = this.forgotForm.get('email');
    const cleanEmail = this.withoutSpaces(emailCtrl?.value || '');

    if (emailCtrl?.value !== cleanEmail) {
      emailCtrl?.setValue(cleanEmail, { emitEvent: false });
    }
  }

  login() {
    this.sanitizeLoginEmail();
    this.sanitizeLoginPassword();
    this.loginForm.markAllAsTouched();
    this.hideToast();

    if (this.loginForm.invalid) {
      this.showToast('error', 'Please enter valid email and password.');
      return;
    }

    this.loading = true;

    const email = (this.loginForm.value.email || '').trim();
    const password = this.loginForm.value.password || '';

    this.authService.login(email, password).subscribe({
      next: () => {
        this.loading = false;
        this.showToast('success', 'Login successful.');

        setTimeout(() => {
          this.authModal.close();
          this.router.navigate(['/lineouts'], { replaceUrl: true });
        }, 1500);
      },
      error: (err) => {
        this.loading = false;
        this.showToast(
          'error',
          err?.error?.message ||
          err?.error?.error ||
          'Login failed. Please check your email and password.'
        );
      }
    });
  }

  private showToast(type: 'success' | 'error', message: string) {
    this.toast = { type, message };

    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => this.hideToast(), 3500);
  }

  private hideToast() {
    this.toast = null;

    if (this.toastTimer) {
      clearTimeout(this.toastTimer);
      this.toastTimer = null;
    }
  }

  private withoutSpaces(value: string): string {
    return String(value || '').replace(/\s+/g, '');
  }

  get forgotStepNumber(): number {
    const stepMap = {
      email: 1,
      otp: 2,
      password: 3,
      success: 4
    };

    return stepMap[this.forgotStep];
  }

  get forgotTitle(): string {
    const titleMap = {
      email: 'Reset Password',
      otp: 'Verify OTP',
      password: 'Create New Password',
      success: 'Password Updated!'
    };

    return titleMap[this.forgotStep];
  }

  get forgotDescription(): string {
    const email = this.forgotForm.value.email || 'your email';
    const descriptionMap = {
      email: `We will send a verification OTP to ${email}. Please check your inbox or spam folder to continue.`,
      otp: `Enter the OTP sent to ${email}.`,
      password: 'Your new password must be strong and unique.',
      success: 'Your password has been changed successfully.'
    };

    return descriptionMap[this.forgotStep];
  }

  get resetPasswordStrength(): number {
    const value = this.forgotForm.value.password || '';
    let score = 0;

    if (value.length >= 6) score += 25;
    if (value.length >= 10) score += 20;
    if (/[A-Z]/.test(value)) score += 20;
    if (/[0-9]/.test(value)) score += 20;
    if (/[^A-Za-z0-9]/.test(value)) score += 15;

    return Math.min(score, 100);
  }

  get resetPasswordStrengthLabel(): string {
    if (this.resetPasswordStrength >= 80) return 'Strong';
    if (this.resetPasswordStrength >= 50) return 'Good';
    if (this.resetPasswordStrength > 0) return 'Weak';
    return '';
  }

  ngOnDestroy() {
    if (this.toastTimer) clearTimeout(this.toastTimer);
  }
}
