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
      trialEndsAt: null,
      monthlyDocumentLimit: sub?.monthlyDocumentLimit ?? null,
    };
  const allowed = sub?.status === "ACTIVE";
  return {
    allowed,
    reason: allowed ? "active_subscription" : "subscription_required",
    status: sub?.status ?? "NONE",
    trialEndsAt: null,
    monthlyDocumentLimit: sub?.monthlyDocumentLimit ?? null,
  };
}
