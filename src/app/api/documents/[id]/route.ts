import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/server/auth/require-session";
import { renderDocument } from "@/server/documents/renderer";
import { renderTemplate } from "@/server/documents/template";

const updateSchema = z.object({
  name: z.string().trim().min(2).max(250),
  data: z.record(z.string(), z.union([z.string(), z.number()])),
});

async function findDocument(id: string, organizationId: string) {
  return prisma.document.findFirst({
    where: { id, organizationId },
    include: { template: { select: { name: true } } },
  });
}

export async function GET(
  _: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireSession();
    const { id } = await params;
    const document = await findDocument(id, session.organizationId);
    if (!document) {
      return NextResponse.json(
        { message: "Document not found" },
        { status: 404 },
      );
    }
    return NextResponse.json(document);
  } catch {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireSession();
    const { id } = await params;
    const existing = await findDocument(id, session.organizationId);
    if (!existing) {
      return NextResponse.json(
        { message: "Document not found" },
        { status: 404 },
      );
    }
    const payload = updateSchema.parse(await req.json());
    if (!existing.templateId) {
      return NextResponse.json(
        { message: "Template not found" },
        { status: 404 },
      );
    }
    const template = await prisma.template.findFirst({
      where: {
        id: existing.templateId,
        organizationId: session.organizationId,
      },
    });
    if (!template) {
      return NextResponse.json(
        { message: "Template not found" },
        { status: 404 },
      );
    }
    let variableDefinitions = [];
    try {
      variableDefinitions = JSON.parse(template.variablesJson);
    } catch {}
    const renderedContent = await renderDocument(
      renderTemplate(template.content, payload.data, variableDefinitions),
    );
    const renderedHeader = template.headerContent
      ? renderTemplate(
          template.headerContent,
          payload.data,
          variableDefinitions,
        )
      : null;
    const renderedFooter = template.footerContent
      ? renderTemplate(
          template.footerContent,
          payload.data,
          variableDefinitions,
        )
      : null;
    const document = await prisma.document.update({
      where: { id },
      data: {
        name: payload.name,
        payloadJson: JSON.stringify(payload.data),
        renderedContent,
        renderedHeader,
        renderedFooter,
        pageNumbers: template.pageNumbers,
      },
      include: { template: { select: { name: true } } },
    });
    return NextResponse.json(document);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: "Invalid document data" },
        { status: 400 },
      );
    }
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
}

export async function DELETE(
  _: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireSession();
    const { id } = await params;
    const document = await prisma.document.findFirst({
      where: { id, organizationId: session.organizationId },
      select: { id: true },
    });
    if (!document) {
      return NextResponse.json(
        { message: "Document not found" },
        { status: 404 },
      );
    }
    await prisma.document.delete({ where: { id } });
    return new NextResponse(null, { status: 204 });
  } catch {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
}
