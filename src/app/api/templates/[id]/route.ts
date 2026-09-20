import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/server/auth/require-session";
import { extractVariables } from "@/server/documents/template";
import { sanitizeTemplateHtml } from "@/server/documents/sanitize-template";
const schema = z.object({
  name: z.string().min(2),
  description: z.string().optional(),
  content: z.string().min(1),
});
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const s = await requireSession();
  const { id } = await params;
  const parsed = schema.parse(await req.json());
  const p = { ...parsed, content: sanitizeTemplateHtml(parsed.content) };
  const exists = await prisma.template.findFirst({
    where: { id, organizationId: s.organizationId },
  });
  if (!exists)
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  return NextResponse.json(
    await prisma.template.update({
      where: { id },
      data: {
        ...p,
        variablesJson: JSON.stringify(extractVariables(p.content)),
      },
    }),
  );
}
export async function DELETE(
  _: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const s = await requireSession();
  const { id } = await params;
  const exists = await prisma.template.findFirst({
    where: { id, organizationId: s.organizationId },
  });
  if (!exists)
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  await prisma.template.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
