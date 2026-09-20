import type { TemplateVariable } from "@/features/templates/types";

export function extractVariables(content: string) {
  const tokenNames = [...content.matchAll(/{{\s*([\w.]+)\s*}}/g)].map(
    (match) => match[1],
  );
  const imageNames = [
    ...content.matchAll(
      /<img\b[^>]*data-variable-name=["']([\w.]+)["'][^>]*data-variable-type=["']image["'][^>]*>/gi,
    ),
  ].map((match) => match[1]);
  return [...new Set([...tokenNames, ...imageNames])];
}

function escapeHtml(value: unknown) {
  return String(value ?? "").replace(
    /[&<>"']/g,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;",
      })[character]!,
  );
}

function escapeAttribute(value: unknown) {
  return escapeHtml(value);
}
function safeImage(value: unknown) {
  const image = String(value ?? "");
  return /^data:image\/(png|jpeg|webp|gif);base64,[a-z0-9+/=]+$/i.test(image) ||
    /^https?:\/\//i.test(image)
    ? image
    : "";
}

function replaceImagePlaceholders(
  content: string,
  data: Record<string, string | number>,
) {
  return content.replace(
    /<img\b([^>]*data-variable-name=["']([\w.]+)["'][^>]*data-variable-type=["']image["'][^>]*)>/gi,
    (full, attributes: string, key: string) => {
      const src = safeImage(data[key]);
      if (!src) return "";
      const withoutSrc = attributes.replace(/\s+src=(?:"[^"]*"|'[^']*')/i, "");
      const withoutSelected = withoutSrc.replace(
        /\s+data-selected=(?:"[^"]*"|'[^']*')/gi,
        "",
      );
      return `<img${withoutSelected} src="${escapeAttribute(src)}">`;
    },
  );
}

export function renderTemplate(
  content: string,
  data: Record<string, string | number>,
  variables: TemplateVariable[] = [],
) {
  const defs = new Map(variables.map((variable) => [variable.name, variable]));
  const withImages = replaceImagePlaceholders(content, data).replace(
    /<span\b[^>]*data-variable-label=["'][^"']+["'][^>]*>[\s\S]*?<\/span>/gi,
    "",
  );
  return withImages.replace(/{{\s*([\w.]+)\s*}}/g, (_, key) => {
    const def = defs.get(key),
      value = data[key];
    if (def?.type === "image") return "";
    if (def && ["date", "datetime", "time"].includes(def.type) && value) {
      const raw = String(value);
      if (def.type === "time") {
        const [hh = "00", mm = "00", ss = "00"] = raw.split(":");
        const format = def.dateFormat ?? "HH:mm";
        return escapeHtml(
          format.replace("HH", hh).replace("mm", mm).replace("ss", ss),
        );
      }
      const date = new Date(def.type === "date" ? `${raw}T00:00:00` : raw);
      if (!Number.isNaN(date.getTime())) {
        const dd = String(date.getDate()).padStart(2, "0"),
          mm = String(date.getMonth() + 1).padStart(2, "0"),
          yyyy = String(date.getFullYear()),
          hh = String(date.getHours()).padStart(2, "0"),
          min = String(date.getMinutes()).padStart(2, "0"),
          format =
            def.dateFormat ??
            (def.type === "datetime" ? "DD.MM.YYYY HH:mm" : "DD.MM.YYYY");
        return escapeHtml(
          format
            .replace("DD", dd)
            .replace("MM", mm)
            .replace("YYYY", yyyy)
            .replace("HH", hh)
            .replace("mm", min),
        );
      }
    }
    return escapeHtml(value ?? `{{${key}}}`);
  });
}
