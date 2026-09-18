import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { createSession } from "@/server/auth/session";
import { verifyCaptcha } from "@/server/captcha/challenge";

const schema = z
  .object({
    name: z.string().trim().min(2).max(80),
    organizationName: z.string().trim().min(2).max(120),
    email: z
      .string()
      .trim()
      .email()
      .transform((v) => v.toLowerCase()),
    password: z
      .string()
      .min(10)
      .max(128)
      .regex(/[A-Z]/)
      .regex(/[a-z]/)
      .regex(/[0-9]/),
    confirmPassword: z.string(),
    locale: z.enum(["pl", "en", "id"]),
    captchaToken: z.string().min(1),
    captchaAnswer: z.string().min(1),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success)
    return NextResponse.json(
      { message: "Invalid registration data", issues: parsed.error.flatten() },
      { status: 400 },
    );
  const data = parsed.data;
  if (!verifyCaptcha(data.captchaToken, data.captchaAnswer))
    return NextResponse.json(
      { message: "Invalid or expired verification challenge" },
      { status: 400 },
    );
  if (
    await prisma.user.findUnique({
      where: { email: data.email },
      select: { id: true },
    })
  )
    return NextResponse.json(
      { message: "Account with this email already exists" },
      { status: 409 },
    );

  const trialDays = Number(process.env.DEFAULT_TRIAL_DAYS ?? 30);
  const monthlyLimit = Number(
    process.env.DEFAULT_MONTHLY_DOCUMENT_LIMIT ?? 100,
  );
  const trialEndsAt = new Date(Date.now() + trialDays * 86_400_000);
  const passwordHash = await bcrypt.hash(data.password, 12);

  const result = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        name: data.name,
        email: data.email,
        passwordHash,
        locale: data.locale,
      },
    });
    const organization = await tx.organization.create({
      data: { name: data.organizationName },
    });
    const membership = await tx.membership.create({
      data: { userId: user.id, organizationId: organization.id, role: "OWNER" },
    });
    await tx.subscription.create({
      data: {
        organizationId: organization.id,
        status: "TRIALING",
        trialEndsAt,
        monthlyDocumentLimit: monthlyLimit,
      },
    });
    return { user, organization, membership };
  });

  const session = {
    id: result.user.id,
    email: result.user.email,
    name: result.user.name,
    locale: result.user.locale as "pl" | "en" | "id",
    organizationId: result.organization.id,
    organizationName: result.organization.name,
    role: result.membership.role,
    subscriptionExempt: result.user.subscriptionExempt,
    trialExempt: result.user.trialExempt,
  };
  await createSession(session, true);
  return NextResponse.json(session, { status: 201 });
}
