import { Component } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';
import { AdminAuthService } from 'src/app/core/services/admin-auth.service';

interface AdminNavItem {
  label: string;
  icon: string;
  route: string;
}

@Component({
  selector: 'app-admin-shell',
  templateUrl: './admin-shell.component.html',
  styleUrls: ['./admin-shell.component.css']
})
export class AdminShellComponent {
  sidebarOpen = false;

  navItems: AdminNavItem[] = [
    { label: 'Dashboard', icon: 'dashboard', route: '/admin/dashboard' },
    { label: 'Series Manager', icon: 'sports_soccer', route: '/admin/series-manager' },
    { label: 'Add Subscription', icon: 'workspace_premium', route: '/admin/add-subscription' },
    { label: 'Pack Buyers', icon: 'payments', route: '/admin/pack-buyers' },
    { label: 'Create Banner', icon: 'image', route: '/admin/create-banner' },
    { label: 'Add Country', icon: 'public', route: '/admin/add-country' },
    { label: 'Activity Dormancy', icon: 'monitoring', route: '/admin/activity-dormancy' },
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

  toggleSidebar(): void {
    this.sidebarOpen = !this.sidebarOpen;
  }

  closeSidebar(): void {
    this.sidebarOpen = false;
  }

  logout(): void {
    this.adminAuthService.logout();
  }
}
