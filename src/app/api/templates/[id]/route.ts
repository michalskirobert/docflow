import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/server/auth/require-session";
import { extractVariables } from "@/server/documents/template";
import { sanitizeTemplateHtml } from "@/server/documents/sanitize-template";
const schema = z.object({
  name: z.string().min(2).max(250),
  description: z.string().max(400).optional(),
  content: z.string().min(1),
  headerContent: z.string().optional(),
  footerContent: z.string().optional(),
  pageNumbers: z.boolean().optional(),
  variables: z
    .array(
      z.object({
        name: z.string(),
        label: z.string().optional(),
        type: z.enum(["text", "date", "image", "select"]),
        required: z.boolean().optional(),
        requiredMessage: z.string().optional(),
        mask: z.string().optional(),
        dateFormat: z.string().optional(),
        options: z.array(z.string()).optional(),
        imageWidth: z.number().optional(),
        imageHeight: z.number().optional(),
        imageAlign: z.enum(["inline", "left", "center", "right"]).optional(),
        imageFit: z.enum(["contain", "cover", "fill"]).optional(),
      }),
    )
    .optional(),
});
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const s = await requireSession();
  const { id } = await params;
  const parsed = schema.parse(await req.json());
  const p = {
    ...parsed,
    content: sanitizeTemplateHtml(parsed.content),
    headerContent: sanitizeTemplateHtml(parsed.headerContent ?? ""),
    footerContent: sanitizeTemplateHtml(parsed.footerContent ?? ""),
  };
  const variableDefinitions =
    p.variables ??
    extractVariables(p.content).map((name) => ({
      name,
      type: "text" as const,
    }));
  const { variables: _variables, ...templateData } = p;
  const exists = await prisma.template.findFirst({
    where: { id, organizationId: s.organizationId },
  });
  if (!exists)
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  return NextResponse.json(
    await prisma.template.update({
      where: { id },
      data: {
        ...templateData,
        variablesJson: JSON.stringify(variableDefinitions),
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
  try {
    await prisma.template.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[DELETE template]", error);
    return NextResponse.json(
      { message: "Could not delete template" },
      { status: 409 },
    );
  }
}
