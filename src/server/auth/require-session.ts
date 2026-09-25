import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "./session";

export async function requireSession() {
  const session = await getSession();
  if (!session) redirect("/login");

  const membership = await prisma.membership.findUnique({
    where: {
      userId_organizationId: {
        userId: session.id,
        organizationId: session.organizationId,
      },
    },
    select: {
      user: { select: { id: true } },
      organization: { select: { id: true } },
    },
  });

  if (!membership?.user || !membership.organization) {
    redirect("/login");
  }

  return session;
}
