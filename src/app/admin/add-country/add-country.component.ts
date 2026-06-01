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

    const ok = confirm(`Delete country "${country.name}"?`);

    if (!ok) {
      return;
    }

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
}
