import { Component } from '@angular/core';
import { AbstractControl, FormBuilder, ValidationErrors, Validators } from '@angular/forms';
import { AuthModalService } from '../../core/services/auth-modal.service';
import { ApiService } from 'src/app/core/services/api.service';

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

countries = [
  { name: 'United Kingdom', dial: '+44', min: 10, max: 10 },
  { name: 'Ireland', dial: '+353', min: 9, max: 9 },
  { name: 'United States', dial: '+1', min: 10, max: 10 },
  { name: 'Canada', dial: '+1', min: 10, max: 10 },
  { name: 'France', dial: '+33', min: 9, max: 9 },
  { name: 'Germany', dial: '+49', min: 10, max: 11 },
  { name: 'Spain', dial: '+34', min: 9, max: 9 },
  { name: 'Italy', dial: '+39', min: 9, max: 10 },
  { name: 'Australia', dial: '+61', min: 9, max: 9 },
  { name: 'New Zealand', dial: '+64', min: 8, max: 10 }
];

  form = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(3)]],
    country: ['', Validators.required],
    dob: ['', [Validators.required, minimumAgeValidator(18)]],
    dial: ['+44', Validators.required],
    mobile: ['', [Validators.required, Validators.pattern(/^[0-9]{7,14}$/)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.pattern(/^(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/)]],
    terms: [false, Validators.requiredTrue]
  });

  loading = false;
errorMessage = '';
successMessage = '';

  constructor(
    private fb: FormBuilder,
    private authModal: AuthModalService, private api:ApiService
  ) {}

  openLogin() {
    this.authModal.open('login');
  }

onCountryChange() {
  const country = this.selectedCountry;

  if (country) {
    this.form.patchValue({
      dial: country.dial,
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

otpInput(event: Event, index: number, type: 'mobile' | 'email') {
  const input = event.target as HTMLInputElement;
  const value = input.value.replace(/\D/g, '').slice(-1);

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
      next?.select();
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
    mobile_otp: this.mobileOtp.join('')
  };

  this.loading = true;

  this.api.verifySignup(payload).subscribe({
    next: (res: any) => {
      this.loading = false;
      this.successMessage = res?.message || 'Mobile verified successfully';

      // If backend only verifies mobile, directly show success
      this.step = 4;

      // If later email OTP API comes, change this to:
      // this.step = 3;
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
  if (this.isOtpComplete('email')) {
    this.step = 4;
  }
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

  get selectedCountry() {
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

  
}