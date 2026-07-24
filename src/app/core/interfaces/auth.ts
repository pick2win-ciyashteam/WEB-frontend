export interface SignupPayload {
  email: string;
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
