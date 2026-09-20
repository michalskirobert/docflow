import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendVerificationEmail } from "@/server/email/verification";
export async function POST(request: Request) {
  const { email } = (await request.json()) as { email?: string };
  if (email) {
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });
    if (user && !user.emailVerifiedAt) await sendVerificationEmail(user);
  }
  return NextResponse.json({ ok: true });
}
