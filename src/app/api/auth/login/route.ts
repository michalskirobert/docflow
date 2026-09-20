import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { loginSchema } from "@/features/auth/schema";
import { prisma } from "@/lib/prisma";
import { createSession } from "@/server/auth/session";
export async function POST(request: Request) {
  const parsed = loginSchema.safeParse(await request.json());

  if (!parsed.success)
    return NextResponse.json(
      { code: "VALIDATION_ERROR", message: "Invalid credentials" },
      { status: 400 },
    );

  const user = await prisma.user.findUnique({
    where: { email: parsed.data.email.toLowerCase() },
    include: { memberships: { include: { organization: true }, take: 1 } },
  });

  const passwordMatches = user
    ? await bcrypt.compare(parsed.data.password, user.passwordHash)
    : false;

  if (!user || !passwordMatches)
    return NextResponse.json(
      { code: "INVALID_CREDENTIALS", message: "Invalid email or password" },
      { status: 401 },
    );

  if (!user.emailVerifiedAt)
    return NextResponse.json(
      { code: "EMAIL_NOT_VERIFIED", message: "Email address is not verified" },
      { status: 403 },
    );

  const membership = user.memberships[0];

  if (!membership)
    return NextResponse.json(
      { code: "NO_ORGANIZATION", message: "No organization assigned" },
      { status: 403 },
    );

  const session = {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    name: `${user.firstName} ${user.lastName}`,
    locale: user.locale as "pl" | "en" | "id" | null,
    emailVerified: true,
    organizationId: membership.organizationId,
    organizationName: membership.organization.name,
    role: membership.role,
    subscriptionExempt: user.subscriptionExempt,
    trialExempt: user.trialExempt,
  };

  await createSession(session, parsed.data.rememberMe);

  return NextResponse.json(session);
}
