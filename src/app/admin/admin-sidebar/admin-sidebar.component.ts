import { Component, EventEmitter, Output } from '@angular/core';

interface AdminNavItem {
  label: string;
  icon: string;
  route?: string;
  group: string;
  badge?: string;
}

@Component({
  selector: 'app-admin-sidebar',
  templateUrl: './admin-sidebar.component.html',
  styleUrls: ['./admin-sidebar.component.css']
})
export class AdminSidebarComponent {
  @Output() logoutClicked = new EventEmitter<void>();

  navItems: AdminNavItem[] = [
    { label: 'Dashboard', icon: '▦', route: '/admin/dashboard', group: 'Overview' },
    { label: 'User Management', icon: '👤', route: '/admin/users', group: 'Users & Countries' },
    { label: 'Countries', icon: '🌍', route: '/admin/countries', group: 'Users & Countries' },
    { label: 'UCT Activity', icon: '⚡', route: '/admin/uct-activity', group: 'Product', badge: 'live' },
    { label: 'Votes & Feedback', icon: '💬', route: '/admin/votes-feedback', group: 'Product' },
    { label: 'Support Tickets', icon: 'SUP', route: '/admin/support-tickets', group: 'Product' },
    { label: 'Coin Packs', icon: '🪙', route: '/admin/coin-packs', group: 'Monetization' },
    { label: 'Revenue', icon: '💵', route: '/admin/revenue', group: 'Finance' },
    { label: 'Expenses', icon: '📉', route: '/admin/expenses', group: 'Finance' },
    { label: 'Profit', icon: '📈', route: '/admin/profit', group: 'Finance' },
    { label: 'Payments', icon: '💳', route: '/admin/payments', group: 'Finance' },
    { label: 'Leagues / Series', icon: '🏆', route: '/admin/leagues-series', group: 'Catalog' },
    { label: 'Admins & Team', icon: '🔐', route: '/admin/admins-team', group: 'Administration' },
    { label: 'Activity Log', icon: '📝', route: '/admin/activity-logs', group: 'Administration' },
    { label: 'System & Integrations', icon: '🛠️', group: 'System' }
  ];

  visibleGroup(index: number): string | null {
    const item = this.navItems[index];
    const previous = this.navItems[index - 1];
    return !previous || previous.group !== item.group ? item.group : null;
  }

  logout(): void {
    this.logoutClicked.emit();
  }
}
