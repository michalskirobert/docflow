import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/server/auth/require-session";
import { getPlan } from "@/server/billing/plans";
import { createPayUOrder } from "@/server/payu/client";
import {
  expirePendingPayments,
  pendingPaymentCutoff,
} from "@/server/billing/pending-payments";

async function keepOnlyLatestPendingPayment(organizationId: string) {
  const latest = await prisma.payment.findFirst({
    where: { organizationId, status: "PENDING", plan: "YEARLY" },
    orderBy: { createdAt: "desc" },
    select: { id: true },
  });
  if (!latest) return null;
  await prisma.payment.updateMany({
    where: {
      organizationId,
      status: "PENDING",
      plan: "YEARLY",
      id: { not: latest.id },
    },
    data: { status: "CANCELED" },
  });
  return latest.id;
}

const paymentSchema = z.object({
  paymentMethod: z.enum(["PAYU", "BANK_TRANSFER"]),
});
export async function GET() {
  try {
    const s = await requireSession();
    await expirePendingPayments(prisma, s.organizationId);
    await keepOnlyLatestPendingPayment(s.organizationId);
    const currentSubscription = await prisma.subscription.findUnique({
      where: { organizationId: s.organizationId },
      select: { plan: true, status: true, currentPeriodEndsAt: true },
    });
    const renewalWindowStartsAt = Date.now() + 7 * 24 * 60 * 60 * 1000;
    if (
      currentSubscription?.plan === "YEARLY" &&
      currentSubscription.status === "ACTIVE" &&
      currentSubscription.currentPeriodEndsAt &&
      currentSubscription.currentPeriodEndsAt.getTime() > renewalWindowStartsAt
    ) {
      await prisma.payment.updateMany({
        where: {
          organizationId: s.organizationId,
          plan: "YEARLY",
          status: "PENDING",
        },
        data: { status: "CANCELED" },
      });
    }
    const [subscription, payments, billingProfile, salesDocuments] =
      await Promise.all([
        prisma.subscription.findUnique({
          where: { organizationId: s.organizationId },
        }),
        prisma.payment.findMany({
          where: { organizationId: s.organizationId },
          orderBy: { createdAt: "desc" },
        }),
        prisma.billingProfile.findUnique({
          where: { organizationId: s.organizationId },
        }),
        prisma.salesDocument.findMany({
          where: { organizationId: s.organizationId },
          orderBy: { createdAt: "desc" },
        }),
      ]);
    const renewalAvailable = Boolean(
      subscription?.plan === "YEARLY" &&
      subscription.status === "ACTIVE" &&
      subscription.currentPeriodEndsAt &&
      subscription.currentPeriodEndsAt.getTime() <= renewalWindowStartsAt,
    );
    return NextResponse.json({
      subscription,
      payments,
      billingProfile,
      salesDocuments,
      renewalAvailable,
    });
  } catch (error) {
    console.error("[GET billing]", error);
    return NextResponse.json(
      { message: "Could not load billing" },
      { status: 500 },
    );
  }
}
async function configurePayment(
  request: Request,
  paymentId: string,
  method: "PAYU" | "BANK_TRANSFER",
) {
  const s = await requireSession();
  const payment = await prisma.payment.findFirst({
    where: {
      id: paymentId,
      organizationId: s.organizationId,
      status: "PENDING",
      createdAt: { gte: pendingPaymentCutoff() },
    },
  });
  if (!payment) throw new Error("PAYMENT_NOT_FOUND");
  if (method === "BANK_TRANSFER") {
    const transferReference =
      payment.transferReference ??
      `DF-${randomUUID().replace(/-/g, "").slice(0, 12).toUpperCase()}`;
    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        provider: "BANK_TRANSFER",
        transferReference,
        providerOrderId: null,
      },
    });
    return { paymentMethod: method, transferReference };
  }
  const forwarded = request.headers
    .get("x-forwarded-for")
    ?.split(",")[0]
    ?.trim();
  // A PayU extOrderId is single-use. A pending payment may previously have
  // been configured as PayU or bank transfer, so always create a fresh id
  // before starting/restarting the PayU flow.
  const extOrderId = randomUUID();
  await prisma.payment.update({
    where: { id: payment.id },
    data: { extOrderId, providerOrderId: null },
  });
  if (payment.currency !== "PLN" && payment.currency !== "EUR") {
    throw new Error("PAYMENT_CURRENCY_UNSUPPORTED_BY_PAYU");
  }
  const order = await createPayUOrder({
    extOrderId,
    customerIp: forwarded || "127.0.0.1",
    description: "DocFlow YEARLY",
    totalAmount: payment.grossAmount,
    email: s.email,
    firstName: s.firstName,
    lastName: s.lastName,
    locale: s.locale ?? "en",
    currency: payment.currency,
  });
  await prisma.payment.update({
    where: { id: payment.id },
    data: {
      provider: "PAYU",
      transferReference: null,
      providerOrderId: order.orderId,
    },
  });
  return { paymentMethod: method, redirectUri: order.redirectUri };
}
export async function PATCH(request: Request) {
  try {
    const body = paymentSchema
      .extend({ paymentId: z.string() })
      .parse(await request.json());
    return NextResponse.json(
      await configurePayment(request, body.paymentId, body.paymentMethod),
    );
  } catch (e) {
    console.error("[PATCH billing]", e);
    return NextResponse.json(
      { message: "Could not change payment method" },
      { status: 400 },
    );
  }
}
export async function POST(request: Request) {
  try {
    const s = await requireSession();
    const body = paymentSchema.parse(await request.json());
    await expirePendingPayments(prisma, s.organizationId);
    await keepOnlyLatestPendingPayment(s.organizationId);

    const currentSubscription = await prisma.subscription.findUnique({
      where: { organizationId: s.organizationId },
      select: { plan: true, status: true, currentPeriodEndsAt: true },
    });
    const renewalWindowStartsAt = Date.now() + 7 * 24 * 60 * 60 * 1000;
    if (
      currentSubscription?.plan === "YEARLY" &&
      currentSubscription.status === "ACTIVE" &&
      currentSubscription.currentPeriodEndsAt &&
      currentSubscription.currentPeriodEndsAt.getTime() > renewalWindowStartsAt
    ) {
      return NextResponse.json(
        { message: "License can be renewed up to 7 days before expiry" },
        { status: 409 },
      );
    }

    const existing = await prisma.payment.findFirst({
      where: {
        organizationId: s.organizationId,
        status: "PENDING",
        plan: "YEARLY",
      },
      orderBy: { createdAt: "desc" },
    });
    if (existing)
      return NextResponse.json(
        { message: "A payment is already pending" },
        { status: 409 },
      );
    const billingProfile = await prisma.billingProfile.findUnique({
      where: { organizationId: s.organizationId },
      select: { countryCode: true },
    });
    const plan = getPlan("YEARLY", billingProfile?.countryCode);
    if (!plan.available || !plan.paymentAvailable)
      return NextResponse.json(
        { message: "Annual plan is not configured" },
        { status: 400 },
      );
    const payment = await prisma.payment.create({
      data: {
        organizationId: s.organizationId,
        plan: "YEARLY",
        provider: body.paymentMethod,
        extOrderId: randomUUID(),
        netAmount: plan.net,
        vatAmount: plan.vat,
        grossAmount: plan.gross,
        vatRate: plan.vatRate,
        currency: plan.currency,
      },
    });
    return NextResponse.json(
      await configurePayment(request, payment.id, body.paymentMethod),
      { status: 201 },
    );
  } catch (e) {
    console.error("[POST billing]", e);
    return NextResponse.json(
      { message: "Could not start payment" },
      { status: 400 },
    );
  }
}
