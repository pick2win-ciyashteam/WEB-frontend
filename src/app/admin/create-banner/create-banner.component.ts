import { Component, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { AdminBanner, AdminBannerCreatePayload } from 'src/app/core/interfaces/admin';
import { AdminService } from 'src/app/core/services/admin.service';

@Component({
  selector: 'app-create-banner',
  templateUrl: './create-banner.component.html',
  styleUrls: ['./create-banner.component.css']
})
export class CreateBannerComponent implements OnInit {
  loading = false;
  bannersLoading = false;
  deletingBannerId: number | null = null;
  message = '';
  errorMessage = '';
  banners: AdminBanner[] = [];
  editingBannerId: number | null = null;

  form = this.fb.group({
    name: ['', Validators.required],
    image_url: ['', [Validators.required, Validators.pattern(/^https?:\/\/.+/)]],
    description: ['', Validators.required],
    link: ['', [Validators.required, Validators.pattern(/^https?:\/\/.+/)]],
    button: ['Go to UCT', Validators.required],
    sort_order: [null as number | null, Validators.min(0)]
  });

  constructor(private fb: FormBuilder, private adminService: AdminService) { }

  ngOnInit(): void {
    this.loadBanners();
  }

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

    const request$ = this.editingBannerId
      ? this.adminService.updateBanner(this.editingBannerId, payload)
      : this.adminService.createBanner(payload);

    request$.subscribe({
      next: (res) => {
        this.loading = false;
        this.message = res?.message || (this.editingBannerId ? 'Banner updated successfully.' : 'Banner created successfully.');
        this.resetForm();
        this.loadBanners();
      },
      error: (err) => {
        this.loading = false;
        this.errorMessage = err?.error?.message || err?.error?.error || (this.editingBannerId ? 'Unable to update banner.' : 'Unable to create banner.');
      }
    });
  }

  loadBanners(): void {
    this.bannersLoading = true;

    this.adminService.getBanners().subscribe({
      next: (res) => {
        const data = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
        this.banners = data;
        this.bannersLoading = false;
      },
      error: (err) => {
        console.log('get banners error:', err);
        this.banners = [];
        this.bannersLoading = false;
      }
    });
  }

  editBanner(item: AdminBanner): void {
    this.editingBannerId = item.id;
    this.message = '';
    this.errorMessage = '';
    this.form.patchValue({
      name: item.name || '',
      image_url: item.image_url || '',
      description: item.description || '',
      link: item.link || '',
      button: item.button || 'Go to UCT',
      sort_order: item.sort_order ?? null
    });
  }

  cancelEdit(): void {
    this.resetForm();
  }

  deleteBanner(item: AdminBanner): void {
    if (!item.id || this.deletingBannerId) {
      return;
    }

    const ok = confirm(`Delete banner "${item.name}"?`);

    if (!ok) {
      return;
    }

    this.deletingBannerId = item.id;
    this.message = '';
    this.errorMessage = '';

    this.adminService.deleteBanner(item.id).subscribe({
      next: (res) => {
        this.deletingBannerId = null;
        this.message = res?.message || 'Banner deleted successfully.';
        if (this.editingBannerId === item.id) {
          this.resetForm();
        }
        this.loadBanners();
      },
      error: (err) => {
        this.deletingBannerId = null;
        this.errorMessage = err?.error?.message || err?.error?.error || 'Unable to delete banner.';
      }
    });
  }

  private resetForm(): void {
    this.editingBannerId = null;
    this.form.reset({
      name: '',
      image_url: '',
      description: '',
      link: '',
      button: 'Go to UCT',
      sort_order: null
    });
  }
}
