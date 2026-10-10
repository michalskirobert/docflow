import { normalizeTemplateEditorFontFamily } from "@/utils/constants";

/** Migrate only font attributes; never alter the document's text. */
export function normalizeDocumentFontHtml(html: string) {
  return html
    .replace(/style=(["'])(.*?)\1/gi, (attribute, quote, style) => {
      const migrated = style.replace(
        /(font-family\s*:\s*)([^;]+)/gi,
        (_: string, property: string, family: string) => {
          const normalized = normalizeTemplateEditorFontFamily(
            family.replace(/&quot;|&#34;/g, '"').replace(/&#39;|&apos;/g, "'"),
          );
          return (
            property +
            (normalized ? normalized.replace(/'/g, "&quot;") : family)
          );
        },
      );
      return `style=${quote}${migrated}${quote}`;
    })
    .replace(/face=(["'])(.*?)\1/gi, (attribute, quote, family) => {
      const normalized = normalizeTemplateEditorFontFamily(family);
      return normalized
        ? `face=${quote}${normalized.replace(/'/g, "&quot;")}${quote}`
        : attribute;
    });
}
