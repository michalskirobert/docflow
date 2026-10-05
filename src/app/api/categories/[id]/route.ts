import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/server/auth/require-session";

type RouteContext = { params: Promise<{ id: string }> };

export async function DELETE(_request: Request, { params }: RouteContext) {
  const session = await requireSession();
  const { id } = await params;
  const category = await prisma.category.findFirst({
    where: { id, organizationId: session.organizationId },
    select: { id: true },
  });

  if (!category) {
    return NextResponse.json({ message: "Category not found" }, { status: 404 });
  }

  const value = `custom:${id}`;
  await prisma.$transaction([
    prisma.template.updateMany({
      where: { organizationId: session.organizationId, category: value },
      data: { category: "system:GENERAL" },
    }),
    prisma.document.updateMany({
      where: { organizationId: session.organizationId, category: value },
      data: { category: "system:GENERAL" },
    }),
    prisma.category.delete({ where: { id } }),
  ]);

  return NextResponse.json({ success: true });
}
