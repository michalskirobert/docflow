import { NextResponse } from "next/server";
import { requireSession } from "@/server/auth/require-session";
import { getSubscriptionAccess } from "@/server/subscription/access";
export async function GET() {
  try {
    return NextResponse.json(
      await getSubscriptionAccess(await requireSession()),
    );
  } catch {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
}
