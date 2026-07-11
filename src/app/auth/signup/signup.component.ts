import { Component, OnDestroy } from '@angular/core';
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

type FieldState = '' | 'valid' | 'invalid' | 'warn';
type SignupErrorField = 'name' | 'country' | 'dob' | 'mobile' | 'email' | 'password' | 'terms' | 'form';

interface FieldValidation {
  state: FieldState;
  message: string;
}

const DEFAULT_MOBILE_LENGTH: MobileLengthRule = { min: 7, max: 14 };

const DISPOSABLE_EMAIL_DOMAINS = [
  '10minutemail.com',
  'mailinator.com',
  'tempmail.com',
  'guerrillamail.com',
  'trashmail.com',
  'getnada.com',
  'maildrop.cc',
  'dispostable.com'
];

const COMMON_PASSWORDS = [
  'password',
  'password123',
  '12345678',
  'qwerty123',
  'pick2win',
  'football123'
];

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

function strictPasswordValidator(control: AbstractControl): ValidationErrors | null {
  const value = String(control.value || '');

  if (!value) {
    return null;
  }

  const hasLetter = /[A-Za-z]/.test(value);
  const hasUppercase = /[A-Z]/.test(value);
  const hasDigit = /\d/.test(value);
  const hasSymbol = /[!@#$%^&*(),.?":{}|<>_\-+=[\]/\\;'`~]/.test(value);

  return value.length >= 8 && hasLetter && hasUppercase && hasDigit && hasSymbol
    ? null
    : { passwordStrict: true };
}

@Component({
  selector: 'app-signup',
  templateUrl: './signup.component.html',
  styleUrls: ['./signup.component.css']
})
export class SignupComponent implements OnDestroy {

  step = 1;
  showPassword = false;
  mobileOtp = ['', '', '', '', '', ''];
  emailOtp = ['', '', '', '', '', ''];
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
    password: ['', [Validators.required, Validators.minLength(8), strictPasswordValidator]],
    terms: [false, Validators.requiredTrue]
  });

  loading = false;
resending: 'mobile' | 'email' | null = null;
readonly resendCooldownSeconds = 60;
resendCooldown: Record<'mobile' | 'email', number> = { mobile: 0, email: 0 };
private resendCooldownTimers: Partial<Record<'mobile' | 'email', ReturnType<typeof setInterval>>> = {};
private _errorMessage = '';
signupFieldErrors: Partial<Record<SignupErrorField, string>> = {};
successMessage = '';

get errorMessage(): string {
  return this._errorMessage;
}

set errorMessage(message: string) {
  this._errorMessage = message;

  if (message) {
    setTimeout(() => {
      const error = document.querySelector<HTMLElement>('.signup-box .api-msg.error, .signup-box .field-alert.error');
      error?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      error?.focus({ preventScroll: true });
    });
  }
}

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

ngOnDestroy(): void {
  this.clearResendCooldown('mobile');
  this.clearResendCooldown('email');
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
  this.clearSignupFieldError('country');
  this.clearSignupFieldError('mobile');
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
  this.sanitizeSignupFields();
  this.form.markAllAsTouched();
  this.errorMessage = '';
  this.signupFieldErrors = {};
  this.successMessage = '';

  if (this.form.invalid || !this.ageValid || !this.validateMobileByCountry()) {
    this.collectSignupClientErrors();
    this.scrollToFirstSignupError();
    return;
  }

  if (!this.allClientGatesPassed) {
    this.signupFieldErrors.form = 'Please complete all signup validation checks.';
    return;
  }

  const payload = {
    fullname: this.form.value.name || '',
    email: this.withoutSpaces(this.form.value.email || ''),
    mobile: this.backendMobileNumber(),
    country: this.form.value.country || '',
    date_of_birth: this.form.value.dob || '',
    password: this.withoutSpaces(this.form.value.password || '')
  };

  this.loading = true;

  this.api.signup(payload).subscribe({
    next: (res: any) => {
      this.loading = false;
      this.successMessage = 'OTP sent to your email';
      this.step = 2;
      this.emailOtp = ['', '', '', '', '', ''];
      this.startResendCooldown('email');

      setTimeout(() => this.focusOtp('email'), 100);
    },
    error: (err) => {
      this.loading = false;
      this.assignSignupApiError(
        err?.error?.message ||
        err?.error?.error ||
        'Signup failed. Please try again.'
      );
    }
  });
}

