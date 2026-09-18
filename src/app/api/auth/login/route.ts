import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { createSession } from "@/server/auth/session";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  rememberMe: z.boolean().default(false),
});

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json(
      { message: "Invalid credentials" },
      { status: 400 },
    );
  }

  const user = await prisma.user.findUnique({
    where: { email: parsed.data.email },
    include: { memberships: { include: { organization: true }, take: 1 } },
  });

  const membership = user?.memberships[0];
  const validPassword = user
    ? await bcrypt.compare(parsed.data.password, user.passwordHash)
    : false;

  if (!user || !validPassword || !membership) {
    return NextResponse.json(
      { message: "Invalid email or password" },
      { status: 401 },
    );
  }

  const session = {
    id: user.id,
    email: user.email,
    name: user.name,
    locale: user.locale as "pl" | "en" | "id" | null,
    organizationId: membership.organizationId,
    organizationName: membership.organization.name,
    role: membership.role,
    subscriptionExempt: user.subscriptionExempt,
    trialExempt: user.trialExempt,
  };

  await createSession(session, parsed.data.rememberMe);
  return NextResponse.json(session);
}
