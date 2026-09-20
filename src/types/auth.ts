export type AppLocale = "pl" | "en" | "id";

export type CustomerType = "INDIVIDUAL" | "BUSINESS";

export type PlanCode = "FREE" | "YEARLY";

export type SessionUser = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  name: string;
  locale: AppLocale | null;
  emailVerified: boolean;
  organizationId: string;
  organizationName: string;
  role: "OWNER" | "ADMIN" | "MEMBER";
  subscriptionExempt: boolean;
  trialExempt: boolean;
};

export type LoginPayload = {
  email: string;
  password: string;
  rememberMe: boolean;
};

export type CaptchaChallenge = {
  question: string;
  token: string;
  expiresInSeconds: number;
};

export type RegisterResponse = {
  email: string;
  verificationRequired: boolean;
  paymentRequired: boolean;
  redirectUri?: string;
  paymentPending?: boolean;
  paymentMethod?: "PAYU" | "BANK_TRANSFER";
  transferReference?: string;
};
