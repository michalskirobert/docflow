import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/server/auth/require-session";
import { getSubscriptionAccess } from "@/server/subscription/access";
import { renderTemplate } from "@/server/documents/template";
import {
  getDefaultTemplate,
  isDefaultTemplateId,
} from "@/server/templates/defaults";
import { renderDocument } from "@/server/documents/renderer";
const schema = z.object({
  templateId: z.string(),
  name: z.string().min(2),
  data: z.record(z.string(), z.union([z.string(), z.number()])),
});
export async function GET(req: Request) {
  try {
    const s = await requireSession();
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q")?.trim() ?? "";
    const sort = searchParams.get("sort") ?? "newest";
    const orderBy =
      sort === "oldest"
        ? { createdAt: "asc" as const }
        : sort === "nameAsc"
          ? { name: "asc" as const }
          : sort === "nameDesc"
            ? { name: "desc" as const }
            : { createdAt: "desc" as const };
    return NextResponse.json(
      await prisma.document.findMany({
        where: {
          organizationId: s.organizationId,
          ...(q
            ? {
                OR: [
                  { name: { contains: q, mode: "insensitive" as const } },
                  {
                    template: {
                      is: {
                        name: { contains: q, mode: "insensitive" as const },
                      },
                    },
                  },
                ],
              }
            : {}),
        },
        select: {
          id: true,
          name: true,
          templateId: true,
          createdAt: true,
          template: { select: { name: true } },
        },
        orderBy,
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
        {
          code:
            access.reason === "monthly_document_limit_reached"
              ? "MONTHLY_DOCUMENT_LIMIT_REACHED"
              : "SUBSCRIPTION_REQUIRED",
          message:
            access.reason === "monthly_document_limit_reached"
              ? "Monthly document limit reached"
              : "Subscription required",
          access,
        },
        { status: 402 },
      );
    const p = schema.parse(await req.json());
    const t = isDefaultTemplateId(p.templateId)
      ? getDefaultTemplate(p.templateId)
      : await prisma.template.findFirst({
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
    const doc = await prisma.$transaction(async (tx) => {
      const subscription = await tx.subscription.findUnique({
        where: { organizationId: s.organizationId },
        select: { monthlyDocumentLimit: true },
      });
      const limit = subscription?.monthlyDocumentLimit ?? 0;

      if (!s.subscriptionExempt && limit > 0) {
        const start = new Date();
        start.setDate(1);
        start.setHours(0, 0, 0, 0);
        const used = await tx.document.count({
          where: {
            organizationId: s.organizationId,
            createdAt: { gte: start },
          },
        });
        if (used >= limit) throw new Error("MONTHLY_DOCUMENT_LIMIT_REACHED");
      }

      return tx.document.create({
        data: {
          organizationId: s.organizationId,
          templateId: isDefaultTemplateId(p.templateId) ? null : t.id,
          name: p.name,
          payloadJson: JSON.stringify(p.data),
          renderedContent: rendered,
          renderedHeader,
          renderedFooter,
          pageNumbers: t.pageNumbers,
        },
      });
    }, { isolationLevel: "Serializable" });
    return NextResponse.json(doc, { status: 201 });
  } catch (e) {
    if (e instanceof Error && e.message === "MONTHLY_DOCUMENT_LIMIT_REACHED") {
      return NextResponse.json(
        {
          code: "MONTHLY_DOCUMENT_LIMIT_REACHED",
          message: "Monthly document limit reached",
        },
        { status: 402 },
      );
    }
    return NextResponse.json(
      {
        message:
          e instanceof z.ZodError ? "Invalid document data" : "Unauthorized",
      },
      { status: e instanceof z.ZodError ? 400 : 401 },
    );
  }
}
