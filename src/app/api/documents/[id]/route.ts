import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/server/auth/require-session";
export async function DELETE(
  _: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const s = await requireSession();
    const { id } = await params;
    const doc = await prisma.document.findFirst({
      where: { id, organizationId: s.organizationId },
      select: { id: true },
    });
    if (!doc)
      return NextResponse.json(
        { message: "Document not found" },
        { status: 404 },
      );
    await prisma.document.delete({ where: { id } });
    return new NextResponse(null, { status: 204 });
  } catch {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
}
