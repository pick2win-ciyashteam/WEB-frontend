import { Component } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
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

  loading = false;
  showPassword = false;
  toast: { type: 'success' | 'error'; message: string } | null = null;
  private toastTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private fb: FormBuilder,
    private authModal: AuthModalService,
    private authService: AuthService,
    private router: Router
  ) {}

  openSignup() {
    this.authModal.open('signup');
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
        this.showToast('error',
          err?.error?.message ||
          err?.error?.error ||
          'Login failed. Please check your email and password.'
        );
      }
    });
  }

  private showToast(type: 'success' | 'error', message: string) {
    this.toast = { type, message };

    if (this.toastTimer) {
      clearTimeout(this.toastTimer);
    }

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
    if (this.toastTimer) {
      clearTimeout(this.toastTimer);
    }
  }

}
