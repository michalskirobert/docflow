export const APP_VERSION = "1.7.1";
export const FREE_MONTHLY_DOCUMENT_LIMIT = 10;
export const ANNUAL_MONTHLY_DOCUMENT_LIMIT = 100;
export const A4_WIDTH_PX = 794;
export const TEMPLATE_EDITOR_FONT_FAMILIES = [
  {
    label: "Carlito",
    value: "'Carlito', sans-serif",
    aliases: ["Carlito"],
  },
  {
    label: "Liberation Sans",
    value: "'Liberation Sans', sans-serif",
    aliases: ["Liberation Sans"],
  },
  {
    label: "Roboto",
    value: "'Roboto', sans-serif",
    aliases: ["Roboto"],
  },
  {
    label: "Open Sans",
    value: "'Open Sans', sans-serif",
    aliases: ["Open Sans"],
  },
  {
    label: "Source Sans 3",
    value: "'Source Sans 3', sans-serif",
    aliases: ["Source Sans 3"],
  },
  {
    label: "Caladea",
    value: "'Caladea', serif",
    aliases: ["Caladea"],
  },
  {
    label: "Liberation Serif",
    value: "'Liberation Serif', serif",
    aliases: ["Liberation Serif"],
  },
  {
    label: "Gelasio",
    value: "'Gelasio', serif",
    aliases: ["Gelasio"],
  },
  {
    label: "Liberation Mono",
    value: "'Liberation Mono', monospace",
    aliases: ["Liberation Mono"],
  },
  {
    label: "DejaVu Sans",
    value: "'DejaVu Sans', sans-serif",
    aliases: ["DejaVu Sans"],
  },
  {
    label: "DejaVu Serif",
    value: "'DejaVu Serif', serif",
    aliases: ["DejaVu Serif"],
  },
  {
    label: "DejaVu Sans Mono",
    value: "'DejaVu Sans Mono', monospace",
    aliases: ["DejaVu Sans Mono"],
  },
] as const;

export const normalizeTemplateEditorFontFamily = (fontFamily: string) => {
  const families = fontFamily
    .split(",")
    .map((part) => part.trim().replace(/^['\"]|['\"]$/g, ""));
  // Match the first actual family before looking at its fallbacks.
  for (const family of families) {
    const match = TEMPLATE_EDITOR_FONT_FAMILIES.find((font) =>
      font.aliases.some(
        (alias) => alias.toLowerCase() === family.toLowerCase(),
      ),
    );
    if (match) return match.value;
  }
  return "";
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
