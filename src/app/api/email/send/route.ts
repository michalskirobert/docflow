import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/server/auth/require-session";
import {
  createUserEmailTransport,
  decryptEmailPassword,
} from "@/server/email/user-settings";

const schema = z.object({
  to: z.string().trim().email().max(320),
  subject: z.string().max(250),
  html: z.string().min(1).max(2_000_000),
  text: z.string().max(500_000).optional(),
});

export async function POST(req: Request) {
  try {
    const session = await requireSession();
    const input = schema.parse(await req.json());
    const settings = await prisma.userEmailSettings.findUnique({
      where: { userId: session.id },
    });
    if (!settings)
      return NextResponse.json(
        { message: "Email is not configured" },
        { status: 409 },
      );
    const transport = createUserEmailTransport({
      host: settings.host,
      port: settings.port,
      secure: settings.secure,
      username: settings.username,
      password: decryptEmailPassword(settings.passwordEncrypted),
      fromEmail: settings.fromEmail,
      fromName: settings.fromName,
    });
    await transport.sendMail({
      from: settings.fromName
        ? `"${settings.fromName.replace(/["\\]/g, "")}" <${settings.fromEmail}>`
        : settings.fromEmail,
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text,
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof z.ZodError
            ? "Invalid email"
            : "Email could not be sent",
      },
      { status: error instanceof z.ZodError ? 400 : 502 },
    );
  }
}
