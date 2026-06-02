import { Component, OnInit } from '@angular/core';
import { AdminActivityDormancyReports } from 'src/app/core/interfaces/admin';
import { AdminService } from 'src/app/core/services/admin.service';

@Component({
  selector: 'app-activity-dormancy',
  templateUrl: './activity-dormancy.component.html',
  styleUrls: ['./activity-dormancy.component.css']
})
export class ActivityDormancyComponent implements OnInit {
  loading = false;
  errorMessage = '';
  reports: AdminActivityDormancyReports | null = null;

  constructor(private adminService: AdminService) { }

  ngOnInit(): void {
    this.loadActivityDormancy();
  }

  loadActivityDormancy(): void {
    this.loading = true;
    this.errorMessage = '';

    this.adminService.getAdminReportsActivityDormancy().subscribe({
      next: (res) => {
        this.reports = {
          overview: res?.overview || {
            dau: { count: 0, percentage: '0.0' },
            wau: { count: 0, percentage: '0.0' },
            mau: { count: 0, percentage: '0.0' },
            dormant_30d: { count: 0, percentage: '0.0' }
          },
          dormancy_buckets: res?.dormancy_buckets || {
            total_verified: 0,
            active_30d: { count: 0, percentage: '0.0' },
            dormant_30_60d: { count: 0, percentage: '0.0' },
            dormant_60_90d: { count: 0, percentage: '0.0' },
            dormant_90d_plus: { count: 0, percentage: '0.0' }
          },
          reengagement_segments: Array.isArray(res?.reengagement_segments) ? res.reengagement_segments : [],
          dormant_90d_cohort: {
            total: res?.dormant_90d_cohort?.total || 0,
            preview: Array.isArray(res?.dormant_90d_cohort?.preview) ? res.dormant_90d_cohort.preview : []
          }
        };
        this.loading = false;
      },
      error: (err) => {
        console.log('get activity dormancy report error:', err);
        this.reports = null;
        this.loading = false;
        this.errorMessage = err?.error?.message || err?.error?.error || 'Unable to load activity dormancy report.';
      }
    });
  }

  formatPercentage(value?: string | number): string {
    return `${value || '0'}%`;
  }

  priorityClass(priority?: string): string {
    return (priority || 'LOW').toLowerCase();
  }

  objectKeys(item: Record<string, any>): string[] {
    return Object.keys(item || {});
  }
}
