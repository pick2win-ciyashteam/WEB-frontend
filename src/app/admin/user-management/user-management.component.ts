import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { forkJoin, Observable } from 'rxjs';
import { AdminCoinExpiryReports, AdminCoinExpiryUser, AdminCoinExpiryWindow, AdminCountry, AdminUserReportItem, AdminUsersReports } from 'src/app/core/interfaces/admin';
import { AdminService } from 'src/app/core/services/admin.service';

type UserStatusFilter = '' | 'active' | 'idle' | 'deleted' | 'suspended';

@Component({
  selector: 'app-user-management',
  templateUrl: './user-management.component.html',
  styleUrls: ['./user-management.component.css']
})
export class UserManagementComponent implements OnInit {
  loading = false;
  actionLoading = false;
  errorMessage = '';
  actionMessage = '';
  reports: AdminUsersReports | null = null;
  expiryReports: AdminCoinExpiryReports | null = null;
  countriesList: AdminCountry[] = [];
  selectedUser: AdminUserReportItem | null = null;
  editingUser: AdminUserReportItem | null = null;
  confirmDialog: { title: string; message: string; confirmText: string; danger?: boolean; action: () => void } | null = null;
  expiryLoading = false;
  countriesLoading = false;
  expiryWindow: AdminCoinExpiryWindow = '30d';

  search = '';
  country = '';
  status: UserStatusFilter = '';
  page = 1;
  limit = 10;

  readonly statusFilters: { label: string; value: UserStatusFilter }[] = [
    { label: 'All', value: '' },
    { label: 'Active (purchased)', value: 'active' },
    { label: 'Idle (no pack)', value: 'idle' },
    { label: 'Deleted', value: 'deleted' }
  ];

  readonly expiryWindows: { label: string; value: AdminCoinExpiryWindow }[] = [
    { label: '30 days before', value: '30d' },
    { label: '15 days before', value: '15d' },
    { label: '≤ 7 days (final)', value: '07d' },
    { label: 'Expired', value: 'expired' }
  ];

  constructor(private adminService: AdminService, private route: ActivatedRoute) { }

  ngOnInit(): void {
    this.loadCountries();
    this.loadCoinExpiry();
    this.route.queryParams.subscribe(params => {
      this.search = String(params['search'] || '');
      this.page = 1;
      this.loadUsers();
    });
  }

  get users(): AdminUserReportItem[] {
    return Array.isArray(this.reports?.users) ? this.reports!.users : [];
  }

