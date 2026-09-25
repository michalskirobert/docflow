import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/server/auth/require-session";
import { renderTemplate } from "@/server/documents/template";
import { renderDocument } from "@/server/documents/renderer";
import { createDocumentPdf } from "@/server/documents/pdf";
import {
  getDefaultTemplate,
  isDefaultTemplateId,
} from "@/server/templates/defaults";

export const runtime = "nodejs";

const schema = z.object({
  data: z.record(z.string(), z.union([z.string(), z.number()])),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireSession();
    const { id } = await params;
    const { data } = schema.parse(await req.json());
    const template = isDefaultTemplateId(id)
      ? getDefaultTemplate(id)
      : await prisma.template.findFirst({
          where: { id, organizationId: session.organizationId },
        });
    if (!template)
      return NextResponse.json(
        { message: "Template not found" },
        { status: 404 },
      );
    let variables = [];
    try {
      variables = JSON.parse(template.variablesJson);
    } catch {}
    const content = await renderDocument(
      renderTemplate(template.content, data, variables),
    );
    const header = template.headerContent
      ? renderTemplate(template.headerContent, data, variables)
      : null;
    const footer = template.footerContent
      ? renderTemplate(template.footerContent, data, variables)
      : null;
    const pdf = await createDocumentPdf({
      content,
      header,
      footer,
      pageNumbers: template.pageNumbers,
    });
    return NextResponse.json({
      pdfDataUrl: `data:application/pdf;base64,${pdf.toString("base64")}`,
    });
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof z.ZodError
            ? "Invalid preview data"
            : "Preview failed",
      },
      { status: error instanceof z.ZodError ? 400 : 500 },
    );
  }
}
