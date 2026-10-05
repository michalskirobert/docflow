import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/server/auth/require-session";
import { cancelPayUOrder, getPayUOrder } from "@/server/payu/client";
import { syncPayUPayment } from "@/server/payu/payment-sync";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireSession();
    const { id } = await params;
    const payment = await prisma.payment.findFirst({
      where: {
        id,
        organizationId: session.organizationId,
        status: "PENDING",
        plan: "YEARLY",
      },
    });

    if (!payment) {
      return NextResponse.json({ message: "Payment not found" }, { status: 404 });
    }

    if (payment.provider === "PAYU" && payment.providerOrderId) {
      const payuOrder = await getPayUOrder(payment.providerOrderId);
      const synchronized = await syncPayUPayment({
        orderId: payuOrder.orderId ?? payment.providerOrderId,
        extOrderId: payuOrder.extOrderId ?? payment.extOrderId,
        status: payuOrder.status,
      });

      if (synchronized?.status === "COMPLETED") {
        return NextResponse.json(
          {
            message: "Payment is already completed",
            status: "COMPLETED",
          },
          { status: 409 },
        );
      }

      if (synchronized?.status === "CANCELED") {
        return NextResponse.json({ ok: true, status: "CANCELED" });
      }

      await cancelPayUOrder(payment.providerOrderId);
    }

    await prisma.payment.updateMany({
      where: { id: payment.id, status: "PENDING" },
      data: { status: "CANCELED" },
    });

    return NextResponse.json({ ok: true, status: "CANCELED" });
  } catch (error) {
    console.error("[POST /api/billing/[id]/cancel]", error);
    return NextResponse.json(
      { message: "Could not cancel payment" },
      { status: 400 },
    );
  }
}
