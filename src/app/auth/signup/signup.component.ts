import { Component } from '@angular/core';
import { AbstractControl, FormBuilder, ValidationErrors, Validators } from '@angular/forms';
import { Country } from 'src/app/core/interfaces/content';
import { AuthModalService } from '../../core/services/auth-modal.service';
import { ApiService } from 'src/app/core/services/api.service';

interface SignupCountry extends Country {
  min: number;
  max: number;
}

function minimumAgeValidator(minAge: number) {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = control.value;

    if (!value) {
      return null;
    }

    const [year, month, day] = value.split('-').map(Number);
    const birthDate = new Date(year, month - 1, day);
    const today = new Date();

    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();

    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }

    return age >= minAge ? null : { underAge: true };
  };
}

@Component({
  selector: 'app-signup',
  templateUrl: './signup.component.html',
  styleUrls: ['./signup.component.css']
})
export class SignupComponent {

  step = 1;
  showPassword = false;
  mobileOtp = ['', '', '', '', '', ''];
  emailOtp = ['', '', '', '', '', ''];
  testMobileOtp = '';
  testEmailOtp = '';

countries: SignupCountry[] = [];
countriesLoading = false;

  form = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(3)]],
    country: ['', Validators.required],
    dob: ['', [Validators.required, minimumAgeValidator(18)]],
    dial: ['', Validators.required],
    mobile: ['', [Validators.required, Validators.pattern(/^[0-9]{7,14}$/)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
    terms: [false, Validators.requiredTrue]
  });

  loading = false;
resending: 'mobile' | 'email' | null = null;
errorMessage = '';
successMessage = '';

  constructor(
    private fb: FormBuilder,
    private authModal: AuthModalService, private api:ApiService
  ) {
    this.loadCountries();
  }

  openLogin() {
    this.authModal.open('login');
  }

onCountryChange() {
  const country = this.selectedCountry;

  if (country) {
    this.form.patchValue({
      dial: country.dial_code,
      mobile: ''
    });
  }
}

  get ageValid(): boolean {
  return !!this.form.get('dob')?.value && !this.form.get('dob')?.hasError('underAge');
}

continueStep1() {
  this.form.markAllAsTouched();
  this.errorMessage = '';
  this.successMessage = '';

  if (this.form.invalid || !this.ageValid || !this.validateMobileByCountry()) {
    return;
  }

  const payload = {
    fullname: this.form.value.name || '',
    email: this.form.value.email || '',
    mobile: this.form.value.mobile || '',
    country: this.form.value.country || '',
    date_of_birth: this.form.value.dob || '',
    password: this.form.value.password || ''
  };

  this.loading = true;

  this.api.signup(payload).subscribe({
    next: (res: any) => {
      this.loading = false;
      this.successMessage = res?.message || 'OTP sent successfully';
      this.step = 2;
      this.mobileOtp = ['', '', '', '', '', ''];
      this.emailOtp = ['', '', '', '', '', ''];
      this.testMobileOtp = this.extractOtpFromResponse(res, 'mobile');
      this.testEmailOtp = this.extractOtpFromResponse(res, 'email');

      setTimeout(() => this.focusOtp('mobile'), 100);
    },
    error: (err) => {
      this.loading = false;
      this.errorMessage =
        err?.error?.message ||
        err?.error?.error ||
        'Signup failed. Please try again.';
    }
  });
}

focusOtp(type: 'mobile' | 'email') {
  const first = document.querySelector<HTMLInputElement>(`.${type}-otp-0`);
  first?.focus();
}

trackByIndex(index: number): number {
  return index;
}

otpInput(event: Event, index: number, type: 'mobile' | 'email') {
  const input = event.target as HTMLInputElement;
  const digits = input.value.replace(/\D/g, '');
  const value = digits.slice(0, 1);

  if (type === 'mobile') {
    this.mobileOtp[index] = value;
  } else {
    this.emailOtp[index] = value;
  }

  input.value = value;

  if (value && index < 5) {
    setTimeout(() => {
      const next = document.getElementById(`${type}-otp-${index + 1}`) as HTMLInputElement;
      next?.focus();
    }, 20);
  }
}

