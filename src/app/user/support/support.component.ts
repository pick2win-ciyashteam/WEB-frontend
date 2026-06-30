import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { SupportTicket } from 'src/app/core/interfaces/content';
import { ApiService } from 'src/app/core/services/api.service';

@Component({
  selector: 'app-support',
  templateUrl: './support.component.html',
  styleUrls: ['./support.component.css']
})
export class SupportComponent implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();

  tickets: SupportTicket[] = [];
  selectedTicket: SupportTicket | null = null;
  loading = false;
  loadingDetail = false;
  errorMessage = '';
  detailError = '';
  page = 1;
  limit = 20;
  total = 0;
  totalPages = 1;

  constructor(private api: ApiService) {}

  ngOnInit(): void {
    this.loadTickets(1);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadTickets(page = this.page): void {
    this.loading = true;
    this.errorMessage = '';
    this.page = page;

    this.api.getSupportTickets(this.page, this.limit)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.tickets = res?.success && Array.isArray(res.tickets) ? res.tickets : [];
          this.total = Number(res?.pagination?.total ?? this.tickets.length);
          this.page = Number(res?.pagination?.page ?? this.page);
          this.limit = Number(res?.pagination?.limit ?? this.limit);
          this.totalPages = Number(res?.pagination?.total_pages ?? 1);
          this.loading = false;
        },
        error: (err) => {
          this.tickets = [];
          this.total = 0;
          this.totalPages = 1;
          this.loading = false;
          this.errorMessage = err?.error?.message || 'Unable to load support tickets.';
        }
      });
  }

  loadTicket(id: number | string): void {
    this.loadingDetail = true;
    this.detailError = '';
    this.selectedTicket = null;

    this.api.getSupportTicket(id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.selectedTicket = res?.success ? res.ticket : null;
          this.loadingDetail = false;
          this.detailError = this.selectedTicket ? '' : 'Unable to load this support ticket.';
        },
        error: (err) => {
          this.loadingDetail = false;
          this.detailError = err?.error?.message || 'Unable to load this support ticket.';
        }
      });
  }

  openTicket(ticket: SupportTicket): void {
    this.loadTicket(ticket.id);
  }

  closeTicketModal(): void {
    this.selectedTicket = null;
    this.detailError = '';
    this.loadingDetail = false;
  }

  nextPage(): void {
    if (this.page < this.totalPages) {
      this.loadTickets(this.page + 1);
    }
  }

  prevPage(): void {
    if (this.page > 1) {
      this.loadTickets(this.page - 1);
    }
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

  statusLabel(status: string): string {
    return (status || 'open').replace(/_/g, ' ');
  }

  statusClass(status: string): string {
    return String(status || 'open').toLowerCase().replace(/[^a-z0-9]+/g, '-');
  }

  trackTicket(_: number, ticket: SupportTicket): number {
    return ticket.id;
  }
}
