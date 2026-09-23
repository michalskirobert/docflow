import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/server/auth/require-session";
import { encryptEmailPassword } from "@/server/email/user-settings";

const schema = z.object({
  host: z.string().trim().min(1).max(255),
  port: z.number().int().min(1).max(65535),
  secure: z.boolean(),
  username: z.string().trim().min(1).max(320),
  password: z.string().min(1).max(1000).optional(),
  fromEmail: z.string().trim().email().max(320),
  fromName: z.string().trim().max(120).optional(),
});

export async function GET() {
  const session = await requireSession();
  const settings = await prisma.userEmailSettings.findUnique({
    where: { userId: session.id },
  });
  if (!settings) return NextResponse.json({ configured: false });
  return NextResponse.json({
    configured: true,
    host: settings.host,
    port: settings.port,
    secure: settings.secure,
    username: settings.username,
    fromEmail: settings.fromEmail,
    fromName: settings.fromName ?? "",
  });
}

export async function PUT(req: Request) {
  const session = await requireSession();
  const parsed = schema.parse(await req.json());
  const current = await prisma.userEmailSettings.findUnique({
    where: { userId: session.id },
  });
  if (!current && !parsed.password) {
    return NextResponse.json(
      { message: "Password is required" },
      { status: 400 },
    );
  }
  const passwordEncrypted = parsed.password
    ? encryptEmailPassword(parsed.password)
    : current!.passwordEncrypted;
  await prisma.userEmailSettings.upsert({
    where: { userId: session.id },
    create: {
      userId: session.id,
      host: parsed.host,
      port: parsed.port,
      secure: parsed.secure,
      username: parsed.username,
      passwordEncrypted,
      fromEmail: parsed.fromEmail,
      fromName: parsed.fromName || null,
    },
    update: {
      host: parsed.host,
      port: parsed.port,
      secure: parsed.secure,
      username: parsed.username,
      passwordEncrypted,
      fromEmail: parsed.fromEmail,
      fromName: parsed.fromName || null,
    },
  });
  return NextResponse.json({ configured: true });
}

export async function DELETE() {
  const session = await requireSession();
  await prisma.userEmailSettings.deleteMany({ where: { userId: session.id } });
  return NextResponse.json({ ok: true });
}
