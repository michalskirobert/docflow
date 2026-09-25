import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { consumeVerificationToken } from "@/server/email/verification";

export async function POST(request: Request) {
  const { token } = (await request.json()) as { token?: string };

  if (!token) {
    return NextResponse.json({ message: "Missing token" }, { status: 400 });
  }

  const user = await consumeVerificationToken(token);

  if (!user) {
    return NextResponse.json(
      { message: "Invalid or expired verification token" },
      { status: 400 },
    );
  }

  const membership = await prisma.membership.findFirst({
    where: { userId: user.id },
    select: { organizationId: true },
  });

  const pendingPayment = membership
    ? await prisma.payment.findFirst({
        where: {
          organizationId: membership.organizationId,
          status: "PENDING",
          plan: "YEARLY",
        },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          provider: true,
          providerOrderId: true,
          transferReference: true,
        },
      })
    : null;

  return NextResponse.json({
    ok: true,
    paymentRequired: Boolean(pendingPayment),
    paymentId: pendingPayment?.id ?? null,
    paymentMethod: pendingPayment?.provider ?? null,
    paymentStarted: Boolean(pendingPayment?.providerOrderId),
    transferReference: pendingPayment?.transferReference ?? null,
  });
}
