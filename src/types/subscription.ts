export type AccessReason =
  | "subscription_exempt"
  | "active_subscription"
  | "active_trial"
  | "trial_exempt_no_subscription"
  | "trial_expired"
  | "subscription_required";
export type SubscriptionAccess = {
  allowed: boolean;
  reason: AccessReason;
  status: string;
  trialEndsAt: string | null;
  monthlyDocumentLimit: number | null;
};
