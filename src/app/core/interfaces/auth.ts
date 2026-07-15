export interface SignupPayload {
  fullname: string;
  email: string;
  mobile: string;
  country: string;
  date_of_birth: string;
  password: string;
}

export interface VerifySignupPayload {
  mobile: string;
  otp: string;
}

export interface VerifyEmailPayload {
  email: string;
  otp: string;
}

export type ResendOtpPayload = 
  | { mobile: string }
  | { email: string };
