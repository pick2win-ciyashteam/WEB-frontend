import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { Country } from 'src/app/core/interfaces/content';
import { ApiService } from 'src/app/core/services/api.service';
import { AuthModalService } from 'src/app/core/services/auth-modal.service';
import { AuthService } from 'src/app/core/services/auth.service';

@Component({
  selector: 'app-trust',
  templateUrl: './trust.component.html',
  styleUrls: ['./trust.component.css']
})
export class TrustComponent implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();

  loggedIn$ = this.authService.loggedIn$;
  countries: Country[] = [];
  countriesLoading = true;
  countriesError = '';

  constructor(
    private authModal: AuthModalService,
    private authService: AuthService,
    private api: ApiService
  ) {}

  ngOnInit(): void {
    this.loadCountries();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  openSignup() {
    this.authModal.open('signup');
  }

  openLogin() {
    this.authModal.open('login');
  }

  trackByCountryCode(_: number, country: Country): string {
    return country.code || country.name;
  }

  private loadCountries(): void {
    this.countriesLoading = true;
    this.countriesError = '';

    this.api.getCountries()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.countries = res?.success && Array.isArray(res.data) ? res.data : [];
          this.countriesLoading = false;
        },
        error: () => {
          this.countries = [];
          this.countriesLoading = false;
          this.countriesError = 'Unable to load supported countries right now.';
        }
      });
  }
}
