import { NextResponse } from "next/server";
import { requireSession } from "@/server/auth/require-session";
import { isPlatformAdmin } from "@/server/auth/platform-admin";
import { prisma } from "@/lib/prisma";
import { expireAllPendingPayments } from "@/server/billing/pending-payments";
export async function GET() {
  try {
    const s = await requireSession();
    if (!isPlatformAdmin(s))
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    await expireAllPendingPayments(prisma);
    const rows = await prisma.payment.findMany({
      where: { provider: "BANK_TRANSFER", status: "PENDING" },
      include: { organization: { include: { billingProfile: true } } },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(rows);
  } catch {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
}
