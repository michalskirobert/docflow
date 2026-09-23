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

    const html = renderTemplate(template.content, parsed.data, variables);
    const subject = renderTextTemplate(
      parsed.subject !== undefined
        ? parsed.subject.trim()
        : template.emailSubject?.trim() || template.name,
      parsed.data,
    );

    return NextResponse.json({
      subject,
      html,
      text: htmlToPlainText(html),
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
