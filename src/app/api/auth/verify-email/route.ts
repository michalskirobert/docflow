import { NextResponse } from "next/server";
import { consumeVerificationToken } from "@/server/email/verification";
export async function POST(request: Request) {
  const { token } = (await request.json()) as { token?: string };
  if (!token)
    return NextResponse.json({ message: "Missing token" }, { status: 400 });
  const user = await consumeVerificationToken(token);
  if (!user)
    return NextResponse.json(
      { message: "Invalid or expired verification token" },
      { status: 400 },
    );
  return NextResponse.json({ ok: true });
}
