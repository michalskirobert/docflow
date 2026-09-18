import { prisma } from "@/lib/prisma";
import type { SessionUser } from "@/types/auth";
import type { SubscriptionAccess } from "@/types/subscription";
export async function getSubscriptionAccess(
  user: SessionUser,
): Promise<SubscriptionAccess> {
  const sub = await prisma.subscription.findUnique({
    where: { organizationId: user.organizationId },
  });
  if (user.subscriptionExempt)
    return {
      allowed: true,
      reason: "subscription_exempt",
      status: sub?.status ?? "NONE",
      trialEndsAt: sub?.trialEndsAt?.toISOString() ?? null,
      monthlyDocumentLimit: sub?.monthlyDocumentLimit ?? null,
    };
  if (sub?.status === "ACTIVE")
    return {
      allowed: true,
      reason: "active_subscription",
      status: sub.status,
      trialEndsAt: sub.trialEndsAt?.toISOString() ?? null,
      monthlyDocumentLimit: sub.monthlyDocumentLimit,
    };
  if (
    !user.trialExempt &&
    sub?.status === "TRIALING" &&
    sub.trialEndsAt &&
    sub.trialEndsAt > new Date()
  )
    return {
      allowed: true,
      reason: "active_trial",
      status: sub.status,
      trialEndsAt: sub.trialEndsAt.toISOString(),
      monthlyDocumentLimit: sub.monthlyDocumentLimit,
    };
  return {
    allowed: false,
    reason: user.trialExempt
      ? "trial_exempt_no_subscription"
      : sub?.status === "TRIALING"
        ? "trial_expired"
        : "subscription_required",
    status: sub?.status ?? "NONE",
    trialEndsAt: sub?.trialEndsAt?.toISOString() ?? null,
    monthlyDocumentLimit: sub?.monthlyDocumentLimit ?? null,
  };
}
