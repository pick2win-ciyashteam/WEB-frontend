import { Component } from '@angular/core';
import { AbstractControl, FormBuilder, ValidationErrors, Validators } from '@angular/forms';
import { Country } from 'src/app/core/interfaces/content';
import { AuthModalService } from '../../core/services/auth-modal.service';
import { ApiService } from 'src/app/core/services/api.service';

interface SignupCountry extends Country {
  min: number;
  max: number;
}

interface MobileLengthRule {
  min: number;
  max: number;
}

interface CountryRegionGroup {
  label: string;
  countries: SignupCountry[];
}

const DEFAULT_MOBILE_LENGTH: MobileLengthRule = { min: 7, max: 14 };

const MOBILE_LENGTH_BY_COUNTRY: Record<string, MobileLengthRule> = {
  australia: { min: 9, max: 9 },
  austria: { min: 10, max: 13 },
  belgium: { min: 9, max: 9 },
  canada: { min: 10, max: 10 },
  denmark: { min: 8, max: 8 },
  finland: { min: 9, max: 12 },
  france: { min: 9, max: 9 },
  germany: { min: 10, max: 11 },
  india: { min: 10, max: 10 },
  ireland: { min: 9, max: 9 },
  italy: { min: 9, max: 10 },
  netherlands: { min: 9, max: 9 },
  'new zealand': { min: 8, max: 10 },
  norway: { min: 8, max: 8 },
  poland: { min: 9, max: 9 },
  portugal: { min: 9, max: 9 },
  spain: { min: 9, max: 9 },
  sweden: { min: 9, max: 10 },
  'united kingdom': { min: 10, max: 10 },
  'united states': { min: 10, max: 10 },
  usa: { min: 10, max: 10 }
};

const MOBILE_LENGTH_BY_DIAL_CODE: Record<string, MobileLengthRule> = {
  '+1': { min: 10, max: 10 },
  '+31': { min: 9, max: 9 },
  '+32': { min: 9, max: 9 },
  '+33': { min: 9, max: 9 },
  '+34': { min: 9, max: 9 },
  '+351': { min: 9, max: 9 },
  '+353': { min: 9, max: 9 },
  '+39': { min: 9, max: 10 },
  '+44': { min: 10, max: 10 },
  '+45': { min: 8, max: 8 },
  '+46': { min: 9, max: 10 },
  '+47': { min: 8, max: 8 },
  '+48': { min: 9, max: 9 },
  '+49': { min: 10, max: 11 },
  '+61': { min: 9, max: 9 },
  '+64': { min: 8, max: 10 },
  '+91': { min: 10, max: 10 },
  '+358': { min: 9, max: 12 }
};

const COUNTRY_REGION_ORDER: Array<{ label: string; countries: string[] }> = [
  {
    label: 'United Kingdom & Ireland',
    countries: ['United Kingdom', 'Ireland']
  },
  {
    label: 'European Union & EEA',
    countries: [
      'Austria',
      'Belgium',
      'Denmark',
      'Finland',
      'France',
      'Germany',
      'Italy',
      'Netherlands',
      'Norway',
      'Poland',
      'Portugal',
      'Spain',
      'Sweden'
    ]
  },
  {
    label: 'North America',
    countries: ['United States', 'Canada']
  },
  {
    label: 'Asia-Pacific',
    countries: ['Australia', 'New Zealand']
  }
];

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