focusOtp(type: 'mobile' | 'email') {
  const first = document.querySelector<HTMLInputElement>(`.${type}-otp-0`);
  first?.focus();
}

resendButtonLabel(type: 'mobile' | 'email'): string {
  if (this.resending === type) {
    return 'Resending...';
  }

  const action = type === 'mobile' ? 'Resend SMS' : 'Resend OTP';
  const seconds = this.resendCooldown[type];

  return seconds > 0 ? `${action} in ${seconds}s` : action;
}

private startResendCooldown(type: 'mobile' | 'email'): void {
  this.clearResendCooldown(type);
  this.resendCooldown[type] = this.resendCooldownSeconds;

  this.resendCooldownTimers[type] = setInterval(() => {
    const next = Math.max(0, this.resendCooldown[type] - 1);
    this.resendCooldown[type] = next;

    if (next === 0) {
      this.clearResendCooldown(type);
    }
  }, 1000);
}

private clearResendCooldown(type: 'mobile' | 'email'): void {
  const timer = this.resendCooldownTimers[type];

  if (timer) {
    clearInterval(timer);
    delete this.resendCooldownTimers[type];
  }

  this.resendCooldown[type] = 0;
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

clearSignupFieldError(field: SignupErrorField): void {
  if (this.signupFieldErrors[field]) {
    delete this.signupFieldErrors[field];
  }

  if (field !== 'form') {
    delete this.signupFieldErrors.form;
  }
}

private collectSignupClientErrors(): void {
  this.signupFieldErrors = {};

  if (this.nameError) this.signupFieldErrors.name = this.nameError;
  if (this.form.get('country')?.invalid) this.signupFieldErrors.country = 'Please select your country of residence.';
  if (this.dobError) this.signupFieldErrors.dob = this.dobError;
  if (this.form.get('mobile')?.invalid || !this.validateMobileByCountry()) this.signupFieldErrors.mobile = this.mobileError;
  if (this.emailError) this.signupFieldErrors.email = this.emailError;
  if (this.passwordError) this.signupFieldErrors.password = this.passwordError;
  if (this.form.get('terms')?.invalid) this.signupFieldErrors.terms = 'Please accept the terms and policies to continue.';
}

private assignSignupApiError(message: string): void {
  const text = String(message || 'Signup failed. Please try again.').trim();
  const normalized = text.toLowerCase();
  const field = this.signupApiErrorField(normalized);

  this.signupFieldErrors = {};
  this.signupFieldErrors[field] = text;

  setTimeout(() => {
    const selector = field === 'form'
      ? '.signup-box .form-alert'
      : `.signup-box [data-signup-error="${field}"]`;
    const target = document.querySelector<HTMLElement>(selector);
    target?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    target?.focus({ preventScroll: true });
  });
}

private signupApiErrorField(message: string): SignupErrorField {
  if (message.includes('email') || message.includes('mail')) return 'email';
  if (message.includes('mobile') || message.includes('phone') || message.includes('number') || message.includes('sms')) return 'mobile';
  if (message.includes('password')) return 'password';
  if (message.includes('country')) return 'country';
  if (message.includes('birth') || message.includes('dob') || message.includes('age')) return 'dob';
  if (message.includes('name') || message.includes('fullname') || message.includes('full name')) return 'name';
  if (message.includes('term') || message.includes('policy')) return 'terms';

  return 'form';
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
    return 'Your password must contain at least 8 characters.';
  }

  if (control.hasError('passwordStrict')) {
    return 'Need 8+ characters, an uppercase letter, a number, and a symbol.';
  }

  return '';
}

fieldClass(field: 'name' | 'dob' | 'mobile' | 'email' | 'password'): Record<string, boolean> {
  const validation = this.fieldValidation(field);

  return {
    field: true,
    'is-valid': validation.state === 'valid',
    'is-invalid': validation.state === 'invalid'
  };
}

fieldValidation(field: 'name' | 'dob' | 'mobile' | 'email' | 'password'): FieldValidation {
  if (field === 'name') return this.nameValidation;
  if (field === 'dob') return this.dobValidation;
  if (field === 'mobile') return this.mobileValidation;
  if (field === 'email') return this.emailValidation;
  return this.passwordValidation;
}

