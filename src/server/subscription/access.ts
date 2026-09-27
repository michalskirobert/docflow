import { prisma } from "@/lib/prisma";
import type { SessionUser } from "@/types/auth";
import type { SubscriptionAccess } from "@/types/subscription";

function monthStart() {
  const date = new Date();
  date.setDate(1);
  date.setHours(0, 0, 0, 0);
  return date;
}

export async function getSubscriptionAccess(
  user: SessionUser,
): Promise<SubscriptionAccess> {
  const sub = await prisma.subscription.findUnique({
    where: { organizationId: user.organizationId },
  });

  if (user.subscriptionExempt) {
    return {
      allowed: true,
      reason: "subscription_exempt",
      status: sub?.status ?? "NONE",
      trialEndsAt: null,
      monthlyDocumentLimit: sub?.monthlyDocumentLimit ?? null,
    };
  }

  if (sub?.status !== "ACTIVE") {
    return {
      allowed: false,
      reason: "subscription_required",
      status: sub?.status ?? "NONE",
      trialEndsAt: null,
      monthlyDocumentLimit: sub?.monthlyDocumentLimit ?? null,
    };
  }

  const limit = sub.monthlyDocumentLimit;
  if (limit > 0) {
    const usedThisMonth = await prisma.document.count({
      where: {
        organizationId: user.organizationId,
        createdAt: { gte: monthStart() },
      },
    });

    if (usedThisMonth >= limit) {
      return {
        allowed: false,
        reason: "monthly_document_limit_reached",
        status: sub.status,
        trialEndsAt: null,
        monthlyDocumentLimit: limit,
      };
    }
  }

  return {
    allowed: true,
    reason: "active_subscription",
    status: sub.status,
    trialEndsAt: null,
    monthlyDocumentLimit: limit,
  };
}
