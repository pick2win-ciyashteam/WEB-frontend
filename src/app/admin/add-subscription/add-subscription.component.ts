import { Component, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { AdminSubscription, AdminSubscriptionCreatePayload } from 'src/app/core/interfaces/admin';
import { AdminService } from 'src/app/core/services/admin.service';

@Component({
  selector: 'app-add-subscription',
  templateUrl: './add-subscription.component.html',
  styleUrls: ['./add-subscription.component.css']
})
export class AddSubscriptionComponent implements OnInit {
  loading = false;
  subscriptionsLoading = false;
  deletingSubscriptionId: number | null = null;
  editingSubscriptionId: number | null = null;
  deleteConfirmSubscription: AdminSubscription | null = null;
  message = '';
  errorMessage = '';
  subscriptions: AdminSubscription[] = [];

  form = this.fb.group({
    name: ['', Validators.required],
    subtitle: ['', Validators.required],
    coins: [100, [Validators.required, Validators.min(1)]],
    matches: [100, [Validators.required, Validators.min(1)]],
    price: [160, [Validators.required, Validators.min(0)]],
    currency: ['GBP', Validators.required],
    currency_symbol: ['£', Validators.required],
    validity_days: [365, [Validators.required, Validators.min(1)]],
    is_popular: [0, Validators.required],
    is_pro: [1, Validators.required],
    sort_order: [4, [Validators.required, Validators.min(0)]]
  });

  constructor(private fb: FormBuilder, private adminService: AdminService) { }

  ngOnInit(): void {
    this.loadSubscriptions();
  }

  submit(): void {
    this.form.markAllAsTouched();
    this.message = '';
    this.errorMessage = '';

    if (this.form.invalid) {
      this.errorMessage = 'Please fill all subscription fields correctly.';
      return;
    }

    this.loading = true;

    const payload: AdminSubscriptionCreatePayload = {
      name: this.form.value.name || '',
      subtitle: this.form.value.subtitle || '',
      coins: Number(this.form.value.coins || 0),
      matches: Number(this.form.value.matches || 0),
      price: Number(this.form.value.price || 0),
      currency: this.form.value.currency || '',
      currency_symbol: this.form.value.currency_symbol || '',
      validity_days: Number(this.form.value.validity_days || 0),
      is_popular: Number(this.form.value.is_popular || 0),
      is_pro: Number(this.form.value.is_pro || 0),
      sort_order: Number(this.form.value.sort_order || 0)
    };

    const request$ = this.editingSubscriptionId
      ? this.adminService.updateSubscription(this.editingSubscriptionId, payload)
      : this.adminService.createSubscription(payload);

    request$.subscribe({
      next: (res) => {
        this.loading = false;
        this.message = res?.message || (this.editingSubscriptionId ? 'Subscription updated successfully.' : 'Subscription added successfully.');
        this.resetForm();
        this.loadSubscriptions();
      },
      error: (err) => {
        this.loading = false;
        this.errorMessage = err?.error?.message || err?.error?.error || (this.editingSubscriptionId ? 'Unable to update subscription.' : 'Unable to add subscription.');
      }
    });
  }

  loadSubscriptions(): void {
    this.subscriptionsLoading = true;

    this.adminService.getSubscriptions().subscribe({
      next: (res) => {
        const data = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
        this.subscriptions = data;
        this.subscriptionsLoading = false;
      },
      error: (err) => {
        console.log('get subscriptions error:', err);
        this.subscriptions = [];
        this.subscriptionsLoading = false;
      }
    });
  }

  editSubscription(item: AdminSubscription): void {
    this.editingSubscriptionId = item.id;
    this.message = '';
    this.errorMessage = '';
    this.form.patchValue({
      name: item.name || '',
      subtitle: item.subtitle || '',
      coins: Number(item.coins || 0),
      matches: Number(item.matches || 0),
      price: Number(item.price || 0),
      currency: item.currency || '',
      currency_symbol: item.currency_symbol || '',
      validity_days: Number(item.validity_days || 0),
      is_popular: Number(item.is_popular || 0),
      is_pro: Number(item.is_pro || 0),
      sort_order: Number(item.sort_order || 0)
    });
  }

  cancelEdit(): void {
    this.resetForm();
  }

  deleteSubscription(item: AdminSubscription): void {
    if (!item.id || this.deletingSubscriptionId) {
      return;
    }

    this.deleteConfirmSubscription = item;
  }

  closeDeleteConfirm(): void {
    if (this.deletingSubscriptionId) {
      return;
    }

    this.deleteConfirmSubscription = null;
  }

  confirmDeleteSubscription(): void {
    if (!this.deleteConfirmSubscription?.id || this.deletingSubscriptionId) {
      return;
    }

    const item = this.deleteConfirmSubscription;
    this.deleteConfirmSubscription = null;

    this.deletingSubscriptionId = item.id;
    this.message = '';
    this.errorMessage = '';

    this.adminService.deleteSubscription(item.id).subscribe({
      next: (res) => {
        this.deletingSubscriptionId = null;
        this.message = res?.message || 'Subscription deleted successfully.';
        if (this.editingSubscriptionId === item.id) {
          this.resetForm();
        }
        this.loadSubscriptions();
      },
      error: (err) => {
        this.deletingSubscriptionId = null;
        this.errorMessage = err?.error?.message || err?.error?.error || 'Unable to delete subscription.';
      }
    });
  }

  private resetForm(): void {
    this.editingSubscriptionId = null;
    this.form.reset({
      name: '',
      subtitle: '',
      coins: 100,
      matches: 100,
      price: 160,
      currency: 'GBP',
      currency_symbol: '£',
      validity_days: 365,
      is_popular: 0,
      is_pro: 1,
      sort_order: 4
    });
  }
}
