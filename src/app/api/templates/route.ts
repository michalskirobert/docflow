import { NextResponse } from "next/server";
import { z } from "zod";
import { validateCalculation } from "@/features/templates/calculations";
import type { TemplateVariable } from "@/features/templates/types";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/server/auth/session";
import { extractVariables } from "@/server/documents/template";
import { sanitizeTemplateHtml } from "@/server/documents/sanitize-template";
import { DEFAULT_TEMPLATES } from "@/server/templates/defaults";
const schema = z.object({
  name: z.string().min(2).max(250),
  category: z.string().min(1).max(100).default("system:GENERAL"),
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
          "formula",
          "dataTable",
        ]),
        formula: z.string().max(500).optional(),
        calculation: z
          .discriminatedUnion("mode", [
            z.object({ mode: z.literal("formula") }),
            z.object({
              mode: z.literal("fields"),
              operation: z.enum(["sum", "avg", "min", "max", "count"]),
              sourceVariableNames: z.array(z.string()).min(1),
            }),
            z.object({
              mode: z.literal("repeated"),
              operation: z.enum(["sum", "avg", "min", "max", "count"]),
              dataTableName: z.string(),
              sourceVariableName: z.string(),
            }),
          ])
          .optional(),
        dataTable: z
          .object({
            columns: z.array(
              z.object({
                id: z.string(),
                label: z.string().max(120).optional(),
                variableName: z.string().optional(),
                staticText: z.string().max(500).optional(),
                width: z.number().min(80).optional(),
              }),
            ),
            minRows: z.number().int().nonnegative().optional(),
            maxRows: z.number().int().positive().optional(),
          })
          .optional(),
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
    const source = searchParams.get("source") ?? "all";
    const dateFrom = searchParams.get("dateFrom") ?? "";
    const dateTo = searchParams.get("dateTo") ?? "";
    const category = searchParams.get("category") ?? "all";
    const orderBy =
      sort === "oldest"
        ? { createdAt: "asc" as const }
        : sort === "nameAsc"
          ? { name: "asc" as const }
          : sort === "nameDesc"
            ? { name: "desc" as const }
            : { createdAt: "desc" as const };
    const picker = searchParams.get("view") === "picker";
    const savedTemplates =
      source === "default"
        ? []
        : await prisma.template.findMany({
            where: {
              organizationId: s.organizationId,
              ...(dateFrom || dateTo
                ? {
                    createdAt: {
                      ...(dateFrom
                        ? { gte: new Date(`${dateFrom}T00:00:00.000Z`) }
                        : {}),
                      ...(dateTo
                        ? { lte: new Date(`${dateTo}T23:59:59.999Z`) }
                        : {}),
                    },
                  }
                : {}),
              ...(category !== "all" ? { category } : {}),
              ...(q
                ? {
                    OR: [
                      { name: { contains: q, mode: "insensitive" as const } },
                      {
                        description: {
                          contains: q,
                          mode: "insensitive" as const,
                        },
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
                  category: true,
                  variablesJson: true,
                  createdAt: true,
                }
              : {
                  id: true,
                  name: true,
                  description: true,
                  category: true,
                  variablesJson: true,
                  isExample: true,
                  createdAt: true,
                },
            orderBy,
          });
    const savedNames = new Set(savedTemplates.map((template) => template.name));
    const defaults =
      source === "own"
        ? []
        : DEFAULT_TEMPLATES.filter(
            (template) =>
              !savedNames.has(template.name) &&
              (category === "all" || template.category === category) &&
              (!dateFrom ||
                new Date(template.createdAt) >=
                  new Date(`${dateFrom}T00:00:00.000Z`)) &&
              (!dateTo ||
                new Date(template.createdAt) <=
                  new Date(`${dateTo}T23:59:59.999Z`)) &&
              (!q ||
                `${template.name} ${template.description}`
                  .toLocaleLowerCase()
                  .includes(q.toLocaleLowerCase())),
          ).map((template) =>
            picker
              ? {
                  id: template.id,
                  name: template.name,
                  description: template.description,
                  emailSubject: template.emailSubject,
                  category: template.category,
                  variablesJson: template.variablesJson,
                  createdAt: template.createdAt,
                }
              : {
                  id: template.id,
                  name: template.name,
                  description: template.description,
                  category: template.category,
                  variablesJson: template.variablesJson,
                  isExample: true,
                  createdAt: template.createdAt,
                },
          );
    const result = [...defaults, ...savedTemplates].sort((a, b) => {
      if (sort === "nameAsc") return a.name.localeCompare(b.name);
      if (sort === "nameDesc") return b.name.localeCompare(a.name);
      if (sort === "categoryAsc")
        return (
          a.category.localeCompare(b.category) || a.name.localeCompare(b.name)
        );
      if (sort === "categoryDesc")
        return (
          b.category.localeCompare(a.category) || a.name.localeCompare(b.name)
        );
      if (sort === "typeDefaultFirst" || sort === "typeOwnFirst") {
        const aDefault = a.id.startsWith("default:") ? 0 : 1;
        const bDefault = b.id.startsWith("default:") ? 0 : 1;
        const delta = aDefault - bDefault;
        return (
          (sort === "typeDefaultFirst" ? delta : -delta) ||
          a.name.localeCompare(b.name)
        );
      }
      const delta =
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      return sort === "oldest" ? delta : -delta;
    });
    return NextResponse.json(result);
  } catch (error) {
    console.error("GET /api/templates failed", error);
    return NextResponse.json(
      { message: "Could not load templates" },
      { status: 500 },
    );
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
    for (const variable of variableDefinitions) {
      if (variable.type !== "formula") continue;
      const error = validateCalculation(
        variable as TemplateVariable,
        variableDefinitions as TemplateVariable[],
      );
      if (error) return NextResponse.json({ message: error }, { status: 400 });
    }
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
