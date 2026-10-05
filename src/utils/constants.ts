export const APP_VERSION = "1.7.1";
export const FREE_MONTHLY_DOCUMENT_LIMIT = 10;
export const ANNUAL_MONTHLY_DOCUMENT_LIMIT = 100;
export const A4_WIDTH_PX = 794;
export const TEMPLATE_EDITOR_FONT_FAMILIES = [
  { label: "Arial", value: "Arial, Helvetica, sans-serif", aliases: ["Arial", "Helvetica"] },
  { label: "Times New Roman", value: "\'Times New Roman\', Times, serif", aliases: ["Times New Roman", "Times"] },
  { label: "Georgia", value: "Georgia, serif", aliases: ["Georgia"] },
  { label: "Verdana", value: "Verdana, Geneva, sans-serif", aliases: ["Verdana", "Geneva"] },
  { label: "Tahoma", value: "Tahoma, Geneva, sans-serif", aliases: ["Tahoma"] },
  { label: "Trebuchet MS", value: "\'Trebuchet MS\', Arial, sans-serif", aliases: ["Trebuchet MS"] },
  { label: "Courier New", value: "\'Courier New\', Courier, monospace", aliases: ["Courier New", "Courier"] },
] as const;

export const normalizeTemplateEditorFontFamily = (fontFamily: string) => {
  const normalized = fontFamily
    .split(",")
    .map((part) => part.trim().replace(/^['\"]|['\"]$/g, ""))
    .filter(Boolean);

  const match = TEMPLATE_EDITOR_FONT_FAMILIES.find((font) =>
    font.aliases.some((alias) =>
      normalized.some((part) => part.toLowerCase() === alias.toLowerCase()),
    ),
  );

  return match?.value ?? "";
};

export const FONT_SIZES_PX = [
  8, 9, 10, 11, 12, 13, 14, 16, 18, 20, 22, 24, 28, 32, 36, 40, 48, 56, 64, 72,
] as const;
export const MAX_TEMPLATE_IMAGE_BYTES = 2 * 1024 * 1024;
export const SAFE_TEMPLATE_IMAGE_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
] as const;
export const TEMPLATE_VARIABLE_TYPES = [
  "text",
  "date",
  "image",
  "select",
] as const;
export const DOCUMENT_SORT_OPTIONS = [
  "newest",
  "oldest",
  "nameAsc",
  "nameDesc",
] as const;
