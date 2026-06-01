import { Component } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { AdminService } from 'src/app/core/services/admin.service';

@Component({
  selector: 'app-add-country',
  templateUrl: './add-country.component.html',
  styleUrls: ['./add-country.component.css']
})
export class AddCountryComponent {
  loading = false;
  message = '';
  errorMessage = '';

  form = this.fb.group({
    name: ['', Validators.required],
    code: ['', [Validators.required, Validators.maxLength(3)]],
    dial_code: ['', Validators.required],
    flag: ['', Validators.required],
    is_active: [1, Validators.required]
  });

  constructor(private fb: FormBuilder, private adminService: AdminService) { }

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
      next: (res) => {
        this.loading = false;
        this.message = res?.message || 'Country added successfully.';
      },
      error: (err) => {
        this.loading = false;
        this.errorMessage = err?.error?.message || err?.error?.error || 'Unable to add country.';
      }
    });
  }
}
