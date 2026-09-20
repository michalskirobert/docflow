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
export async function GET() {
  try {
    const s = await requireSession();
    return NextResponse.json(
      await prisma.template.findMany({
        where: { organizationId: s.organizationId },
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
    const parsed = schema.parse(await req.json());
    const p = { ...parsed, content: sanitizeTemplateHtml(parsed.content) };
    return NextResponse.json(
      await prisma.template.create({
        data: {
          ...p,
          organizationId: s.organizationId,
          variablesJson: JSON.stringify(extractVariables(p.content)),
        },
      }),
      { status: 201 },
    );
  } catch (e) {
    return NextResponse.json(
      {
        message: e instanceof z.ZodError ? "Invalid template" : "Unauthorized",
      },
      { status: e instanceof z.ZodError ? 400 : 401 },
    );
  }
}
