import { Component, OnInit } from '@angular/core';
import { AdminExpenseCategory, AdminExpenseRole, AdminExpensesFyReport, AdminExpensesMonthReport } from 'src/app/core/interfaces/admin';
import { AdminService } from 'src/app/core/services/admin.service';

type ExpenseTab = 'by_month' | 'fy_report';
@Component({ selector: 'app-expenses', templateUrl: './expenses.component.html', styleUrls: ['./expenses.component.css'] })
export class ExpensesComponent implements OnInit {
  tab: ExpenseTab = 'by_month'; month = new Date().getMonth() + 1; year = new Date().getFullYear(); loading = false; saving = false; errorMessage = ''; successMessage = '';
  monthReport: AdminExpensesMonthReport | null = null; fyReport: AdminExpensesFyReport | null = null;
  showAddCategory = false; showAddRoleFor: number | null = null; deleteTarget: { type: 'category' | 'role'; id: number; name: string } | null = null;
  categoryDraft = { name: '', frequency: 'every_month', has_roles: true }; roleName = ''; entryValues: Record<string, number> = {};
  readonly months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  constructor(private adminService: AdminService) { }
  ngOnInit(): void { this.loadReport(); }
  get categories(): AdminExpenseCategory[] {
    const categories = this.tab === 'by_month' ? this.monthReport?.categories || [] : this.fyReport?.categories || [];
    return [...categories].sort((a, b) => Number(b.has_roles) - Number(a.has_roles));
  }
  get fyLabel(): string { return this.tab === 'by_month' ? this.monthReport?.fy_label || 'Financial year' : this.fyReport?.fy_label || 'Financial year'; }
  get selectedLabel(): string { return this.monthReport?.month_label || `${this.months[this.month - 1]} ${this.year}`; }
  loadReport(): void {
    this.loading = true; this.errorMessage = ''; this.entryValues = {};
    const request = this.tab === 'by_month' ? this.adminService.getAdminExpensesByMonth(this.month, this.year) : this.adminService.getAdminExpensesFyReport(this.year);
    request.subscribe({ next: res => { if (this.tab === 'by_month') this.monthReport = res; else this.fyReport = res; this.loading = false; }, error: err => { this.loading = false; this.errorMessage = err?.error?.message || err?.error?.error || 'Unable to load expenses report.'; } });
  }
  setTab(tab: ExpenseTab): void { if (this.tab !== tab) { this.tab = tab; this.loadReport(); } }
  setMonth(month: number): void { this.month = month; this.loadReport(); }
  isFutureMonth(month: number): boolean {
    const now = new Date();
    return this.year === now.getFullYear() && month > now.getMonth() + 1;
  }
  roleId(role?: AdminExpenseRole): number | undefined { return role?.id ?? role?.role_id; }
  inputKey(categoryId: number, roleId?: number): string { return `${categoryId}-${roleId || 0}`; }
  entryValue(category: AdminExpenseCategory, role?: AdminExpenseRole): number { const key = this.inputKey(category.id, this.roleId(role)); return this.entryValues[key] ?? Number(role?.amount_inr ?? category.amount_inr ?? 0); }
  setEntryValue(category: AdminExpenseCategory, value: string, role?: AdminExpenseRole): void { this.entryValues[this.inputKey(category.id, this.roleId(role))] = Number(value || 0); }
  saveEntry(category: AdminExpenseCategory, role?: AdminExpenseRole): void {
    const roleId = this.roleId(role);
    if (role && !roleId) { this.errorMessage = 'This role is missing its backend role ID. Refresh the report and try again.'; return; }
    this.saving = true; this.clearMessages(); const key = this.inputKey(category.id, roleId);
    this.adminService.saveAdminExpenseEntry({ category_id: category.id, ...(roleId ? { role_id: roleId } : {}), month: this.month, year: this.year, amount_inr: this.entryValues[key] ?? this.entryValue(category, role) }).subscribe({ next: res => { this.saving = false; this.successMessage = res?.message || 'Expense amount saved successfully.'; this.loadReport(); }, error: err => { this.saving = false; this.errorMessage = err?.error?.message || 'Unable to save expense amount.'; } });
  }
  createCategory(): void { if (!this.categoryDraft.name.trim()) { this.errorMessage = 'Expense category name is required.'; return; } this.saving = true; this.clearMessages(); this.adminService.createAdminExpenseCategory({ name: this.categoryDraft.name.trim(), frequency: this.categoryDraft.frequency, has_roles: this.categoryDraft.has_roles ? 1 : 0 }).subscribe({ next: res => { this.saving = false; this.showAddCategory = false; this.categoryDraft = { name: '', frequency: 'every_month', has_roles: true }; this.successMessage = res?.message || 'Expense category added successfully.'; this.loadReport(); }, error: err => { this.saving = false; this.errorMessage = err?.error?.message || 'Unable to add expense category.'; } }); }
  addRole(categoryId: number): void { if (!this.roleName.trim()) { this.errorMessage = 'Role name is required.'; return; } this.saving = true; this.clearMessages(); this.adminService.addAdminExpenseRole(categoryId, this.roleName.trim()).subscribe({ next: res => { this.saving = false; this.showAddRoleFor = null; this.roleName = ''; this.successMessage = res?.message || 'Role added successfully.'; this.loadReport(); }, error: err => { this.saving = false; this.errorMessage = err?.error?.message || 'Unable to add role.'; } }); }
  confirmDelete(): void { const target = this.deleteTarget; if (!target) return; this.saving = true; this.clearMessages(); const req = target.type === 'category' ? this.adminService.deleteAdminExpenseCategory(target.id) : this.adminService.deleteAdminExpenseRole(target.id); req.subscribe({ next: res => { this.saving = false; this.deleteTarget = null; this.successMessage = res?.message || `${target.type === 'role' ? 'Role' : 'Expense category'} deleted successfully.`; this.loadReport(); }, error: err => { this.saving = false; this.errorMessage = err?.error?.message || 'Unable to delete item.'; this.deleteTarget = null; } }); }
  askDelete(type: 'category' | 'role', id: number, name: string): void { this.deleteTarget = { type, id, name }; }
  formatInr(value: number | string | undefined): string { return `₹${Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`; }
  percent(value: number | string | undefined): string { return `${Number(value || 0).toFixed(1)}%`; }
  frequencyText(category: AdminExpenseCategory): string { const map: Record<string, string> = { every_month: 'Every month', bi_monthly: 'Bi-monthly', annual: 'Annual', quarterly: 'Quarterly' }; return map[category.frequency] || category.frequency; }
  exportCsv(): void { const rows = this.categories.map(c => [c.name, this.frequencyText(c), c.amount_inr ?? '', c.fy_total_inr ?? '', c.share_pct ?? '']); const csv = [['Category', 'Frequency', `${this.selectedLabel} (INR)`, `${this.fyLabel} total (INR)`, 'Share'], ...rows].map(row => row.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\r\n'); const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' })); a.download = `pick2win-expenses-${this.tab}-${this.year}.csv`; a.click(); URL.revokeObjectURL(a.href); }
  clearMessages(): void { this.errorMessage = ''; this.successMessage = ''; }
}
