import { Component } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';
import { AdminAuthService } from 'src/app/core/services/admin-auth.service';

interface AdminNavItem {
  label: string;
  route: string;
  crumb: string;
}

@Component({
  selector: 'app-admin-shell',
  templateUrl: './admin-shell.component.html',
  styleUrls: ['./admin-shell.component.css']
})
export class AdminShellComponent {
  sidebarOpen = false;

  navItems: AdminNavItem[] = [
    { label: 'Dashboard', route: '/admin/dashboard', crumb: 'Overview' },
    { label: 'User Management', route: '/admin/users', crumb: 'Users & Countries' },
    { label: 'Countries', route: '/admin/countries', crumb: 'Users & Countries' },
    { label: 'UCT Activity', route: '/admin/uct-activity', crumb: 'Product' },
    { label: 'Votes & Feedback', route: '/admin/votes-feedback', crumb: 'Product' },
    { label: 'Series Manager', route: '/admin/series-manager', crumb: 'Catalog' },
    { label: 'Leagues / Series', route: '/admin/leagues-series', crumb: 'Catalog' },
    { label: 'Coin Packs', route: '/admin/coin-packs', crumb: 'Monetization' },
    { label: 'Revenue', route: '/admin/revenue', crumb: 'Finance' },
    { label: 'Expenses', route: '/admin/expenses', crumb: 'Finance' },
    { label: 'Profit', route: '/admin/profit', crumb: 'Finance' },
    { label: 'Payments', route: '/admin/payments', crumb: 'Finance' },
    { label: 'Admins & Team', route: '/admin/admins-team', crumb: 'Administration' },
    { label: 'Activity Log', route: '/admin/activity-logs', crumb: 'Administration' },
    { label: 'Add Subscription', route: '/admin/add-subscription', crumb: 'Monetization' },
    { label: 'Pack Buyers', route: '/admin/pack-buyers', crumb: 'Monetization' },
    { label: 'Create Banner', route: '/admin/create-banner', crumb: 'Website' },
    { label: 'Add Country', route: '/admin/add-country', crumb: 'Markets' },
    { label: 'Activity Dormancy', route: '/admin/activity-dormancy', crumb: 'Reports' },
  ];

  constructor(
    private adminAuthService: AdminAuthService,
    private router: Router
  ) {
    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe(() => this.sidebarOpen = false);
  }

  get currentTitle(): string {
    return this.navItems.find(item => this.router.url.startsWith(item.route))?.label || 'Admin Panel';
  }

  get currentCrumb(): string {
    return this.navItems.find(item => this.router.url.startsWith(item.route))?.crumb || 'Admin';
  }

  toggleSidebar(): void {
    this.sidebarOpen = !this.sidebarOpen;
  }

  closeSidebar(): void {
    this.sidebarOpen = false;
  }

  searchUsers(search: string): void {
    this.router.navigate(['/admin/users'], { queryParams: { search: search || null } });
  }

  logout(): void {
    this.adminAuthService.logout();
  }
}
