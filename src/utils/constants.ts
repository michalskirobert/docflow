export const APP_VERSION = "1.7.1";
export const FREE_MONTHLY_DOCUMENT_LIMIT = 10;
export const ANNUAL_MONTHLY_DOCUMENT_LIMIT = 100;
export const A4_WIDTH_PX = 794;
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
