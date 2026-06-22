import { Component, OnInit } from '@angular/core';
import { AdminActivityLogAction, AdminActivityLogCategory, AdminActivityLogReports } from 'src/app/core/interfaces/admin';
import { AdminService } from 'src/app/core/services/admin.service';

interface ActivityCategory { key: AdminActivityLogCategory; label: string; icon: string; }

@Component({ selector: 'app-activity-logs', templateUrl: './activity-logs.component.html', styleUrls: ['./activity-logs.component.css'] })
export class ActivityLogsComponent implements OnInit {
  loading = false;
  errorMessage = '';
  selectedCategory: AdminActivityLogCategory = 'all';
  reports: AdminActivityLogReports | null = null;
  readonly categories: ActivityCategory[] = [
    { key: 'all', label: 'All', icon: '●' }, { key: 'packs', label: 'Packs', icon: '◉' },
    { key: 'finance', label: 'Finance', icon: '▣' }, { key: 'payments', label: 'Payments', icon: '▰' },
    { key: 'catalog', label: 'Catalog', icon: '♜' }, { key: 'users', label: 'Users', icon: '♟' }, { key: 'admin', label: 'Admin', icon: '▣' }
  ];

  constructor(private adminService: AdminService) { }
  ngOnInit(): void { this.loadActivityLog(); }

  loadActivityLog(page = this.reports?.pagination?.page || 1): void {
    this.loading = true; this.errorMessage = '';
    this.adminService.getAdminReportsActivityLog({ category: this.selectedCategory, page, limit: 20 }).subscribe({
      next: (res) => {
        this.reports = {
          kpis: res?.kpis || { actions_logged: 0, by_super_admin: 0, by_sub_admins: 0 },
          category_counts: res?.category_counts || { all: 0, packs: 0, finance: 0, payments: 0, catalog: 0, users: 0, admin: 0 },
          pagination: res?.pagination || { total: 0, page: 1, limit: 20, total_pages: 1 },
          filters: res?.filters || { category: this.selectedCategory }, actions: Array.isArray(res?.actions) ? res.actions : []
        }; this.loading = false;
      },
      error: (err) => { this.reports = null; this.loading = false; this.errorMessage = err?.error?.message || err?.error?.error || 'Unable to load the activity log.'; }
    });
  }
  selectCategory(category: AdminActivityLogCategory): void { if (this.selectedCategory !== category) { this.selectedCategory = category; this.loadActivityLog(1); } }
  categoryCount(category: AdminActivityLogCategory): number { return this.reports?.category_counts?.[category] || 0; }
  categoryMeta(category: string): ActivityCategory { return this.categories.find(item => item.key === category) || this.categories[0]; }
  formatWhen(value: string): string { const date = new Date(value); return isNaN(date.getTime()) ? value : date.toLocaleString('en-GB', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }); }
  page(direction: number): void { const current = this.reports?.pagination?.page || 1; const total = this.reports?.pagination?.total_pages || 1; const next = current + direction; if (next >= 1 && next <= total) this.loadActivityLog(next); }
  exportCsv(): void {
    const rows = (this.reports?.actions || []).map((item: AdminActivityLogAction) => [item.when, item.admin_name, item.admin_role, item.action, item.category, item.details]);
    const escape = (value: unknown) => `"${String(value ?? '').replace(/"/g, '""')}"`;
    const csv = [['When', 'Admin', 'Role', 'Action', 'Category', 'Details'], ...rows].map(row => row.map(escape).join(',')).join('\r\n');
    const link = document.createElement('a'); link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' })); link.download = `pick2win-activity-log-${new Date().toISOString().slice(0, 10)}.csv`; link.click(); URL.revokeObjectURL(link.href);
  }
}