otpKeydown(event: KeyboardEvent, index: number, type: 'mobile' | 'email') {
  const input = event.target as HTMLInputElement;

  if (event.key === 'Backspace') {
    if (input.value) {
      if (type === 'mobile') {
        this.mobileOtp[index] = '';
      } else {
        this.emailOtp[index] = '';
      }
      input.value = '';
      event.preventDefault();
      return;
    }

    if (index > 0) {
      event.preventDefault();

      const prev = document.getElementById(`${type}-otp-${index - 1}`) as HTMLInputElement;

      if (type === 'mobile') {
        this.mobileOtp[index - 1] = '';
      } else {
        this.emailOtp[index - 1] = '';
      }

      prev.focus();
      prev.value = '';
    }
  }
}

otpPaste(event: ClipboardEvent, type: 'mobile' | 'email') {
  event.preventDefault();

  const pasted = event.clipboardData?.getData('text').replace(/\D/g, '').slice(0, 6) || '';
  const otpArray = pasted.split('');

  for (let i = 0; i < 6; i++) {
    const value = otpArray[i] || '';

    if (type === 'mobile') {
      this.mobileOtp[i] = value;
    } else {
      this.emailOtp[i] = value;
    }

    const el = document.getElementById(`${type}-otp-${i}`) as HTMLInputElement;
    if (el) el.value = value;
  }

  const focusIndex = Math.min(pasted.length, 5);
  const focusEl = document.getElementById(`${type}-otp-${focusIndex}`) as HTMLInputElement;
  focusEl?.focus();
}

isOtpComplete(type: 'mobile' | 'email'): boolean {
  const otp = type === 'mobile' ? this.mobileOtp : this.emailOtp;
  return otp.every(digit => digit !== '');
}

verifyMobile() {
  this.errorMessage = '';
  this.successMessage = '';

  if (!this.isOtpComplete('mobile')) {
    this.errorMessage = 'Please enter 6 digit OTP';
    return;
  }

  const payload = {
    mobile: this.form.value.mobile || '',
    otp: this.mobileOtp.join('')
  };

  console.log('mobile otp:', payload.otp);

  this.loading = true;

  this.api.verifyMobileOtp(payload).subscribe({
    next: (res: any) => {
      this.loading = false;
      this.successMessage = res?.message || 'Mobile verified successfully';
      this.testEmailOtp = this.extractOtpFromResponse(res, 'email') || this.testEmailOtp;
      this.step = 3;
      setTimeout(() => this.focusOtp('email'), 100);
    },
    error: (err) => {
      this.loading = false;
      this.errorMessage =
        err?.error?.message ||
        err?.error?.error ||
        'OTP verification failed. Please try again.';
    }
  });
}

verifyEmail() {
  this.errorMessage = '';
  this.successMessage = '';

  if (!this.isOtpComplete('email')) {
    this.errorMessage = 'Please enter 6 digit OTP';
    return;
  }

  const payload = {
    email: this.form.value.email || '',
    otp: this.emailOtp.join('')
  };

  console.log('email otp:', payload.otp);

  this.loading = true;

  this.api.verifyEmailOtp(payload).subscribe({
    next: (res: any) => {
      this.loading = false;
      this.successMessage = res?.message || 'Email verified successfully';
      this.step = 4;
    },
    error: (err) => {
      this.loading = false;
      this.errorMessage =
        err?.error?.message ||
        err?.error?.error ||
        'Email OTP verification failed. Please try again.';
    }
  });
}

