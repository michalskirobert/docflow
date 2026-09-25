import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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
    select: { status: true, provider: true },
  });

  if (!record || record.provider !== "PAYU") {
    return NextResponse.json({ message: "Payment not found" }, { status: 404 });
  }

  return NextResponse.json({ status: record.status });
}
