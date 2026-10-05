import { NextResponse } from "next/server";
import { verifyPayUSignature } from "@/server/payu/client";
import { syncPayUPayment } from "@/server/payu/payment-sync";

export async function POST(request: Request) {
  const raw = await request.text();
  if (!verifyPayUSignature(raw, request.headers.get("openpayu-signature"))) {
    return NextResponse.json({ message: "Invalid signature" }, { status: 401 });
  }

  const payload = JSON.parse(raw) as {
    order?: { orderId?: string; extOrderId?: string; status?: string };
  };
  const order = payload.order;
  if (!order?.extOrderId) return NextResponse.json({ ok: true });

  await syncPayUPayment(order);
  return NextResponse.json({ ok: true });
}
