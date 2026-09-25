import { createHash, randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createPayUOrder } from "@/server/payu/client";

const hash = (token: string) =>
  createHash("sha256").update(token).digest("hex");

export async function POST(request: Request) {
  try {
    const { token, paymentId } = (await request.json()) as {
      token?: string;
      paymentId?: string;
    };

    if (!token || !paymentId) {
      return NextResponse.json(
        { message: "Missing payment authorization" },
        { status: 400 },
      );
    }

    const verification = await prisma.emailVerificationToken.findUnique({
      where: { tokenHash: hash(token) },
      include: { user: true },
    });

    if (
      !verification ||
      !verification.usedAt ||
      verification.expiresAt <= new Date() ||
      !verification.user.emailVerifiedAt
    ) {
      return NextResponse.json(
        { message: "Payment authorization has expired" },
        { status: 401 },
      );
    }

    const membership = await prisma.membership.findFirst({
      where: { userId: verification.userId },
      select: { organizationId: true },
    });

    if (!membership) {
      return NextResponse.json(
        { message: "Account not found" },
        { status: 404 },
      );
    }

    const payment = await prisma.payment.findFirst({
      where: {
        id: paymentId,
        organizationId: membership.organizationId,
        status: "PENDING",
        plan: "YEARLY",
        provider: "PAYU",
      },
    });

    if (!payment) {
      return NextResponse.json(
        { message: "Payment is no longer available" },
        { status: 409 },
      );
    }

    if (payment.providerOrderId) {
      return NextResponse.json(
        { message: "Payment has already been started" },
        { status: 409 },
      );
    }

    const forwarded = request.headers
      .get("x-forwarded-for")
      ?.split(",")[0]
      ?.trim();
    const extOrderId = randomUUID();

    await prisma.payment.update({
      where: { id: payment.id },
      data: { extOrderId },
    });

    const order = await createPayUOrder({
      extOrderId,
      customerIp: forwarded || "127.0.0.1",
      description: "DocFlow YEARLY",
      totalAmount: payment.grossAmount,
      email: verification.user.email,
      firstName: verification.user.firstName,
      lastName: verification.user.lastName,
      locale: verification.user.locale ?? "en",
    });

    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        providerOrderId: order.orderId,
        transferReference: null,
      },
    });

    return NextResponse.json({ redirectUri: order.redirectUri });
  } catch (error) {
    console.error("[POST /api/auth/verification-payment]", error);
    return NextResponse.json(
      { message: "Could not start payment" },
      { status: 400 },
    );
  }
}
