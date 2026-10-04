import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPayUSignature } from "@/server/payu/client";
export async function POST(request: Request) {
  const raw = await request.text();
  if (!verifyPayUSignature(raw, request.headers.get("openpayu-signature")))
    return NextResponse.json({ message: "Invalid signature" }, { status: 401 });
  const payload = JSON.parse(raw) as {
    order?: { orderId?: string; extOrderId?: string; status?: string };
  };
  const order = payload.order;
  if (!order?.extOrderId) return NextResponse.json({ ok: true });
  const payment = await prisma.payment.findUnique({
    where: { extOrderId: order.extOrderId },
  });
  if (!payment) return NextResponse.json({ ok: true });
  if (payment.status === "COMPLETED") return NextResponse.json({ ok: true });
  const status =
    order.status === "COMPLETED"
      ? "COMPLETED"
      : order.status === "CANCELED"
        ? "CANCELED"
        : "PENDING";
  await prisma.$transaction(async (tx) => {
    await tx.payment.update({
      where: { id: payment.id },
      data: {
        status,
        providerOrderId: order.orderId ?? payment.providerOrderId,
      },
    });
    if (status === "COMPLETED") {
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
  });
  return NextResponse.json({ ok: true });
}
