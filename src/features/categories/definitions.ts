export const SYSTEM_CATEGORY_KEYS = [
  "GENERAL",
  "CONTRACTS",
  "INVOICES",
  "EMAIL",
  "HR",
  "FINANCE",
  "SALES",
  "CORRESPONDENCE",
  "OTHER",
] as const;

export type SystemCategoryKey = (typeof SYSTEM_CATEGORY_KEYS)[number];
export const DEFAULT_CATEGORY = "system:GENERAL";

export const systemCategoryValue = (key: SystemCategoryKey) => `system:${key}`;

export const getDefaultTemplateCategory = (
  name: string,
  emailSubject?: string | null,
) => {
  const value = name.toLocaleLowerCase("pl");
  if (emailSubject || value.includes("email") || value.includes("e-mail"))
    return "system:EMAIL";
  if (value.includes("faktur")) return "system:INVOICES";
  if (
    value.includes("cv") ||
    value.includes("pracę") ||
    value.includes("prace")
  )
    return "system:HR";
  if (value.includes("umow")) return "system:CONTRACTS";
  return DEFAULT_CATEGORY;
};
