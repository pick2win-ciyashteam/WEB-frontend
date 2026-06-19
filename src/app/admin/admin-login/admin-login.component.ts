import { Component } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AdminAuthService } from 'src/app/core/services/admin-auth.service';

@Component({
  selector: 'app-admin-login',
  templateUrl: './admin-login.component.html',
  styleUrls: ['./admin-login.component.css']
})
export class AdminLoginComponent {

  loginForm = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
    twoFaCode: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]]
  });

  loading = false;
  showPassword = false;
  message = '';
  errorMessage = '';

  constructor(
    private fb: FormBuilder,
    private adminAuthService: AdminAuthService,
    private router: Router
  ) { }

  normalizeTwoFactor(event: Event): void {
    const input = event.target as HTMLInputElement;
    const value = input.value.replace(/\D/g, '').slice(0, 6);

    if (input.value !== value) {
      input.value = value;
    }

    this.loginForm.get('twoFaCode')?.setValue(value, { emitEvent: false });
  }

  login(): void {
    this.loginForm.markAllAsTouched();
    this.message = '';
    this.errorMessage = '';

    if (this.loginForm.invalid) {
      this.errorMessage = 'Please enter valid admin credentials.';
      return;
    }

    this.loading = true;

    const email = this.loginForm.value.email || '';
    const password = this.loginForm.value.password || '';
    const twoFaCode = this.loginForm.value.twoFaCode || '';

    this.adminAuthService.login(email, password, twoFaCode).subscribe({
      next: (res) => {
        this.loading = false;

        if (res?.success === false) {
          this.errorMessage = res?.message || 'Admin login failed.';
          return;
        }

        if (!this.adminAuthService.isLoggedIn()) {
          this.errorMessage = 'Admin login token missing in response. Check console response once.';
          return;
        }

        this.message = res?.message || 'Admin login successful.';
        setTimeout(() => this.router.navigate(['/admin/dashboard']), 600);
      },
      error: (err) => {
        this.loading = false;
        this.errorMessage = err?.error?.message || err?.error?.error || 'Admin login failed. Please try again.';
      }
    });
  }
}