  get countries(): string[] {
    return this.countriesList
      .filter(country => Number(country.is_active ?? 1) === 1)
      .map(country => country.name)
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b));
  }

  get pagination() {
    return this.reports?.pagination;
  }

  get expiryUsers(): AdminCoinExpiryUser[] {
    return Array.isArray(this.expiryReports?.users) ? this.expiryReports!.users : [];
  }

  loadUsers(): void {
    this.loading = true;
    this.errorMessage = '';

    this.adminService.getAdminReportsUsers({
      page: this.page,
      limit: this.limit,
      search: this.search,
      country: this.country,
      status: this.status
    }).subscribe({
      next: (res) => {
        const reports = res?.data || res || null;
        if (Array.isArray(reports?.users)) {
          reports.users = reports.users.map((user: any) => {
            const rawPack = user.current_pack ?? user.packs_purchased;
            const packs = Array.isArray(rawPack) ? rawPack : (rawPack && rawPack !== 'No pack' ? [rawPack] : []);
            return {
              ...user,
              current_pack: packs,
              packs_purchased: packs,
              status: user.account_status || user.status || 'active',
              pack_status: user.pack_status || (packs.length ? 'active' : 'idle')
            };
          });
        }
        this.reports = reports;
        this.loading = false;
      },
      error: (err) => {
        console.log('get admin users error:', err);
        this.loading = false;
        this.errorMessage = err?.error?.message || err?.error?.error || 'Unable to load users.';
      }
    });
  }

  loadCountries(): void {
    this.countriesLoading = true;

    this.adminService.getCountries().subscribe({
      next: (res) => {
        this.countriesList = Array.isArray(res?.data) ? res.data : [];
        this.countriesLoading = false;
      },
      error: (err) => {
        console.log('get admin countries error:', err);
        this.countriesList = [];
        this.countriesLoading = false;
      }
    });
  }

  loadCoinExpiry(): void {
    this.expiryLoading = true;
    this.adminService.getAdminReportsCoinExpiry(this.expiryWindow).subscribe({
      next: (res) => {
        this.expiryReports = res?.data || res || null;
        this.expiryLoading = false;
      },
      error: (err) => {
        console.log('get coin expiry reports error:', err);
        this.expiryLoading = false;
        this.errorMessage = err?.error?.message || err?.error?.error || 'Unable to load coin expiry reports.';
      }
    });
  }

  setExpiryWindow(window: AdminCoinExpiryWindow): void {
    this.expiryWindow = window;
    this.loadCoinExpiry();
  }

  applyFilters(): void {
    this.page = 1;
    this.loadUsers();
  }

  setStatus(status: UserStatusFilter): void {
    this.status = status;
    this.applyFilters();
  }

  resetFilters(): void {
    this.search = '';
    this.country = '';
    this.status = '';
    this.page = 1;
    this.loadUsers();
  }

  nextPage(): void {
    if (this.pagination && this.page < this.pagination.total_pages) {
      this.page += 1;
      this.loadUsers();
    }
  }

  previousPage(): void {
    if (this.page > 1) {
      this.page -= 1;
      this.loadUsers();
    }
  }

  openUser(user: AdminUserReportItem): void {
    this.selectedUser = user;
    this.editingUser = null;
  }

  closeModal(): void {
    this.selectedUser = null;
    this.editingUser = null;
  }

  startEdit(user: AdminUserReportItem): void {
    this.selectedUser = null;
    this.editingUser = { ...user, packs_purchased: [...(user.packs_purchased || [])] };
  }

  saveEdit(): void {
    if (!this.editingUser) {
      return;
    }

    this.runAction(
      this.adminService.updateAdminUser(this.editingUser.id, {
        fullname: this.editingUser.fullname,
        email: this.editingUser.email,
        country: this.editingUser.country,
        coins: this.editingUser.coins,
        status: this.editingUser.status
      }),
      'User updated successfully.'
    );
  }

  suspendUser(user: AdminUserReportItem): void {
    this.requestConfirm({
      title: 'Suspend user',
      message: `Suspend ${user.fullname}? This will block their account access until restored.`,
      confirmText: 'Suspend',
      danger: true,
      action: () => this.runAction(this.adminService.updateAdminUserAccountStatus(user.id, 'blocked'), 'User account blocked successfully.')
    });
  }

  restoreUser(user: AdminUserReportItem): void {
    this.runAction(this.adminService.updateAdminUserAccountStatus(user.id, 'active'), 'User account activated successfully.');
  }

  deleteUser(user: AdminUserReportItem): void {
    this.requestConfirm({
      title: 'Delete user',
      message: `Delete ${user.fullname}? This action cannot be undone.`,
      confirmText: 'Delete',
      danger: true,
      action: () => this.runAction(this.adminService.deleteAdminUser(user.id), 'User deleted successfully.')
    });
  }

  downloadCsv(): void {
    const totalPages = Math.max(1, this.pagination?.total_pages || 1);
    const requests: Observable<any>[] = [];

    for (let page = 1; page <= totalPages; page += 1) {
      requests.push(this.adminService.getAdminReportsUsers({
        page,
        limit: this.limit,
        search: this.search,
        country: this.country,
        status: this.status
      }));
    }

    forkJoin(requests).subscribe({
      next: (res) => {
        const users = res.flatMap(response => {
          const report: AdminUsersReports | null = response?.data || response || null;
          return Array.isArray(report?.users) ? report!.users : [];
        });
        this.downloadUsersCsv(users);
      },
      error: (err) => {
        console.log('download users csv error:', err);
        this.errorMessage = err?.error?.message || err?.error?.error || 'Unable to download all users.';
      }
    });
  }

  private downloadUsersCsv(users: AdminUserReportItem[]): void {
    const rows = [
      ['ID', 'Name', 'Email', 'Country', 'Status', 'Packs', 'Coins', 'Joined', 'UCTs today'],
      ...users.map(user => [
        user.user_code || `U-${user.id}`,
        user.fullname || '',
        user.status === 'deleted' ? '(removed)' : (user.email || ''),
        user.country || '',
        user.status || '',
        this.packsText(user),
        String(user.coins ?? 0),
        this.dateOnly(user.joined),
        '0'
      ])
    ];

    this.downloadText(this.toCsv(rows), `pick2win-users-${this.todayStamp()}.csv`);
  }

  downloadExpiryCsv(): void {
    const rows = [
      ['ID', 'Name', 'Country', 'Coins left', 'Last purchase', 'Expiry date', 'Days left'],
      ...this.expiryUsers.map(user => [
        user.user_code || `U-${user.id}`,
        user.fullname || '',
        user.country || '',
        String(user.coins_left ?? 0),
        this.dateOnly(user.last_purchase_date),
        this.dateOnly(user.expiry_date),
        String(user.days_left ?? 0)
      ])
    ];

    this.downloadText(this.toCsv(rows), `pick2win-coin-expiry-${this.expiryWindow}-${this.todayStamp()}.csv`);
  }

  notifyExpiryUser(user: AdminCoinExpiryUser): void {
    this.runAction(
      this.adminService.notifyCoinExpiryUser(user.id, this.expiryWindow),
      `Expiry pop-up sent to ${user.fullname}.`
    );
  }

  broadcastExpiry(): void {
    if (!this.expiryUsers.length) {
      this.actionMessage = 'No users in this expiry window.';
      return;
    }

    this.requestConfirm({
      title: 'Broadcast expiry pop-up',
      message: `Broadcast expiry pop-up to ${this.expiryUsers.length} users in this window?`,
      confirmText: 'Broadcast',
      action: () => this.runAction(
        this.adminService.broadcastCoinExpiry(this.expiryWindow),
        `Expiry pop-up broadcast to ${this.expiryUsers.length} users.`
      )
    });
  }

  requestConfirm(dialog: { title: string; message: string; confirmText: string; danger?: boolean; action: () => void }): void {
    this.confirmDialog = dialog;
  }

  cancelConfirm(): void {
    this.confirmDialog = null;
  }

  confirmAction(): void {
    const action = this.confirmDialog?.action;
    this.confirmDialog = null;
    action?.();
  }

  statusClass(status: string): string {
    if (status === 'active') return 'ok';
    if (status === 'idle') return 'warn';
    if (status === 'deleted') return 'bad';
    if (status === 'suspended') return 'bad';
    if (status === 'blocked') return 'bad';
    return 'mut';
  }

  packsText(user: AdminUserReportItem): string {
    return user.packs_purchased?.length ? user.packs_purchased.join('|') : 'none';
  }

  packIcon(pack: string): string {
    const value = String(pack || '').toLowerCase();

    if (value.includes('pro')) return '👑';
    if (value.includes('standard')) return '🚀';
    if (value.includes('basic')) return '⭐';
    if (value.includes('starter')) return '🎯';
    return '•';
  }

  titleCase(value: string): string {
    return String(value || '').charAt(0).toUpperCase() + String(value || '').slice(1);
  }

  formatDate(value: string): string {
    if (!value) return '-';
    return new Intl.DateTimeFormat(undefined, {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    }).format(new Date(value));
  }

  dateOnly(value: string): string {
    if (!value) return '';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : date.toISOString().slice(0, 10);
  }

  expiryDayClass(daysLeft: number): string {
    if (daysLeft < 0) return 'bad';
    if (daysLeft <= 7) return 'bad';
    if (daysLeft <= 15) return 'warn';
    return 'info';
  }

  expiryDayText(daysLeft: number): string {
    if (daysLeft < 0) {
      return `${Math.abs(daysLeft)} days expired`;
    }

    return `${daysLeft} day${daysLeft === 1 ? '' : 's'} left`;
  }

  private runAction(request$: Observable<any>, successMessage: string): void {
    this.actionLoading = true;
    this.actionMessage = '';
    this.errorMessage = '';

    request$.subscribe({
      next: () => {
        this.actionLoading = false;
        this.actionMessage = successMessage;
        this.closeModal();
        this.loadUsers();
        this.loadCoinExpiry();
      },
      error: (err: any) => {
        console.log('admin user action error:', err);
        this.actionLoading = false;
        this.errorMessage = err?.error?.message || err?.error?.error || 'User action failed.';
      }
    });
  }

  private toCsv(rows: string[][]): string {
    return rows
      .map(row => row.map(cell => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','))
      .join('\r\n');
  }

  private downloadText(content: string, fileName: string): void {
    const blob = new Blob([`\uFEFF${content}`], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');

    link.href = URL.createObjectURL(blob);
    link.download = fileName;
    link.click();

    URL.revokeObjectURL(link.href);
  }

  private todayStamp(): string {
    return new Date().toISOString().slice(0, 10);
  }
}
