import type { PaymentStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type TransactionClient = Prisma.TransactionClient;

type PayUOrderSnapshot = {
  orderId?: string;
  extOrderId?: string;
  status?: string;
};

export function mapPayUStatus(status?: string): PaymentStatus {
  if (status === "COMPLETED") return "COMPLETED";
  if (status === "CANCELED") return "CANCELED";
  return "PENDING";
}

async function activateCompletedPayment(
  tx: TransactionClient,
  payment: {
    id: string;
    organizationId: string;
    plan: "FREE" | "YEARLY";
  },
) {
  await tx.payment.updateMany({
    where: {
      organizationId: payment.organizationId,
      plan: payment.plan,
      status: "PENDING",
      id: { not: payment.id },
    },
    data: { status: "CANCELED" },
  });

  const currentSubscription = await tx.subscription.findUnique({
    where: { organizationId: payment.organizationId },
    select: { currentPeriodEndsAt: true },
  });

  const renewalBase =
    currentSubscription?.currentPeriodEndsAt &&
    currentSubscription.currentPeriodEndsAt.getTime() > Date.now()
      ? currentSubscription.currentPeriodEndsAt
      : new Date();
  const renewedUntil = new Date(renewalBase);
  renewedUntil.setFullYear(renewedUntil.getFullYear() + 1);

  await tx.subscription.update({
    where: { organizationId: payment.organizationId },
    data: {
      plan: payment.plan,
      status: "ACTIVE",
      monthlyDocumentLimit:
        payment.plan === "FREE"
          ? 10
          : Number(process.env.YEARLY_DOCUMENT_LIMIT ?? 100),
      currentPeriodEndsAt: payment.plan === "YEARLY" ? renewedUntil : null,
    },
  });
}

export async function syncPayUPayment(order: PayUOrderSnapshot) {
  if (!order.extOrderId) return null;

  const payment = await prisma.payment.findUnique({
    where: { extOrderId: order.extOrderId },
  });
  if (!payment || payment.provider !== "PAYU") return null;

  const nextStatus = mapPayUStatus(order.status);

  if (payment.status === "COMPLETED") {
    return payment;
  }

  return prisma.$transaction(async (tx) => {
    const current = await tx.payment.findUnique({
      where: { id: payment.id },
    });
    if (!current) return null;
    if (current.status === "COMPLETED") return current;

    if (nextStatus === "COMPLETED") {
      const transition = await tx.payment.updateMany({
        where: { id: current.id, status: { not: "COMPLETED" } },
        data: {
          status: "COMPLETED",
          providerOrderId: order.orderId ?? current.providerOrderId,
        },
      });
      const updated = await tx.payment.findUnique({
        where: { id: current.id },
      });
      if (!updated) return null;
      if (transition.count === 1) {
        await activateCompletedPayment(tx, updated);
      }
      return updated;
    }

    return tx.payment.update({
      where: { id: current.id },
      data: {
        status: nextStatus,
        providerOrderId: order.orderId ?? current.providerOrderId,
      },
    });
  });
}
