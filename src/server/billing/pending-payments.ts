import type { PrismaClient } from "@prisma/client";

export const PENDING_PAYMENT_TTL_MS = 72 * 60 * 60 * 1000;

export function pendingPaymentCutoff(now = Date.now()) {
  return new Date(now - PENDING_PAYMENT_TTL_MS);
}

export async function expirePendingPayments(
  prisma: PrismaClient,
  organizationId: string,
) {
  return prisma.payment.updateMany({
    where: {
      organizationId,
      status: "PENDING",
      createdAt: { lt: pendingPaymentCutoff() },
    },
    data: { status: "CANCELED" },
  });
}

export async function expireAllPendingPayments(prisma: PrismaClient) {
  return prisma.payment.updateMany({
    where: {
      status: "PENDING",
      createdAt: { lt: pendingPaymentCutoff() },
    },
    data: { status: "CANCELED" },
  });
}