function internationalNameValidator(control: AbstractControl): ValidationErrors | null {
  const value = String(control.value || '').trim();

  if (!value) {
    return null;
  }

  return /^[\p{L}\p{M}][\p{L}\p{M}.' -]*$/u.test(value) ? null : { nameFormat: true };
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
  maxDob = this.getMaxDob();

countries: SignupCountry[] = [];
countryRegionGroups: CountryRegionGroup[] = [];
countriesLoading = false;

  form = this.fb.group({
    name: ['', [
      Validators.required,
      Validators.minLength(3),
      Validators.pattern(/^[A-Za-z][A-Za-z.'’-]*(?:\s+[A-Za-z][A-Za-z.'’-]*)+$/)
    ]],
    country: ['', Validators.required],
    dob: ['', [Validators.required, minimumAgeValidator(18)]],
    dial: ['', Validators.required],
    mobile: ['', [Validators.required, this.mobileNumberValidator.bind(this)]],
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
    this.form.get('name')?.setValidators([
      Validators.required,
      Validators.minLength(3),
      internationalNameValidator
    ]);
    this.form.get('name')?.updateValueAndValidity({ emitEvent: false });
    this.loadCountries();
  }

  openLogin() {
    this.authModal.open('login');
  }

openDatePicker(input: HTMLInputElement): void {
  input.focus();

  const pickerInput = input as HTMLInputElement & { showPicker?: () => void };
  pickerInput.showPicker?.();
}

private getMaxDob(): string {
  const date = new Date();
  date.setFullYear(date.getFullYear() - 18);
  return date.toISOString().slice(0, 10);
}

onCountryChange() {
  const country = this.selectedCountry;

  if (country) {
    this.form.patchValue({
      dial: country.dial_code,
      mobile: ''
    });
  }

  this.form.get('mobile')?.updateValueAndValidity();
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

trackByRegionLabel(_: number, group: CountryRegionGroup): string {
  return group.label;
}

trackByCountryCode(_: number, country: SignupCountry): string {
  return country.code || country.name;
}

get nameError(): string {
  const control = this.form.get('name');

  if (!control?.touched || !control.errors) {
    return '';
  }

  if (control.hasError('required')) {
    return 'Please enter your full name.';
  }

  if (control.hasError('minlength')) {
    return 'Your name must contain at least 3 characters.';
  }

  if (control.hasError('nameFormat')) {
    return 'Please use letters, spaces, apostrophes, or hyphens only.';
  }

  return '';
}

get dobError(): string {
  const control = this.form.get('dob');

  if (!control?.touched || !control.errors) {
    return '';
  }

  if (control.hasError('required')) {
    return 'Please select your date of birth.';
  }

  if (control.hasError('underAge')) {
    return 'You must be at least 18 years old to create an account.';
  }

  return '';
}

get emailError(): string {
  const control = this.form.get('email');

  if (!control?.touched || !control.errors) {
    return '';
  }

  if (control.hasError('required')) {
    return 'Please enter your email address.';
  }

  if (control.hasError('email')) {
    return 'Please enter a valid email address.';
  }

  return '';
}

get passwordError(): string {
  const control = this.form.get('password');

  if (!control?.touched || !control.errors) {
    return '';
  }

  if (control.hasError('required')) {
    return 'Please create a password.';
  }

  if (control.hasError('minlength')) {
    return 'Your password must contain at least 6 characters.';
  }

  return '';
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
            ...this.getMobileLengthRule(country)
          }))
        : [];
      this.countryRegionGroups = this.groupCountriesByRegion(this.countries);
    },
    error: () => {
      this.countriesLoading = false;
      this.countries = [];
      this.countryRegionGroups = [];
      this.errorMessage = 'Unable to load countries. Please try again later.';
    }
  });
}

private groupCountriesByRegion(countries: SignupCountry[]): CountryRegionGroup[] {
  const countryByName = new Map(
    countries.map(country => [country.name.trim().toLowerCase(), country])
  );
  const groupedNames = new Set<string>();

  const groups = COUNTRY_REGION_ORDER
    .map(region => {
      const regionCountries = region.countries
        .map(countryName => countryByName.get(countryName.toLowerCase()))
        .filter((country): country is SignupCountry => !!country);

      regionCountries.forEach(country => groupedNames.add(country.name.trim().toLowerCase()));

      return {
        label: region.label,
        countries: regionCountries
      };
    })
    .filter(group => group.countries.length > 0);

  const otherCountries = countries.filter(country => !groupedNames.has(country.name.trim().toLowerCase()));

  if (otherCountries.length) {
    groups.push({
      label: 'Other Supported Countries',
      countries: otherCountries
    });
  }

  return groups;
}

  get selectedCountry(): SignupCountry | undefined {
  return this.countries.find(c => c.name === this.form.value.country);
}

get mobileLimit(): number {
  return this.selectedCountry?.max || DEFAULT_MOBILE_LENGTH.max;
}

get mobileError(): string {
  const country = this.selectedCountry;

  if (!country) {
    return 'Please select your country before entering a mobile number.';
  }

  const mobile = this.form.value.mobile || '';

  if (!mobile) {
    return 'Please enter your mobile number.';
  }

  if (mobile.length < country.min || mobile.length > country.max) {
    return `${country.name} mobile numbers must contain ${country.min === country.max ? country.max : country.min + ' to ' + country.max} digits.`;
  }

  return '';
}

validateMobileByCountry(): boolean {
  return !this.mobileNumberValidator(this.form.get('mobile'));
}

onMobileInput(event: any) {
  let value = event.target.value.replace(/\D/g, '');

  if (value.length > this.mobileLimit) {
    value = value.slice(0, this.mobileLimit);
  }

  this.form.patchValue({ mobile: value }, { emitEvent: false });
  this.form.get('mobile')?.updateValueAndValidity({ emitEvent: false });
}

private mobileNumberValidator(control: AbstractControl | null): ValidationErrors | null {
  const mobile = String(control?.value || '');

  if (!mobile) {
    return null;
  }

  if (!/^[0-9]+$/.test(mobile)) {
    return { mobileDigits: true };
  }

  const country = this.selectedCountry;

  if (!country) {
    return { mobileCountry: true };
  }

  return mobile.length >= country.min && mobile.length <= country.max
    ? null
    : { mobileLength: true };
}

private getMobileLengthRule(country: Country): MobileLengthRule {
  const countryKey = this.normalizeCountryKey(country.name);
  const dialCodeKey = String(country.dial_code || '').replace(/\s/g, '');

  return MOBILE_LENGTH_BY_COUNTRY[countryKey]
    || MOBILE_LENGTH_BY_DIAL_CODE[dialCodeKey]
    || DEFAULT_MOBILE_LENGTH;
}

private normalizeCountryKey(value: string): string {
  return String(value || '').trim().toLowerCase();
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
