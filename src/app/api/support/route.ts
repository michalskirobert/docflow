import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { supportSchema } from "@/features/help/schema";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/server/auth/require-session";
import { verifyCaptcha } from "@/server/captcha/challenge";
import { sendEmail } from "@/server/email/service";
import {
  renderSupportConfirmationEmail,
  renderSupportOwnerEmail,
} from "@/server/support/email";
import { consumeSupportRateLimit } from "@/server/support/rate-limit";

const prefixes = {
  BUG: "D-BUG",
  FEATURE: "D-FEATURE",
  SUPPORT: "D-SUPPORT",
} as const;

export async function POST(request: Request) {
  try {
    const session = await requireSession();
    const parsed = supportSchema.safeParse(await request.json());
    if (!parsed.success)
      return NextResponse.json({ code: "VALIDATION_ERROR" }, { status: 400 });
    const data = parsed.data;
    if (!verifyCaptcha(data.captchaToken, data.captchaAnswer))
      return NextResponse.json({ code: "INVALID_CAPTCHA" }, { status: 400 });
    if (!consumeSupportRateLimit(session.id))
      return NextResponse.json({ code: "RATE_LIMIT" }, { status: 429 });

    const user = await prisma.user.findUnique({
      where: { id: session.id },
      select: { email: true, firstName: true, lastName: true },
    });
    if (!user)
      return NextResponse.json({ code: "USER_NOT_FOUND" }, { status: 404 });

    const caseNumber = `${prefixes[data.type]}-${randomUUID()}`;
    const supportEmail =
      process.env.SUPPORT_EMAIL ??
      process.env.MAIL_FROM_EMAIL ??
      process.env.SMTP_USER;
    if (!supportEmail)
      throw new Error("SUPPORT_EMAIL or mail sender must be configured");
    const name = `${user.firstName} ${user.lastName}`.trim() || user.email;

    await sendEmail({
      to: supportEmail,
      subject: `[${caseNumber}] DocFlow - ${data.type}`,
      html: renderSupportOwnerEmail({
        caseNumber,
        type: data.type,
        email: user.email,
        name,
        message: data.message,
      }),
    });
    await sendEmail({
      to: user.email,
      subject: `[${caseNumber}] DocFlow - request received`,
      html: renderSupportConfirmationEmail({
        caseNumber,
        type: data.type,
        message: data.message,
      }),
    });

    return NextResponse.json({ caseNumber });
  } catch (error) {
    console.error("[POST support]", error);
    return NextResponse.json({ code: "SEND_FAILED" }, { status: 500 });
  }
}