get nameValidation(): FieldValidation {
  const value = String(this.form.value.name || '').trim();
  const control = this.form.get('name');

  if (!value) return { state: '', message: '' };
  if (value.length < 2) return { state: 'invalid', message: '✗ Name is too short' };
  if (!/^[\p{L}\s'\-.]+$/u.test(value)) {
    return { state: 'invalid', message: '✗ Letters, spaces, hyphens, and apostrophes only' };
  }
  if (value.split(/\s+/).length < 2) {
    return { state: 'warn', message: '⚠ Please enter your full name (first + last)' };
  }
  if (control?.valid) return { state: 'valid', message: '✓ Looks good' };

  return { state: '', message: '' };
}

get dobValidation(): FieldValidation {
  const value = String(this.form.value.dob || '');

  if (!value) return { state: '', message: '' };

  const dob = new Date(value);

  if (Number.isNaN(dob.getTime())) {
    return { state: 'invalid', message: '✗ Please enter a valid date' };
  }

  const age = this.ageFromDate(value);

  if (age < 0) {
    return { state: 'invalid', message: '✗ Date of birth cannot be in the future' };
  }

  if (age < 18) {
    return { state: 'invalid', message: `✗ Must be 18 or older - you are ${Math.floor(age)}` };
  }

  if (age > 120) {
    return { state: 'invalid', message: '✗ Please check the year you entered' };
  }

  return { state: 'valid', message: `✓ Verified 18+ (age ${Math.floor(age)})` };
}

get mobileValidation(): FieldValidation {
  const country = this.selectedCountry;
  const digits = String(this.form.value.mobile || '');
  const dial = String(this.form.value.dial || country?.dial_code || '');

  if (!digits) return { state: '', message: '' };

  if (!country) {
    return { state: 'invalid', message: '✗ Select your country before mobile number' };
  }

  if (/^(\d)\1{6,}$/.test(digits)) {
    return { state: 'invalid', message: '✗ Please enter your real mobile number' };
  }

  if (dial === '+1' && (digits.startsWith('555') || /^\d{3}555\d/.test(digits))) {
    return { state: 'invalid', message: '✗ 555-xxxx numbers are reserved for fiction - please use your real mobile' };
  }

  if (dial === '+44' && digits.length >= country.max && !digits.startsWith('7')) {
    return { state: 'invalid', message: '✗ UK mobile numbers must start with 7 (after the +44)' };
  }

  if (dial === '+61' && digits.length >= country.max && !digits.startsWith('4')) {
    return { state: 'invalid', message: '✗ AU mobile numbers must start with 4 (after the +61)' };
  }

  if (digits.length < country.min) {
    return { state: 'warn', message: `Keep going - ${digits.length}/${country.min} digits so far` };
  }

  if (digits.length > country.max) {
    return { state: 'invalid', message: `✗ Max ${country.max} digits for ${country.name}` };
  }

  if (digits.length === country.max) {
    return { state: 'valid', message: `✓ Valid mobile - ${dial} ${digits} - max length reached` };
  }

  return { state: 'valid', message: `✓ Valid mobile format - ${dial} ${digits}` };
}

get emailValidation(): FieldValidation {
  const value = String(this.form.value.email || '').trim().toLowerCase();

  if (!value) return { state: '', message: '' };

  const pattern = /^[a-z0-9._%+\-]+@[a-z0-9.\-]+\.[a-z]{2,}$/i;

  if (!pattern.test(value)) {
    return { state: 'invalid', message: '✗ Not a valid email format' };
  }

  const domain = value.split('@')[1] || '';

  if (DISPOSABLE_EMAIL_DOMAINS.includes(domain)) {
    return { state: 'invalid', message: `✗ ${domain} is a disposable email service - please use your real email` };
  }

  if (value.includes('+')) {
    return { state: 'warn', message: '⚠ Aliased emails (with +tag) are accepted but get extra abuse review' };
  }

  if (value === 'test@test.com' || value.startsWith('test@example')) {
    return { state: 'invalid', message: '✗ Please use your real email address' };
  }

  return { state: 'valid', message: '✓ Email format looks good' };
}

get passwordValidation(): FieldValidation {
  const value = String(this.form.value.password || '');

  if (!value) return { state: '', message: '' };

  if (COMMON_PASSWORDS.includes(value.toLowerCase())) {
    return { state: 'invalid', message: '✗ This password is too common - pick something unique' };
  }

  const missing: string[] = [];

  if (value.length < 8) missing.push('8+ characters');
  if (!/[A-Za-z]/.test(value)) missing.push('a letter');
  if (!/[A-Z]/.test(value)) missing.push('an uppercase letter (A-Z)');
  if (!/\d/.test(value)) missing.push('a number');
  if (!/[!@#$%^&*(),.?":{}|<>_\-+=[\]/\\;'`~]/.test(value)) missing.push('a symbol (!@#$...)');

  if (missing.length) {
    return { state: 'invalid', message: '✗ Need: ' + missing.join(', ') };
  }

  return { state: 'valid', message: `✓ ${this.passwordStrengthLabel} password` };
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
    mobile: this.backendMobileNumber(),
    otp: this.mobileOtp.join('')
  };

  this.loading = true;

  this.api.verifyMobileOtp(payload).subscribe({
    next: (res: any) => {
      this.loading = false;
      this.successMessage = 'Please verify your email OTP';
      this.step = 3;
      this.startResendCooldown('email');
      setTimeout(() => this.focusOtp('email'), 100);
    },
    error: (err) => {
      this.loading = false;
      this.handleOtpVerifyError(err, 'mobile');
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

  this.loading = true;

  this.api.verifyEmailOtp(payload).subscribe({
    next: (res: any) => {
      this.loading = false;
      this.successMessage = res?.message || 'Email verified successfully';
      this.step = 3;
    },
    error: (err) => {
      this.loading = false;
      this.handleOtpVerifyError(err, 'email');
    }
  });
}

resendOtp(type: 'mobile' | 'email') {
  if (this.resending === type || this.resendCooldown[type] > 0) {
    return;
  }

  this.errorMessage = '';
  this.successMessage = '';
  this.resending = type;

  const payload =
    type === 'mobile'
      ? { mobile: this.backendMobileNumber(), type }
      : { email: this.form.value.email || '', type };

  this.api.resendOtp(payload).subscribe({
    next: (res: any) => {
      this.resending = null;
      this.successMessage = res?.message || `${type === 'mobile' ? 'Mobile' : 'Email'} OTP resent successfully`;
      if (type === 'mobile') {
        this.mobileOtp = ['', '', '', '', '', ''];
      } else {
        this.emailOtp = ['', '', '', '', '', ''];
      }
      this.startResendCooldown(type);
      setTimeout(() => this.focusOtp(type), 100);
    },
    error: (err) => {
      this.resending = null;
      const backendMessage = String(err?.error?.message || err?.error?.error || '').trim();
      const normalizedMessage = backendMessage.toLowerCase();

      this.errorMessage =
        this.isOtpExpiredMessage(normalizedMessage)
          ? this.otpExpiredMessage(type)
          : backendMessage || 'Unable to resend OTP. Please try again.';
    }
  });
}

private handleOtpVerifyError(err: any, type: 'mobile' | 'email'): void {
  const backendMessage = String(err?.error?.message || err?.error?.error || '').trim();
  const expiredText = backendMessage.toLowerCase();

  if (this.isOtpExpiredMessage(expiredText)) {
    if (type === 'mobile') {
      this.mobileOtp = ['', '', '', '', '', ''];
    } else {
      this.emailOtp = ['', '', '', '', '', ''];
    }

    this.errorMessage = this.otpExpiredMessage(type);
    setTimeout(() => this.focusOtp(type), 100);
    return;
  }

  this.errorMessage =
    backendMessage ||
    `${type === 'mobile' ? 'Mobile' : 'Email'} OTP verification failed. Please try again.`;
}

private isOtpExpiredMessage(message: string): boolean {
  return message.includes('expired')
    || message.includes('expire')
    || message.includes('session');
}

private otpExpiredMessage(type: 'mobile' | 'email'): string {
  return type === 'mobile'
    ? 'Mobile OTP expired. Please tap Resend SMS to get a new OTP.'
    : 'Email OTP expired. Please tap Resend email to get a new OTP.';
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

get passwordStrengthLabel(): string {
  const labels: Record<number, string> = {
    1: 'Very weak',
    2: 'Weak',
    3: 'Fair',
    4: 'Strong',
    5: 'Very strong'
  };

  return labels[Math.max(1, this.passwordStrength)] || 'Strength';
}

get allClientGatesPassed(): boolean {
  return this.nameValidation.state === 'valid'
    && this.dobValidation.state === 'valid'
    && this.mobileValidation.state === 'valid'
    && this.emailValidation.state === 'valid'
    && this.passwordValidation.state === 'valid'
    && !!this.form.value.country
    && !!this.form.value.terms;
}

private ageFromDate(value: string): number {
  const dob = new Date(value);
  const now = new Date();
  const ageMs = now.getTime() - dob.getTime();

  return ageMs / (365.25 * 24 * 60 * 60 * 1000);
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
      this.signupFieldErrors.form = 'Unable to load countries. Please try again later.';
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

get selectedCountryFlag(): string {
  const country = this.selectedCountry;
  const backendFlag = String(country?.flag || '').trim();

  if (backendFlag && !this.isFlagImage(backendFlag)) {
    return backendFlag;
  }

  const code = String(country?.code || '').trim().toUpperCase();
  return /^[A-Z]{2}$/.test(code)
    ? String.fromCodePoint(...Array.from(code).map(letter => 127397 + letter.charCodeAt(0)))
    : '';
}

get selectedCountryFlagImage(): string {
  const flag = String(this.selectedCountry?.flag || '').trim();
  return this.isFlagImage(flag) ? flag : '';
}

private isFlagImage(flag: string): boolean {
  return /^(https?:\/\/|\/|assets\/|data:image\/)/i.test(flag)
    || /\.(svg|png|jpe?g|webp|gif)(\?.*)?$/i.test(flag);
}

private scrollToFirstSignupError(): void {
  setTimeout(() => {
    const invalidControl = document.querySelector<HTMLElement>(
      '.signup-box [formControlName].ng-invalid'
    );
    const target = invalidControl?.closest<HTMLElement>('.field, .terms') || invalidControl;

    target?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    invalidControl?.focus({ preventScroll: true });
  });
}

get mobileLimit(): number {
  return this.selectedCountry?.max || DEFAULT_MOBILE_LENGTH.max;
}

private backendMobileNumber(): string {
  const countryCode = this.onlyDigits(
    String(this.form.value.dial || this.selectedCountry?.dial_code || '')
  );
  const mobile = this.onlyDigits(this.form.value.mobile || '').slice(0, this.mobileLimit);

  return `${countryCode}${mobile}`;
}

get dialLabel(): string {
  const country = this.selectedCountry;
  const dial = String(this.form.value.dial || country?.dial_code || '').trim();
  const code = String(country?.code || '').trim().toUpperCase();

  return [dial, code].filter(Boolean).join(' ');
}

get mobileRangeText(): string {
  const country = this.selectedCountry;
  const min = country?.min || DEFAULT_MOBILE_LENGTH.min;
  const max = country?.max || DEFAULT_MOBILE_LENGTH.max;

  return min === max ? String(max) : `${min}-${max}`;
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
  this.clearSignupFieldError('mobile');
  let value = this.onlyDigits(event.target.value);

  if (value.length > this.mobileLimit) {
    value = value.slice(0, this.mobileLimit);
  }

  this.form.patchValue({ mobile: value }, { emitEvent: false });
  this.form.get('mobile')?.updateValueAndValidity({ emitEvent: false });
}

sanitizeSignupEmail(): void {
  this.clearSignupFieldError('email');
  const emailCtrl = this.form.get('email');
  const cleanEmail = this.withoutSpaces(emailCtrl?.value || '');

  if (emailCtrl?.value !== cleanEmail) {
    emailCtrl?.setValue(cleanEmail, { emitEvent: false });
  }
}

sanitizeSignupPassword(): void {
  this.clearSignupFieldError('password');
  const passwordCtrl = this.form.get('password');
  const cleanPassword = this.withoutSpaces(passwordCtrl?.value || '');

  if (passwordCtrl?.value !== cleanPassword) {
    passwordCtrl?.setValue(cleanPassword, { emitEvent: false });
  }
}

private sanitizeSignupFields(): void {
  this.onMobileInput({ target: { value: this.form.value.mobile || '' } });
  this.sanitizeSignupEmail();
  this.sanitizeSignupPassword();
}

private withoutSpaces(value: string): string {
  return String(value || '').replace(/\s+/g, '');
}

private onlyDigits(value: string): string {
  return String(value || '').replace(/\D/g, '');
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

  const dial = String(this.form.value.dial || country.dial_code || '');

  if (/^(\d)\1{6,}$/.test(mobile)) {
    return { mobileFake: true };
  }

  if (dial === '+1' && (mobile.startsWith('555') || /^\d{3}555\d/.test(mobile))) {
    return { mobileFiction: true };
  }

  if (dial === '+44' && mobile.length >= country.max && !mobile.startsWith('7')) {
    return { mobileUkPrefix: true };
  }

  if (dial === '+61' && mobile.length >= country.max && !mobile.startsWith('4')) {
    return { mobileAuPrefix: true };
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

}
