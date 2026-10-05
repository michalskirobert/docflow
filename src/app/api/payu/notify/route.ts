import { NextResponse } from "next/server";
import { verifyPayUSignature } from "@/server/payu/client";
import { syncPayUPayment } from "@/server/payu/payment-sync";

export async function POST(request: Request) {
  const raw = await request.text();
  const signatureHeader =
    request.headers.get("openpayu-signature") ??
    request.headers.get("x-openpayu-signature");
  const verification = verifyPayUSignature(raw, signatureHeader);

  if (!verification.valid) {
    console.error("[POST /api/payu/notify] Invalid PayU signature", {
      reason: verification.reason,
      hasSignatureHeader: Boolean(signatureHeader),
      hasSecondKey: Boolean(process.env.PAYU_SECOND_KEY),
      payuEnv: process.env.PAYU_ENV ?? "sandbox",
      posIdConfigured: Boolean(process.env.PAYU_POS_ID),
    });
    return NextResponse.json({ message: "Invalid signature" }, { status: 401 });
  }

  let payload: {
    order?: { orderId?: string; extOrderId?: string; status?: string };
  };

  try {
    payload = JSON.parse(raw) as typeof payload;
  } catch {
    return NextResponse.json({ message: "Invalid payload" }, { status: 400 });
  }

  const order = payload.order;
  if (!order?.extOrderId) return NextResponse.json({ ok: true });

  await syncPayUPayment(order);
  return NextResponse.json({ ok: true });
}
