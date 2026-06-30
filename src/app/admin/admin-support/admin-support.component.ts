import { Component, OnInit } from '@angular/core';
import { AdminSupportKpis, AdminSupportStatus, AdminSupportTicket } from 'src/app/core/interfaces/admin';
import { AdminService } from 'src/app/core/services/admin.service';

interface SupportFilter {
  value: string;
  label: string;
}

@Component({
  selector: 'app-admin-support',
  templateUrl: './admin-support.component.html',
  styleUrls: ['./admin-support.component.css']
})
export class AdminSupportComponent implements OnInit {
  tickets: AdminSupportTicket[] = [];
  selectedTicket: AdminSupportTicket | null = null;
  kpis: AdminSupportKpis = { total: 0, open: 0, in_progress: 0, resolved: 0, closed: 0 };
  pagination = { total: 0, page: 1, limit: 20, total_pages: 1 };
  loading = false;
  loadingDetail = false;
  actionLoading = false;
  errorMessage = '';
  actionMessage = '';
  modalError = '';
  status = 'open';
  search = '';
  page = 1;
  limit = 20;
  replyText = '';
  replyStatus: AdminSupportStatus = 'resolved';

  readonly statuses: SupportFilter[] = [
    { value: '', label: 'All' },
    { value: 'open', label: 'Open' },
    { value: 'in_progress', label: 'In progress' },
    { value: 'resolved', label: 'Resolved' },
    { value: 'closed', label: 'Closed' }
  ];

  readonly replyStatuses: AdminSupportStatus[] = ['open', 'in_progress', 'resolved', 'closed'];

  constructor(private adminService: AdminService) {}

  ngOnInit(): void {
    this.loadTickets();
  }

  loadTickets(page = this.page): void {
    this.loading = true;
    this.errorMessage = '';
    this.page = page;

    this.adminService.getAdminSupportTickets({
      status: this.status,
      search: this.search.trim(),
      page: this.page,
      limit: this.limit
    }).subscribe({
      next: (res) => {
        this.kpis = res?.kpis || this.kpis;
        this.pagination = res?.pagination || this.pagination;
        this.tickets = Array.isArray(res?.tickets) ? res.tickets : [];
        this.page = Number(this.pagination.page || this.page);
        this.loading = false;
      },
      error: (err) => {
        this.tickets = [];
        this.loading = false;
        this.errorMessage = err?.error?.message || err?.error?.error || 'Unable to load support tickets.';
      }
    });
  }

  setStatus(status: string): void {
    this.status = status;
    this.loadTickets(1);
  }

  applySearch(): void {
    this.loadTickets(1);
  }

  resetFilters(): void {
    this.status = 'open';
    this.search = '';
    this.loadTickets(1);
  }

  openTicket(ticket: AdminSupportTicket): void {
    this.loadingDetail = true;
    this.modalError = '';
    this.selectedTicket = null;

    this.adminService.getAdminSupportTicket(ticket.id).subscribe({
      next: (res) => {
        this.selectedTicket = res?.ticket || ticket;
        this.replyText = this.selectedTicket.admin_reply || '';
        this.replyStatus = this.normalizeStatus(this.selectedTicket.status);
        this.loadingDetail = false;
      },
      error: (err) => {
        this.selectedTicket = ticket;
        this.replyText = ticket.admin_reply || '';
        this.replyStatus = this.normalizeStatus(ticket.status);
        this.loadingDetail = false;
        this.modalError = err?.error?.message || 'Unable to load latest ticket details.';
      }
    });
  }

  closeModal(): void {
    if (this.actionLoading) return;
    this.selectedTicket = null;
    this.loadingDetail = false;
    this.modalError = '';
    this.replyText = '';
  }

  saveReply(): void {
    if (!this.selectedTicket || !this.replyText.trim()) {
      this.modalError = 'Please enter an admin reply before saving.';
      return;
    }

    this.actionLoading = true;
    this.modalError = '';

    this.adminService.replyAdminSupportTicket(this.selectedTicket.id, {
      admin_reply: this.replyText.trim(),
      status: this.replyStatus
    }).subscribe({
      next: () => {
        this.actionLoading = false;
        this.actionMessage = 'Support reply saved successfully.';
        this.closeModal();
        this.loadTickets(this.page);
      },
      error: (err) => {
        this.actionLoading = false;
        this.modalError = err?.error?.message || err?.error?.error || 'Unable to save support reply.';
      }
    });
  }

  updateStatus(ticket: AdminSupportTicket, status: AdminSupportStatus): void {
    this.actionLoading = true;
    this.actionMessage = '';
    this.errorMessage = '';

    this.adminService.updateAdminSupportTicketStatus(ticket.id, status).subscribe({
      next: () => {
        ticket.status = status;
        this.actionLoading = false;
        this.actionMessage = 'Ticket status updated.';
        this.loadTickets(this.page);
      },
      error: (err) => {
        this.actionLoading = false;
        this.errorMessage = err?.error?.message || err?.error?.error || 'Unable to update ticket status.';
      }
    });
  }

  previousPage(): void {
    if (this.page > 1) this.loadTickets(this.page - 1);
  }

  nextPage(): void {
    if (this.page < this.pagination.total_pages) this.loadTickets(this.page + 1);
  }

  formatDate(value: string | null): string {
    if (!value) return '-';
    return new Intl.DateTimeFormat('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(value));
  }

  statusLabel(value: string): string {
    return String(value || 'open').replace(/_/g, ' ');
  }

  statusClass(value: string): string {
    return String(value || 'open').toLowerCase().replace(/[^a-z0-9]+/g, '-');
  }

  normalizeStatus(value: string): AdminSupportStatus {
    const normalized = String(value || 'open').toLowerCase();
    return this.replyStatuses.includes(normalized as AdminSupportStatus)
      ? normalized as AdminSupportStatus
      : 'open';
  }

  trackTicket(_: number, ticket: AdminSupportTicket): number {
    return ticket.id;
  }
}
