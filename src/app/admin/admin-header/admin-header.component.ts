import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { AdminService } from 'src/app/core/services/admin.service';

@Component({
  selector: 'app-admin-header',
  templateUrl: './admin-header.component.html',
  styleUrls: ['./admin-header.component.css']
})
export class AdminHeaderComponent implements OnInit {
  @Input() title = 'Dashboard';
  @Input() crumb = 'Overview';
  @Output() menuClicked = new EventEmitter<void>();
  @Output() logoutClicked = new EventEmitter<void>();
  @Output() userSearch = new EventEmitter<string>();

  profile = { name: '', email: '' };
  currency = 0;
  savingCurrency = false;
  currencyError = '';

  constructor(private adminService: AdminService) { }

  ngOnInit(): void {
    this.adminService.getAdminProfile().subscribe({
      next: res => {
        const profile = res?.data || res || {};
        this.profile = { name: profile.name || '', email: profile.email || '' };
        this.currency = Number(profile.currency ?? 0);
      },
      error: err => console.log('get admin header profile error:', err)
    });
  }

  get initials(): string {
    return this.profile.name.split(/\s+/).filter(Boolean).map(part => part[0]).slice(0, 2).join('').toUpperCase() || 'AD';
  }

  saveCurrency(): void {
    const currency = Number(this.currency);
    this.currencyError = '';

    if (!Number.isFinite(currency) || currency < 0) {
      this.currency = 0;
      this.currencyError = 'Enter a valid currency value.';
      return;
    }

    this.currency = currency;
    this.savingCurrency = true;
    this.adminService.updateAdminProfile({ currency }).subscribe({
      next: () => { this.savingCurrency = false; },
      error: err => {
        this.savingCurrency = false;
        this.currencyError = err?.error?.message || err?.error?.error || 'Unable to update currency.';
      }
    });
  }

  searchUsers(event: Event): void {
    this.userSearch.emit((event.target as HTMLInputElement).value.trim());
  }
}
