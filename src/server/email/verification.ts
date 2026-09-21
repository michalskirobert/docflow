import { createHash, randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "./service";
import { renderEmailTemplate } from "./template";
import type { AppLocale } from "@/types/auth";
const hash = (token: string) =>
  createHash("sha256").update(token).digest("hex");
export async function sendVerificationEmail(user: {
  id: string;
  email: string;
  firstName: string;
  locale: string | null;
}) {
  await prisma.emailVerificationToken.deleteMany({
    where: { userId: user.id, usedAt: null },
  });
  const token = randomBytes(32).toString("hex");
  await prisma.emailVerificationToken.create({
    data: {
      tokenHash: hash(token),
      userId: user.id,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
  });
  const locale = (
    ["pl", "en", "id"].includes(user.locale ?? "") ? user.locale : "en"
  ) as AppLocale;
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const url = `${base}/${locale}/verify-email?token=${encodeURIComponent(token)}`;
  const subject =
    locale === "pl"
      ? "Potwierdź konto DocFlow"
      : locale === "id"
        ? "Verifikasi akun DocFlow"
        : "Verify your DocFlow account";
  const intro =
    locale === "pl"
      ? `Cześć ${user.firstName}, kliknij poniżej, aby potwierdzić adres e-mail.`
      : locale === "id"
        ? `Halo ${user.firstName}, klik tautan di bawah untuk memverifikasi email Anda.`
        : `Hi ${user.firstName}, click below to verify your email address.`;
  const actionLabel =
    locale === "pl"
      ? "Potwierdź adres e-mail"
      : locale === "id"
        ? "Verifikasi email"
        : "Verify email";
  await sendEmail({
    to: user.email,
    subject,
    html: renderEmailTemplate({
      title: subject,
      intro,
      actionLabel,
      actionUrl: url,
    }),
  });
}
export async function consumeVerificationToken(token: string) {
  const record = await prisma.emailVerificationToken.findUnique({
    where: { tokenHash: hash(token) },
    include: { user: true },
  });
  if (!record || record.usedAt || record.expiresAt <= new Date()) return null;
  await prisma.$transaction([
    prisma.user.update({
      where: { id: record.userId },
      data: { emailVerifiedAt: new Date() },
    }),
    prisma.emailVerificationToken.update({
      where: { id: record.id },
      data: { usedAt: new Date() },
    }),
  ]);
  return record.user;
}
