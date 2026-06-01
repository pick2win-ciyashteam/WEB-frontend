import { Component } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { AdminService } from 'src/app/core/services/admin.service';

@Component({
  selector: 'app-add-subscription',
  templateUrl: './add-subscription.component.html',
  styleUrls: ['./add-subscription.component.css']
})
export class AddSubscriptionComponent {
  loading = false;
  message = '';
  errorMessage = '';

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

  submit(): void {
    this.form.markAllAsTouched();
    this.message = '';
    this.errorMessage = '';

    if (this.form.invalid) {
      this.errorMessage = 'Please fill all subscription fields correctly.';
      return;
    }

    this.loading = true;

    this.adminService.createSubscription({
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
    }).subscribe({
      next: (res) => {
        this.loading = false;
        this.message = res?.message || 'Subscription added successfully.';
      },
      error: (err) => {
        this.loading = false;
        this.errorMessage = err?.error?.message || err?.error?.error || 'Unable to add subscription.';
      }
    });
  }
}
