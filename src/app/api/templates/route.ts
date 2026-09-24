import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/server/auth/session";
import { extractVariables } from "@/server/documents/template";
import { sanitizeTemplateHtml } from "@/server/documents/sanitize-template";
const schema = z.object({
  name: z.string().min(2).max(250),
  description: z.string().max(400).optional(),
  emailSubject: z.string().max(250).optional(),
  content: z.string().min(1),
  headerContent: z.string().optional(),
  footerContent: z.string().optional(),
  pageNumbers: z.boolean().optional(),
  variables: z
    .array(
      z.object({
        name: z.string(),
        label: z.string().optional(),
        placeholder: z.string().max(180).optional(),
        tooltip: z.string().max(300).optional(),
        type: z.enum([
          "text",
          "number",
          "date",
          "datetime",
          "time",
          "image",
          "select",
        ]),
        required: z.boolean().optional(),
        requiredMessage: z.string().optional(),
        mask: z.string().optional(),
        minLength: z.number().int().nonnegative().optional(),
        maxLength: z.number().int().nonnegative().optional(),
        minNumber: z.number().optional(),
        maxNumber: z.number().optional(),
        minDate: z.string().optional(),
        maxDate: z.string().optional(),
        defaultValue: z.string().optional(),
        defaultValueMode: z.enum(["fixed", "current"]).optional(),
        locked: z.boolean().optional(),
        decimalPlaces: z.number().int().min(0).max(12).optional(),
        decimalSeparator: z.enum([".", ","]).optional(),
        thousandsSeparator: z.enum(["none", ".", ",", "space"]).optional(),
        fontSize: z.number().min(8).max(96).optional(),
        bold: z.boolean().optional(),
        italic: z.boolean().optional(),
        underline: z.boolean().optional(),
        color: z
          .string()
          .regex(/^#[0-9a-fA-F]{6}$/)
          .optional(),
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
export async function GET(req: Request) {
  try {
    const s = await getSession();
    if (!s)
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
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
    const picker = searchParams.get("view") === "picker";
    return NextResponse.json(
      await prisma.template.findMany({
        where: {
          organizationId: s.organizationId,
          ...(q
            ? {
                OR: [
                  { name: { contains: q, mode: "insensitive" as const } },
                  {
                    description: { contains: q, mode: "insensitive" as const },
                  },
                ],
              }
            : {}),
        },
        select: picker
          ? {
              id: true,
              name: true,
              description: true,
              emailSubject: true,
              variablesJson: true,
              createdAt: true,
            }
          : {
              id: true,
              name: true,
              description: true,
              variablesJson: true,
              isExample: true,
              createdAt: true,
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
    const s = await getSession();
    if (!s)
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
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
    return NextResponse.json(
      await prisma.template.create({
        data: {
          ...templateData,
          organizationId: s.organizationId,
          variablesJson: JSON.stringify(variableDefinitions),
        },
      }),
      { status: 201 },
    );
  } catch (e) {
    if (e instanceof z.ZodError)
      return NextResponse.json(
        { message: "Invalid template" },
        { status: 400 },
      );
    console.error("[POST template]", e);
    return NextResponse.json(
      { message: "Could not create template" },
      { status: 500 },
    );
  }
}
