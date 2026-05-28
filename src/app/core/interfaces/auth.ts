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
  mobile_otp: string;
}