import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/server/auth/require-session";
import {
  renderTemplate,
  renderTextTemplate,
} from "@/server/documents/template";

const schema = z.object({
  subject: z.string().max(250).optional(),
  data: z.record(z.string(), z.union([z.string(), z.number()])).optional(),
});
const strip = (html: string) =>
  html
    .replace(/<br\s*\/?\s*>/gi, "\n")
    .replace(/<\/(p|div|h[1-6]|li|tr)>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#039;/gi, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
const safe = (html: string) =>
  html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(
      /<img\b([^>]*)>/gi,
      (_m, a: string) =>
        `<img${a.replace(/\s(width|height)=(?:"[^"]*"|'[^']*')/gi, "")} style="max-width:100%;height:auto;display:block">`,
    );
const section = (html: string, kind: "header" | "body" | "footer") =>
  !html.trim()
    ? ""
    : `<tr><td style="padding:${kind === "body" ? "28px 32px" : "22px 32px"};${kind === "header" ? "border-bottom:1px solid #e5e7eb;" : kind === "footer" ? "border-top:1px solid #e5e7eb;" : ""}color:#111827;background:#fff;overflow-wrap:anywhere">${safe(html)}</td></tr>`;
const build = (h: string, b: string, f: string) =>
  `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;padding:24px 12px;background:#f3f4f6;color:#111827;font-family:Arial,Helvetica,sans-serif"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;border-collapse:collapse;background:#f3f4f6"><tr><td align="center" style="padding:0"><table role="presentation" width="680" cellspacing="0" cellpadding="0" border="0" style="width:100%;max-width:680px;border-collapse:separate;background:#fff;border:1px solid #e5e7eb;border-radius:14px;overflow:hidden">${section(h, "header")}${section(b, "body")}${section(f, "footer")}</table></td></tr></table></body></html>`;

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireSession();
    const { id } = await params;
    const parsed = schema.parse(await req.json());
    const doc = await prisma.document.findFirst({
      where: { id, organizationId: session.organizationId },
      include: { template: true },
    });
    if (!doc)
      return NextResponse.json(
        { message: "Document not found" },
        { status: 404 },
      );
    let savedData: Record<string, string | number> = {};
    try {
      savedData = JSON.parse(doc.payloadJson);
    } catch {}
    const data = parsed.data ? { ...savedData, ...parsed.data } : savedData;
    const subject = renderTextTemplate(
      parsed.subject?.trim() || doc.template?.emailSubject?.trim() || doc.name,
      data,
    );
    let h = doc.renderedHeader ?? "",
      b = doc.renderedContent,
      f = doc.renderedFooter ?? "";
    if (parsed.data && doc.template) {
      let variables = [];
      try {
        variables = JSON.parse(doc.template.variablesJson);
      } catch {}
      b = renderTemplate(doc.template.content, data, variables);
      h = doc.template.headerContent
        ? renderTemplate(doc.template.headerContent, data, variables)
        : "";
      f = doc.template.footerContent
        ? renderTemplate(doc.template.footerContent, data, variables)
        : "";
    }
    return NextResponse.json({
      subject,
      html: build(h, b, f),
      text: strip([h, b, f].filter(Boolean).join("\n")),
    });
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof z.ZodError ? "Invalid email data" : "Unauthorized",
      },
      { status: error instanceof z.ZodError ? 400 : 401 },
    );
  }
}
