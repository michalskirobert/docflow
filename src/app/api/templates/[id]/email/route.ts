import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/server/auth/require-session";
import {
  renderTemplate,
  renderTextTemplate,
} from "@/server/documents/template";

const schema = z.object({
  data: z.record(z.string(), z.union([z.string(), z.number()])),
  subject: z.string().max(250).optional(),
});

function htmlToPlainText(html: string) {
  return html
    .replace(/<br\s*\/?\s*>/gi, "\n")
    .replace(/<\/(p|div|h[1-6]|li|tr)>/gi, "\n")
    .replace(/<li\b[^>]*>/gi, "• ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#039;/gi, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function mergeInlineStyle(attributes: string, additions: string) {
  const styleMatch = attributes.match(/\sstyle=(?:"([^"]*)"|'([^']*)')/i);
  if (!styleMatch) return `${attributes} style="${additions}"`;
  const current = styleMatch[1] ?? styleMatch[2] ?? "";
  return attributes.replace(styleMatch[0], ` style="${current};${additions}"`);
}

function makeEmailSafe(html: string) {
  return html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<img\b([^>]*)>/gi, (_match, attributes: string) => {
      const cleaned = attributes
        .replace(/\sstyle=(?:"([^"]*)"|'([^']*)')/i, (styleMatch) =>
          styleMatch
            .replace(/float\s*:[^;"']+;?/gi, "")
            .replace(/position\s*:\s*(absolute|fixed)[^;"']*;?/gi, ""),
        )
        .replace(/\s(width|height)=(?:"[^"]*"|'[^']*')/gi, "");
      return `<img${mergeInlineStyle(cleaned, "max-width:100%;height:auto;display:block;float:none;position:static")}>`;
    });
}

function emailSection(content: string, kind: "header" | "body" | "footer") {
  if (!content.trim()) return "";
  const padding = kind === "body" ? "24px" : "16px 24px";
  const border =
    kind === "header"
      ? "border-bottom:1px solid #e5e7eb;"
      : kind === "footer"
        ? "border-top:1px solid #e5e7eb;"
        : "";
  return `<tr><td style="${padding};${border}color:#111827;background:#ffffff;overflow-wrap:anywhere">${makeEmailSafe(content)}</td></tr>`;
}

function buildEmailHtml(header: string, body: string, footer: string) {
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;padding:0;background:#f3f4f6;color:#111827;font-family:Arial,Helvetica,sans-serif"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;border-collapse:collapse;background:#f3f4f6"><tr><td align="center" style="padding:24px 12px"><table role="presentation" width="680" cellspacing="0" cellpadding="0" border="0" style="width:100%;max-width:680px;border-collapse:separate;background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden">${emailSection(header, "header")}${emailSection(body, "body")}${emailSection(footer, "footer")}</table></td></tr></table></body></html>`;
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireSession();
    const { id } = await params;
    const parsed = schema.parse(await req.json());
    const template = await prisma.template.findFirst({
      where: { id, organizationId: session.organizationId },
    });

    if (!template) {
      return NextResponse.json(
        { message: "Template not found" },
        { status: 404 },
      );
    }

    let variables = [];
    try {
      variables = JSON.parse(template.variablesJson);
    } catch {}

    const body = renderTemplate(template.content, parsed.data, variables);
    const header = template.headerContent
      ? renderTemplate(template.headerContent, parsed.data, variables)
      : "";
    const footer = template.footerContent
      ? renderTemplate(template.footerContent, parsed.data, variables)
      : "";
    const html = buildEmailHtml(header, body, footer);
    const subject = renderTextTemplate(
      parsed.subject !== undefined
        ? parsed.subject.trim()
        : template.emailSubject?.trim() || template.name,
      parsed.data,
    );

    return NextResponse.json({
      subject,
      html,
      text: htmlToPlainText([header, body, footer].filter(Boolean).join("\n")),
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
