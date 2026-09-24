import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/server/auth/require-session";
import { renderTemplate } from "@/server/documents/template";

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
    const template = await prisma.template.findFirst({
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
    const body = renderTemplate(template.content, data, variables);
    const header = template.headerContent
      ? renderTemplate(template.headerContent, data, variables)
      : "";
    const footer = template.footerContent
      ? renderTemplate(template.footerContent, data, variables)
      : "";
    const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>*{box-sizing:border-box}html,body{margin:0;background:#e5e7eb;font-family:Arial,sans-serif;color:#111}.sheet{width:210mm;min-height:297mm;margin:0 auto;background:#fff;padding:20mm;box-shadow:0 1px 4px #0002}.header{margin-bottom:10mm}.footer{margin-top:10mm}img{max-width:100%;height:auto}table{max-width:100%;border-collapse:collapse}@media(max-width:850px){.sheet{transform-origin:top left}} </style></head><body><main class="sheet">${header ? `<header class="header">${header}</header>` : ""}${body}${footer ? `<footer class="footer">${footer}</footer>` : ""}</main></body></html>`;
    return NextResponse.json({ html });
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof z.ZodError ? "Invalid preview data" : "Unauthorized",
      },
      { status: error instanceof z.ZodError ? 400 : 401 },
    );
  }
}
