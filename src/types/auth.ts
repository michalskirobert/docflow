export type AppLocale = "pl" | "en" | "id";

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  locale: AppLocale | null;
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

export type RegisterPayload = {
  name: string;
  organizationName: string;
  email: string;
  password: string;
  confirmPassword: string;
  locale: AppLocale;
  captchaToken: string;
  captchaAnswer: string;
};

export type CaptchaChallenge = {
  question: string;
  token: string;
  expiresInSeconds: number;
};
