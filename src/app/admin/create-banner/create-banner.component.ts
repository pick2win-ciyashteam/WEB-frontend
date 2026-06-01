import { Component } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { AdminBannerCreatePayload } from 'src/app/core/interfaces/admin';
import { AdminService } from 'src/app/core/services/admin.service';

@Component({
  selector: 'app-create-banner',
  templateUrl: './create-banner.component.html',
  styleUrls: ['./create-banner.component.css']
})
export class CreateBannerComponent {
  loading = false;
  message = '';
  errorMessage = '';

  form = this.fb.group({
    name: ['', Validators.required],
    image_url: ['', [Validators.required, Validators.pattern(/^https?:\/\/.+/)]],
    description: ['', Validators.required],
    link: ['', [Validators.required, Validators.pattern(/^https?:\/\/.+/)]],
    button: ['Go to UCT', Validators.required],
    sort_order: [null as number | null, Validators.min(0)]
  });

  constructor(private fb: FormBuilder, private adminService: AdminService) { }

  submit(): void {
    this.form.markAllAsTouched();
    this.message = '';
    this.errorMessage = '';

    if (this.form.invalid) {
      this.errorMessage = 'Please fill all banner fields correctly.';
      return;
    }

    this.loading = true;

    const payload: AdminBannerCreatePayload = {
      name: this.form.value.name || '',
      image_url: this.form.value.image_url || '',
      description: this.form.value.description || '',
      link: this.form.value.link || '',
      button: this.form.value.button || 'Go to UCT'
    };

    if (this.form.value.sort_order !== null && this.form.value.sort_order !== undefined) {
      payload.sort_order = Number(this.form.value.sort_order);
    }

    this.adminService.createBanner(payload).subscribe({
      next: (res) => {
        this.loading = false;
        this.message = res?.message || 'Banner created successfully.';
      },
      error: (err) => {
        this.loading = false;
        this.errorMessage = err?.error?.message || err?.error?.error || 'Unable to create banner.';
      }
    });
  }
}
