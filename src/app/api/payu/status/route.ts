import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPayUOrder } from "@/server/payu/client";
import { syncPayUPayment } from "@/server/payu/payment-sync";

export async function GET(request: Request) {
  const payment = new URL(request.url).searchParams.get("payment");
  if (!payment) {
    return NextResponse.json(
      { message: "Missing payment reference" },
      { status: 400 },
    );
  }

  const record = await prisma.payment.findUnique({
    where: { extOrderId: payment },
    select: {
      status: true,
      provider: true,
      providerOrderId: true,
    },
  });

  if (!record || record.provider !== "PAYU") {
    return NextResponse.json({ message: "Payment not found" }, { status: 404 });
  }

  if (record.status === "COMPLETED" || !record.providerOrderId) {
    return NextResponse.json({ status: record.status });
  }

  try {
    const order = await getPayUOrder(record.providerOrderId);
    const synced = await syncPayUPayment({
      orderId: order.orderId ?? record.providerOrderId,
      extOrderId: order.extOrderId ?? payment,
      status: order.status,
    });
    return NextResponse.json({ status: synced?.status ?? record.status });
  } catch (error) {
    console.error("[GET payu/status] PayU synchronization failed", error);
    return NextResponse.json({ status: record.status });
  }
}