resendOtp(type: 'mobile' | 'email') {
  this.errorMessage = '';
  this.successMessage = '';
  this.resending = type;

  const payload =
    type === 'mobile'
      ? { mobile: this.form.value.mobile || '', type }
      : { email: this.form.value.email || '', type };

  this.api.resendOtp(payload).subscribe({
    next: (res: any) => {
      this.resending = null;
      this.successMessage = res?.message || `${type === 'mobile' ? 'Mobile' : 'Email'} OTP resent successfully`;
      if (type === 'mobile') {
        this.mobileOtp = ['', '', '', '', '', ''];
        this.testMobileOtp = this.extractOtpFromResponse(res, 'mobile') || this.testMobileOtp;
      } else {
        this.emailOtp = ['', '', '', '', '', ''];
        this.testEmailOtp = this.extractOtpFromResponse(res, 'email') || this.testEmailOtp;
      }
      setTimeout(() => this.focusOtp(type), 100);
    },
    error: (err) => {
      this.resending = null;
      this.errorMessage =
        err?.error?.message ||
        err?.error?.error ||
        'Unable to resend OTP. Please try again.';
    }
  });
}

  otpMove(event: any, index: number, type: 'mobile' | 'email') {
    const input = event.target;
    input.value = input.value.replace(/\D/g, '').slice(0, 1);

    if (type === 'mobile') {
      this.mobileOtp[index] = input.value;
    } else {
      this.emailOtp[index] = input.value;
    }

    if (input.value && input.nextElementSibling) {
      input.nextElementSibling.focus();
    }
  }

  get passwordStrength() {
    const p = this.form.value.password || '';
    let score = 0;

    if (p.length >= 8) score++;
    if (/[A-Z]/.test(p)) score++;
    if (/[0-9]/.test(p)) score++;
    if (/[^A-Za-z0-9]/.test(p)) score++;

    return score;
  }

private loadCountries(): void {
  this.countriesLoading = true;

  this.api.getCountries().subscribe({
    next: (res) => {
      this.countriesLoading = false;
      this.countries = res?.success && Array.isArray(res.data)
        ? res.data.map(country => ({
            ...country,
            min: 7,
            max: 14
          }))
        : [];
    },
    error: () => {
      this.countriesLoading = false;
      this.countries = [];
      this.errorMessage = 'Unable to load countries. Please try again later.';
    }
  });
}

  get selectedCountry(): SignupCountry | undefined {
  return this.countries.find(c => c.name === this.form.value.country);
}

get mobileLimit(): number {
  return this.selectedCountry?.max || 14;
}

get mobileError(): string {
  const country = this.selectedCountry;

  if (!country) {
    return 'Select country first';
  }

  const mobile = this.form.value.mobile || '';

  if (!mobile) {
    return 'Mobile number is required';
  }

  if (mobile.length < country.min || mobile.length > country.max) {
    return `${country.name} mobile number must be ${country.min === country.max ? country.max : country.min + ' to ' + country.max} digits`;
  }

  return '';
}

validateMobileByCountry(): boolean {
  const country = this.selectedCountry;
  const mobile = this.form.value.mobile || '';

  if (!country) return false;

  return mobile.length >= country.min && mobile.length <= country.max;
}

onMobileInput(event: any) {
  let value = event.target.value.replace(/\D/g, '');

  if (value.length > this.mobileLimit) {
    value = value.slice(0, this.mobileLimit);
  }

  this.form.patchValue({ mobile: value }, { emitEvent: false });
}

private extractOtpFromResponse(res: any, type: 'mobile' | 'email'): string {
  const source = res?.data || res || {};
  const keys = type === 'mobile'
    ? ['mobile_otp', 'mobileOtp', 'otp_mobile', 'mobileOTP']
    : ['email_otp', 'emailOtp', 'otp_email', 'emailOTP'];

  for (const key of keys) {
    const value = source?.[key] ?? res?.[key];

    if (value !== undefined && value !== null && String(value).trim()) {
      return String(value).trim();
    }
  }

  if (source?.otp !== undefined && source?.otp !== null && String(source.otp).trim()) {
    return String(source.otp).trim();
  }

  return '';
}

  
}
