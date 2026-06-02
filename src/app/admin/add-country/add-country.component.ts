import { Component, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { AdminCountry } from 'src/app/core/interfaces/admin';
import { AdminService } from 'src/app/core/services/admin.service';

@Component({
  selector: 'app-add-country',
  templateUrl: './add-country.component.html',
  styleUrls: ['./add-country.component.css']
})
export class AddCountryComponent implements OnInit {
  loading = false;
  countriesLoading = false;
  deletingCountryId: number | null = null;
  togglingCountryId: number | null = null;
  confirmModal: {
    type: 'delete' | 'toggle';
    country: AdminCountry;
    title: string;
    message: string;
    confirmText: string;
  } | null = null;
  message = '';
  errorMessage = '';
  countries: AdminCountry[] = [];

  form = this.fb.group({
    name: ['', Validators.required],
    code: ['', [Validators.required, Validators.maxLength(3)]],
    dial_code: ['', Validators.required],
    flag: ['', Validators.required],
    is_active: [1, Validators.required]
  });

  constructor(private fb: FormBuilder, private adminService: AdminService) { }

  ngOnInit(): void {
    this.loadCountries();
  }

  submit(): void {
    this.form.markAllAsTouched();
    this.message = '';
    this.errorMessage = '';

    if (this.form.invalid) {
      this.errorMessage = 'Please fill all country fields correctly.';
      return;
    }

    this.loading = true;

    this.adminService.createCountry({
      name: this.form.value.name || '',
      code: (this.form.value.code || '').toUpperCase(),
      dial_code: this.form.value.dial_code || '',
      flag: this.form.value.flag || '',
      is_active: Number(this.form.value.is_active || 0)
    }).subscribe({
      next: (res: any) => {
        this.loading = false;
        this.message = res?.message || 'Country added successfully.';
        this.form.reset({
          name: '',
          code: '',
          dial_code: '',
          flag: '',
          is_active: 1
        });
        this.loadCountries();
      },
      error: (err: any) => {
        this.loading = false;
        this.errorMessage = err?.error?.message || err?.error?.error || 'Unable to add country.';
      }
    });
  }

  loadCountries(): void {
    this.countriesLoading = true;

    this.adminService.getCountries().subscribe({
      next: (res) => {
        const data = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
        this.countries = data;
        this.countriesLoading = false;
      },
      error: (err) => {
        console.log('get countries error:', err);
        this.countries = [];
        this.countriesLoading = false;
      }
    });
  }

  deleteCountry(country: AdminCountry): void {
    if (!country.id || this.deletingCountryId) {
      return;
    }

    this.confirmModal = {
      type: 'delete',
      country,
      title: 'Delete Country',
      message: `Delete "${country.name}"? This action cannot be undone.`,
      confirmText: 'Delete'
    };
  }

  confirmAction(): void {
    if (!this.confirmModal) {
      return;
    }

    const { type, country } = this.confirmModal;

    if (type === 'delete') {
      this.confirmModal = null;
      this.deleteCountryConfirmed(country);
      return;
    }

    this.confirmModal = null;
    this.toggleCountryConfirmed(country);
  }

  closeConfirmModal(): void {
    if (this.deletingCountryId || this.togglingCountryId) {
      return;
    }

    this.confirmModal = null;
  }

  toggleCountry(country: AdminCountry): void {
    if (!country.id || this.togglingCountryId) {
      return;
    }

    const nextStatus = country.is_active === 0 ? 'unblock' : 'block';

    this.confirmModal = {
      type: 'toggle',
      country,
      title: `${nextStatus === 'block' ? 'Block' : 'Unblock'} Country`,
      message: `${nextStatus === 'block' ? 'Block' : 'Unblock'} "${country.name}"?`,
      confirmText: nextStatus === 'block' ? 'Block' : 'Unblock'
    };
  }

  private deleteCountryConfirmed(country: AdminCountry): void {
    this.deletingCountryId = country.id;
    this.message = '';
    this.errorMessage = '';

    this.adminService.deleteCountry(country.id).subscribe({
      next: (res) => {
        this.deletingCountryId = null;
        this.message = res?.message || 'Country deleted successfully.';
        this.loadCountries();
      },
      error: (err) => {
        this.deletingCountryId = null;
        this.errorMessage = err?.error?.message || err?.error?.error || 'Unable to delete country.';
      }
    });
  }

  private toggleCountryConfirmed(country: AdminCountry): void {
    const nextStatus = country.is_active === 0 ? 'unblock' : 'block';

    this.togglingCountryId = country.id;
    this.message = '';
    this.errorMessage = '';

    this.adminService.toggleCountry(country.id).subscribe({
      next: (res) => {
        this.togglingCountryId = null;
        this.message = res?.message || `Country ${nextStatus === 'block' ? 'blocked' : 'unblocked'} successfully.`;
        this.loadCountries();
      },
      error: (err) => {
        this.togglingCountryId = null;
        this.errorMessage = err?.error?.message || err?.error?.error || `Unable to ${nextStatus} country.`;
      }
    });
  }
}
