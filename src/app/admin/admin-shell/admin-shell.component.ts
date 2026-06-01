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
    { label: 'Create Banner', icon: 'image', route: '/admin/create-banner' },
    { label: 'Add Country', icon: 'public', route: '/admin/add-country' },
    { label: 'Add Subscription', icon: 'workspace_premium', route: '/admin/add-subscription' }
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
