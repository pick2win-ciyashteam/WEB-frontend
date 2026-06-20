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

  constructor(private adminService: AdminService) { }

  ngOnInit(): void {
    this.adminService.getAdminProfile().subscribe({
      next: res => { const profile = res?.data || res || {}; this.profile = { name: profile.name || '', email: profile.email || '' }; },
      error: err => console.log('get admin header profile error:', err)
    });
  }

  get initials(): string {
    return this.profile.name.split(/\s+/).filter(Boolean).map(part => part[0]).slice(0, 2).join('').toUpperCase() || 'AD';
  }

  formatFxInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const value = Number(input.value);

    input.value = Number.isFinite(value) && value >= 0 ? value.toFixed(2) : '0.00';
  }

  searchUsers(event: Event): void {
    this.userSearch.emit((event.target as HTMLInputElement).value.trim());
  }
}
