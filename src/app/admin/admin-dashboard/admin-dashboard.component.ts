import { Component, OnInit } from '@angular/core';
import { forkJoin } from 'rxjs';
import { AdminDashboardReports, AdminGeographyReports } from 'src/app/core/interfaces/admin';
import { AdminService } from 'src/app/core/services/admin.service';

@Component({
  selector: 'app-admin-dashboard',
  templateUrl: './admin-dashboard.component.html',
  styleUrls: ['./admin-dashboard.component.css']
})
export class AdminDashboardComponent implements OnInit {
  loading = false;
  errorMessage = '';
  reports: AdminDashboardReports | null = null;
  geographyReports: AdminGeographyReports | null = null;

  constructor(private adminService: AdminService) { }

  ngOnInit(): void {
    this.loadReports();
  }

  loadReports(): void {
    this.loading = true;
    this.errorMessage = '';

    forkJoin({
      overview: this.adminService.getAdminReportsOverview(),
      geography: this.adminService.getAdminReportsGeography()
    }).subscribe({
      next: ({ overview, geography }) => {
        this.reports = overview?.data || null;
        this.geographyReports = {
          total_markets: geography?.total_markets || 0,
          totals: geography?.totals || {
            total_users: 0,
            verified: 0,
            coin_buyers: 0,
            active_30d: 0,
            dormant_30d: 0,
            lifetime_revenue: '0.00'
          },
          data: Array.isArray(geography?.data) ? geography.data : []
        };
        this.loading = false;
      },
      error: (err) => {
        console.log('get admin reports error:', err);
        this.reports = null;
        this.geographyReports = null;
        this.loading = false;
        this.errorMessage = err?.error?.message || err?.error?.error || 'Unable to load dashboard reports.';
      }
    });
  }

  formatPercentage(value?: string): string {
    return value ? `${value}%` : '0%';
  }

  formatMoney(value?: string): string {
    return value ? Number(value).toFixed(2) : '0.00';
  }
}
