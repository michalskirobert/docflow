import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/server/auth/require-session";
import { getSubscriptionAccess } from "@/server/subscription/access";
import { renderTemplate } from "@/server/documents/template";
import { renderDocument } from "@/server/documents/renderer";
const schema = z.object({
  templateId: z.string(),
  name: z.string().min(2),
  data: z.record(z.string(), z.union([z.string(), z.number()])),
});
export async function GET() {
  try {
    const s = await requireSession();
    return NextResponse.json(
      await prisma.document.findMany({
        where: { organizationId: s.organizationId },
        include: { template: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
      }),
    );
  } catch {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
}
export async function POST(req: Request) {
  try {
    const s = await requireSession();
    const access = await getSubscriptionAccess(s);
    if (!access.allowed)
      return NextResponse.json(
        { message: "Subscription required", access },
        { status: 402 },
      );
    const p = schema.parse(await req.json());
    const t = await prisma.template.findFirst({
      where: { id: p.templateId, organizationId: s.organizationId },
    });
    if (!t)
      return NextResponse.json(
        { message: "Template not found" },
        { status: 404 },
      );
    let variableDefinitions = [];
    try {
      variableDefinitions = JSON.parse(t.variablesJson);
    } catch {}
    const rendered = await renderDocument(
      renderTemplate(t.content, p.data, variableDefinitions),
    );
    const renderedHeader = t.headerContent
      ? renderTemplate(t.headerContent, p.data, variableDefinitions)
      : null;
    const renderedFooter = t.footerContent
      ? renderTemplate(t.footerContent, p.data, variableDefinitions)
      : null;
    const doc = await prisma.document.create({
      data: {
        organizationId: s.organizationId,
        templateId: t.id,
        name: p.name,
        payloadJson: JSON.stringify(p.data),
        renderedContent: rendered,
        renderedHeader,
        renderedFooter,
        pageNumbers: t.pageNumbers,
      },
    });
    return NextResponse.json(doc, { status: 201 });
  } catch (e) {
    return NextResponse.json(
      {
        message:
          e instanceof z.ZodError ? "Invalid document data" : "Unauthorized",
      },
      { status: e instanceof z.ZodError ? 400 : 401 },
    );
  }
}
