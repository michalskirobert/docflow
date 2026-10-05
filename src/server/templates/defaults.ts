import { EXAMPLE_TEMPLATES } from "./examples";
import { getDefaultTemplateCategory } from "@/features/categories/definitions";

export const DEFAULT_TEMPLATE_PREFIX = "default:";

export type DefaultTemplate = {
  id: string;
  name: string;
  description: string;
  emailSubject: string | null;
  content: string;
  headerContent: null;
  footerContent: null;
  pageNumbers: false;
  variablesJson: string;
  isExample: true;
  category: string;
  createdAt: string;
  updatedAt: string;
};

const epoch = "2000-01-01T00:00:00.000Z";

export const DEFAULT_TEMPLATES: DefaultTemplate[] = EXAMPLE_TEMPLATES.map(
  (template, index) => ({
    id: `${DEFAULT_TEMPLATE_PREFIX}${index}`,
    name: template.name,
    description: template.description,
    emailSubject: "emailSubject" in template ? template.emailSubject : null,
    content: template.content,
    headerContent: null,
    footerContent: null,
    pageNumbers: false,
    variablesJson: JSON.stringify(template.variables),
    isExample: true,
    category: getDefaultTemplateCategory(
      template.name,
      "emailSubject" in template ? template.emailSubject : null,
    ),
    createdAt: epoch,
    updatedAt: epoch,
  }),
);

export const getDefaultTemplate = (id: string) =>
  DEFAULT_TEMPLATES.find((template) => template.id === id) ?? null;
export const isDefaultTemplateId = (id: string) =>
  id.startsWith(DEFAULT_TEMPLATE_PREFIX);

export const inferDefaultTemplateId = (payloadJson: string) => {
  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(payloadJson) as Record<string, unknown>;
  } catch {
    return null;
  }
  const payloadKeys = new Set(Object.keys(payload));
  if (!payloadKeys.size) return null;

  let best: { id: string; score: number; matched: number } | null = null;
  for (const template of DEFAULT_TEMPLATES) {
    let variables: Array<{ name?: string }> = [];
    try {
      variables = JSON.parse(template.variablesJson) as Array<{
        name?: string;
      }>;
    } catch {}
    const names = variables
      .map((variable) => variable.name)
      .filter((name): name is string => Boolean(name));
    if (!names.length) continue;
    const matched = names.filter((name) => payloadKeys.has(name)).length;
    const score = matched / Math.max(names.length, payloadKeys.size);
    if (!best || score > best.score) best = { id: template.id, score, matched };
  }
  return best && best.matched >= 2 && best.score >= 0.6 ? best.id : null;
};
