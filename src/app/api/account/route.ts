import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/server/auth/require-session";
export async function DELETE() {
  try {
    const s = await requireSession();
    await prisma.$transaction(async (tx) => {
      const membership = await tx.membership.findUnique({
        where: {
          userId_organizationId: {
            userId: s.id,
            organizationId: s.organizationId,
          },
        },
      });
      if (membership?.role === "OWNER")
        await tx.organization.delete({ where: { id: s.organizationId } });
      await tx.user.delete({ where: { id: s.id } });
    });
    return new NextResponse(null, { status: 204 });
  } catch (e) {
    console.error("[DELETE account]", e);
    return NextResponse.json(
      { message: "Could not delete account" },
      { status: 500 },
    );
  }
}
