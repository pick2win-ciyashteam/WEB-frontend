import { Component, OnInit } from '@angular/core';
import {
  AdminDashboardActivity,
  AdminDashboardCountry,
  AdminDashboardLiveReports,
  AdminDashboardTodayMatchItem
} from 'src/app/core/interfaces/admin';
import { AdminService } from 'src/app/core/services/admin.service';

@Component({
  selector: 'app-admin-dashboard',
  templateUrl: './admin-dashboard.component.html',
  styleUrls: ['./admin-dashboard.component.css']
})
export class AdminDashboardComponent implements OnInit {
  loading = false;
  errorMessage = '';
  reports: AdminDashboardLiveReports | null = null;

  constructor(private adminService: AdminService) { }

  ngOnInit(): void {
    this.loadReports();
  }

  loadReports(): void {
    this.loading = true;
    this.errorMessage = '';

    this.adminService.getAdminReportsDashboard().subscribe({
      next: (res) => {
        this.reports = res?.data || res || null;
        this.loading = false;
      },
      error: (err) => {
        console.log('get admin dashboard reports error:', err);
        this.reports = null;
        this.loading = false;
        this.errorMessage = err?.error?.message || err?.error?.error || 'Unable to load dashboard reports.';
      }
    });
  }

  get glance() {
    return this.reports?.users_at_a_glance;
  }

  get lifecycle() {
    return this.reports?.monetization_lifecycle;
  }

  get countries(): AdminDashboardCountry[] {
    return Array.isArray(this.reports?.top_countries_by_users) ? this.reports!.top_countries_by_users : [];
  }

  get recentActivity(): AdminDashboardActivity[] {
    return Array.isArray(this.reports?.recent_activity) ? this.reports!.recent_activity : [];
  }

  get todayMatches(): AdminDashboardTodayMatchItem[] {
    return Array.isArray(this.reports?.today_match?.matches) ? this.reports!.today_match.matches : [];
  }

  formatNumber(value?: number | string | null): string {
    return Number(value || 0).toLocaleString();
  }

  formatPct(value?: number | string | null): string {
    const numeric = Number(value || 0);
    return `${Number.isInteger(numeric) ? numeric : numeric.toFixed(1)}%`;
  }

  deltaClass(value?: string | null): string {
    const numeric = Number(String(value || '').replace('%', ''));
    if (numeric > 0) return 'up';
    if (numeric < 0) return 'down';
    return 'flat';
  }

  activityIcon(type: string): string {
    if (type === 'purchase') return 'payments';
    if (type === 'uct_generated') return 'auto_awesome';
    return 'bolt';
  }

  activityTitle(item: AdminDashboardActivity): string {
    if (item.type === 'purchase') {
      return `${item.fullname || 'User'} purchased ${item.plan_name || 'coin pack'}`;
    }

    return `${item.fullname || 'User'} generated UCT`;
  }

  activityMeta(item: AdminDashboardActivity): string {
    if (item.type === 'purchase') {
      return `${item.country || 'Unknown'}${item.coins ? ` · ${item.coins} coins` : ''}`;
    }

    return `${item.match_label || 'Match'} · ${item.country || 'Unknown'}`;
  }

  timeAgo(seconds?: number | null): string {
    const totalSeconds = Math.max(0, Number(seconds || 0));
    const minutes = Math.floor(totalSeconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'just now';
  }

  formatMatchTime(value: string): string {
    if (!value) {
      return '-';
    }

    return new Intl.DateTimeFormat(undefined, {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(value));
  }

  countryBarWidth(country: AdminDashboardCountry): string {
    return `${Math.min(Math.max(Number(country.pct || 0), 3), 100)}%`;
  }
}
