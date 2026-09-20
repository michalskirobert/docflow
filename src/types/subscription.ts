export type SubscriptionAccess = {
  allowed: boolean;
  reason: string;
  status: string;
  trialEndsAt: string | null;
  monthlyDocumentLimit: number | null;
};
