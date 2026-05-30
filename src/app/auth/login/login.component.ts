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
    otp: ['', [Validators.required, Validators.minLength(4)]],
    password: ['', [Validators.required, Validators.minLength(6)]]
  });

  loading = false;
  forgotLoading = false;
  resetLoading = false;

  showPassword = false;
  showResetPassword = false;

  forgotModal = false;
  otpSent = false;

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

  openForgotPassword() {
    const email = this.loginForm.value.email || '';

    this.forgotForm.reset({
      email,
      otp: '',
      password: ''
    });

    this.otpSent = false;
    this.forgotModal = true;
    this.hideToast();
  }

  closeForgotPassword() {
    this.forgotModal = false;
    this.otpSent = false;
    this.forgotForm.reset();
  }

  sendForgotOtp() {
    const emailCtrl = this.forgotForm.get('email');
    emailCtrl?.markAsTouched();

    if (emailCtrl?.invalid) {
      this.showToast('error', 'Please enter valid email.');
      return;
    }

    this.forgotLoading = true;

    this.api.forgotPassword({ email: emailCtrl?.value || '' }).subscribe({
      next: (res) => {
        this.forgotLoading = false;
        this.otpSent = true;
        this.showToast('success', res?.message || 'OTP sent to your email.');
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

  resetPassword() {
    this.forgotForm.markAllAsTouched();

    if (this.forgotForm.invalid) {
      this.showToast('error', 'Please enter valid OTP ..');
      return;
    }

    const email = this.forgotForm.value.email || '';
    const otp = this.forgotForm.value.otp || '';
    const password = this.forgotForm.value.password || '';

    this.resetLoading = true;

    this.api.resetPassword({ email, otp, password }).subscribe({
      next: (res) => {
        this.resetLoading = false;
        this.showToast('success', res?.message || 'Password reset successful. Please login.');

        setTimeout(() => {
          this.closeForgotPassword();
          this.loginForm.patchValue({ email, password: '' });
        }, 1200);
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

  login() {
    this.loginForm.markAllAsTouched();
    this.hideToast();

    if (this.loginForm.invalid) {
      this.showToast('error', 'Please enter valid email and password.');
      return;
    }

    this.loading = true;

    const email = this.loginForm.value.email || '';
    const password = this.loginForm.value.password || '';

    this.authService.login(email, password).subscribe({
      next: () => {
        this.loading = false;
        this.showToast('success', 'Login successful.');

        setTimeout(() => {
          this.authModal.close();
          this.router.navigate(['/user/profile']);
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

  ngOnDestroy() {
    if (this.toastTimer) clearTimeout(this.toastTimer);
  }
}