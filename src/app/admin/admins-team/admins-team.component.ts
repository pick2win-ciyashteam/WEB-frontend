import { AfterViewInit, Component, OnInit } from '@angular/core';
import { AdminService } from 'src/app/core/services/admin.service';
import * as QRCode from 'qrcode';
type Access = 'Editor (can make changes)' | 'Read-only';
@Component({ selector: 'app-admins-team', templateUrl: './admins-team.component.html', styleUrls: ['./admins-team.component.css', './admins-team-password.component.css'] })
export class AdminsTeamComponent implements OnInit, AfterViewInit {
  primary = { id: null as number | null, name: '', email: '', mobile: '', twoFactor: false };
  editingPrimary = false;
  passwordCardOpen = false;
  private primarySnapshot = { name: '', mobile: '' };
  twoFaSetup: { adminId: number; adminName: string; secret: string; otpauthUrl: string } | null = null;
  twoFaLoading = false;
  twoFaQrCode = '';
  twoFaSecretVisible = false;
  credentials = { current: '', password: '', confirm: '', code: '' };
  newAdmin = { name: '', email: '', mobile: '', password: '', role: 'finance', access: 'Editor (can make changes)' as Access };
  admins: any[] = [];
  toast = ''; toastError = false; removeTarget: any = null; editingAdmin: any = null;
  constructor(private adminService: AdminService) { }
  ngOnInit(): void { this.loadProfile(); this.loadAdmins(); }
  ngAfterViewInit(): void {
    const addAdminPanel = document.querySelectorAll<HTMLElement>('.team-view .panel')[3];
    const grid = addAdminPanel?.querySelector<HTMLElement>('.grid');
    if (!grid || grid.querySelector('[data-sub-admin-password]')) return;
    const label = document.createElement('label');
    label.className = 'sub-admin-password';
    label.textContent = 'Password';
    const input = document.createElement('input');
    input.type = 'password'; input.placeholder = 'min 6 characters'; input.autocomplete = 'new-password';
    input.style.cssText = 'box-sizing:border-box;width:100%;min-height:43px;padding:10px 12px;border:1px solid rgba(244,180,0,.38);border-radius:10px;outline:0;color:#fff;background:#051a2a;font:14px Inter,Arial,sans-serif;';
    input.dataset['subAdminPassword'] = 'true';
    input.addEventListener('input', () => this.newAdmin.password = input.value);
    label.appendChild(input);
    grid.appendChild(label);
  }
  loadProfile(): void { this.adminService.getAdminProfile().subscribe({ next: res => { const profile = res?.data || res; if (profile?.id) { this.primary = { ...this.primary, ...profile, id: Number(profile.id), twoFactor: Number(profile.twofa_enabled ?? profile.two_factor_enabled ?? 0) === 1 }; this.primarySnapshot = { name: this.primary.name, mobile: this.primary.mobile }; } }, error: err => this.show(err?.error?.message || 'Unable to load administrator profile.', true) }); }
  loadAdmins(): void { this.adminService.getAdmins().subscribe({ next: res => { const rows = res?.data || []; this.admins = rows.filter((item: any) => item.role !== 'super_admin').map((item: any) => ({ ...item, mobile: item.mobile || '-', access: item.access_level === 'read_only' ? 'Read-only' : 'Editor (can make changes)', enabled: item.status === 'active', twoFactor: Number(item.twofa_enabled ?? item.two_factor_enabled ?? 0) === 1 })); }, error: err => this.show(err?.error?.message || 'Unable to load administrators.', true) }); }
  editPrimary(): void { this.primarySnapshot = { name: this.primary.name, mobile: this.primary.mobile }; this.editingPrimary = true; }
  cancelPrimaryEdit(): void { this.primary.name = this.primarySnapshot.name; this.primary.mobile = this.primarySnapshot.mobile; this.editingPrimary = false; }
  togglePasswordCard(): void {
    this.passwordCardOpen = !this.passwordCardOpen;
    if (this.passwordCardOpen) {
      setTimeout(() => document.querySelector('.team-view > .panel:nth-child(2)')?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
    } else {
      this.credentials = { current: '', password: '', confirm: '', code: '' };
    }
  }
  savePrimary(): void { const name = String(this.primary.name || '').trim(); const mobile = String(this.primary.mobile || '').trim(); if (!name || !mobile) { this.show('Full name and mobile are required.', true); return; } this.adminService.updateAdminProfile({ name, mobile }).subscribe({ next: res => { this.primary.name = name; this.primary.mobile = mobile; this.primarySnapshot = { name, mobile }; this.editingPrimary = false; this.show(res?.message || 'Primary administrator details saved.'); }, error: err => this.show(err?.error?.message || 'Unable to save profile.', true) }); }
  toggle2Fa(admin: any = this.primary): void {
    const adminId = Number(admin?.id || 0);
    if (!adminId || this.twoFaLoading) return;
    if (!admin.twoFactor) { this.startTwoFaSetup(admin); return; }
    this.updateTwoFa(admin, false);
  }

  startTwoFaSetup(admin: any): void {
    const adminId = Number(admin?.id || 0);
    if (!adminId || this.twoFaLoading) return;
    this.twoFaLoading = true;
    this.twoFaSetup = null;
    this.twoFaQrCode = '';
    this.twoFaSecretVisible = false;
    this.adminService.setupAdmin2Fa(adminId).subscribe({
      next: res => {
        this.twoFaLoading = false;
        if (res?.success === false || !res?.secret || !res?.otpauthUrl) {
          this.show(res?.message || 'Unable to create the 2FA setup key.', true);
          return;
        }
        const adminName = String(admin.name || admin.email || `Admin #${adminId}`).trim();
        const personalizedOtpUrl = this.personalizeOtpAuthUrl(res.otpauthUrl, adminName, res.secret);
        this.twoFaSetup = { adminId, adminName, secret: res.secret, otpauthUrl: personalizedOtpUrl };
        QRCode.toDataURL(personalizedOtpUrl, { width: 220, margin: 2, errorCorrectionLevel: 'M', color: { dark: '#051a2a', light: '#ffffff' } })
          .then(dataUrl => this.twoFaQrCode = dataUrl)
          .catch(() => this.show('2FA setup created, but the QR code could not be generated. Use the setup secret instead.', true));
        this.show('2FA setup key created. Add it to your authenticator, then enable 2FA.');
      },
      error: err => {
        this.twoFaLoading = false;
        this.show(err?.error?.message || 'Unable to set up two-factor authentication.', true);
      }
    });
  }

  confirmEnableTwoFa(): void {
    if (!this.twoFaSetup) return;
    const admin = this.twoFaSetup.adminId === this.primary.id ? this.primary : this.admins.find(item => Number(item.id) === this.twoFaSetup?.adminId);
    if (admin) this.updateTwoFa(admin, true);
  }

  cancelTwoFaSetup(): void {
    if (!this.twoFaLoading) { this.twoFaSetup = null; this.twoFaQrCode = ''; this.twoFaSecretVisible = false; }
  }

  toggleTwoFaSecret(): void { this.twoFaSecretVisible = !this.twoFaSecretVisible; }

  private personalizeOtpAuthUrl(otpauthUrl: string, adminName: string, secret: string): string {
    try {
      const url = new URL(otpauthUrl);
      url.pathname = `/${encodeURIComponent(adminName)}`;
      url.searchParams.set('issuer', 'Pick2Win');
      return url.toString();
    } catch {
      const query = String(otpauthUrl || '').split('?')[1] || `secret=${encodeURIComponent(secret)}`;
      const separator = query.includes('issuer=') ? '' : '&issuer=Pick2Win';
      return `otpauth://totp/${encodeURIComponent(adminName)}?${query}${separator}`;
    }
  }

  copyTwoFaSecret(): void {
    if (!this.twoFaSetup?.secret) return;
    navigator.clipboard?.writeText(this.twoFaSetup.secret)
      .then(() => this.show('2FA secret copied.'))
      .catch(() => this.show('Copy the secret manually from the field.', true));
  }

  private updateTwoFa(admin: any, enabled: boolean): void {
    const adminId = Number(admin?.id || 0);
    if (!adminId) return;
    this.twoFaLoading = true;
    this.adminService.toggleAdmin2Fa(adminId, enabled).subscribe({
      next: res => {
        this.twoFaLoading = false;
        if (res?.success === false) {
          this.show(res?.message || 'Unable to update 2FA.', true);
          return;
        }
        admin.twoFactor = enabled;
        this.twoFaSetup = null;
        this.twoFaQrCode = '';
        this.twoFaSecretVisible = false;
        this.show(res?.message || `Two-factor authentication ${enabled ? 'enabled' : 'disabled'} successfully.`);
      },
      error: err => {
        this.twoFaLoading = false;
        this.show(err?.error?.message || 'Unable to update 2FA.', true);
      }
    });
  }
  updateCredentials(): void { if (!this.credentials.current || this.credentials.password.length < 6 || this.credentials.password !== this.credentials.confirm) { this.show('Enter current password and matching 6+ character new passwords.', true); return; } this.adminService.updateAdminCredentials({ currentPassword: this.credentials.current, newPassword: this.credentials.password, confirmPassword: this.credentials.confirm }).subscribe({ next: res => { this.credentials = { current: '', password: '', confirm: '', code: '' }; this.passwordCardOpen = false; this.show(res?.message || 'Login credentials updated successfully.'); }, error: err => this.show(err?.error?.message || 'Unable to update login credentials.', true) }); }
  addAdmin(): void { if (!this.newAdmin.name.trim() || !this.newAdmin.email.trim() || !this.newAdmin.mobile.trim() || this.newAdmin.password.length < 6) { this.show('Name, email, mobile, and a 6+ character password are required.', true); return; } this.adminService.createAdmin({ name: this.newAdmin.name.trim(), email: this.newAdmin.email.trim(), mobile: this.newAdmin.mobile.trim(), password: this.newAdmin.password, role: this.newAdmin.role.toLowerCase(), access_level: this.newAdmin.access.startsWith('Read') ? 'read_only' : 'editor' }).subscribe({ next: res => { this.newAdmin = { name: '', email: '', mobile: '', password: '', role: 'finance', access: 'Editor (can make changes)' }; this.show(res?.message || 'Sub-admin added successfully.'); this.loadAdmins(); }, error: err => this.show(err?.error?.message || 'Unable to add sub-admin.', true) }); }
  openEditAdmin(admin: any): void { this.editingAdmin = { ...admin, password: '', role: String(admin.role || '').toLowerCase(), access_level: admin.access === 'Read-only' ? 'read_only' : 'editor', status: admin.enabled ? 'active' : 'blocked' }; }
  saveEditedAdmin(): void { const admin = this.editingAdmin; if (!admin?.name?.trim() || !admin?.email?.trim()) { this.show('Name and email are required.', true); return; } const payload: any = { name: admin.name.trim(), email: admin.email.trim(), mobile: String(admin.mobile || '').trim(), role: admin.role, access_level: admin.access_level, status: admin.status }; if (admin.password) payload.password = admin.password; this.adminService.updateAdmin(admin.id, payload).subscribe({ next: res => { this.editingAdmin = null; this.show(res?.message || 'Sub-admin updated successfully.'); this.loadAdmins(); }, error: err => this.show(err?.error?.message || 'Unable to update sub-admin.', true) }); }
  removeAdmin(): void { if (!this.removeTarget) return; this.adminService.removeAdmin(this.removeTarget.id).subscribe({ next: res => { this.removeTarget = null; this.show(res?.message || 'Sub-admin removed.'); this.loadAdmins(); }, error: err => this.show(err?.error?.message || 'Unable to remove sub-admin.', true) }); }
  private show(message: string, error = false): void { this.toast = message; this.toastError = error; window.setTimeout(() => this.toast = '', 3500); }
}
