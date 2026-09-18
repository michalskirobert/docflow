import { NextResponse } from "next/server";
import { getSession } from "@/server/auth/session";
export async function GET() {
  const s = await getSession();
  return s
    ? NextResponse.json(s)
    : NextResponse.json({ message: "Unauthorized" }, { status: 401 });
}
