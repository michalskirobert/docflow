import type { TemplateVariable } from "@/features/templates/types";
export function extractVariables(content: string) {
  return [...content.matchAll(/{{\s*([\w.]+)\s*}}/g)]
    .map((m) => m[1])
    .filter((v, i, a) => a.indexOf(v) === i);
}
function escapeHtml(value: unknown) {
  return String(value ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;",
      })[c]!,
  );
}
function safeImage(value: unknown) {
  const v = String(value ?? "");
  return /^data:image\/(png|jpeg|webp|gif);base64,[a-z0-9+/=]+$/i.test(v) ||
    /^https?:\/\//i.test(v)
    ? v
    : "";
}
export function renderTemplate(
  content: string,
  data: Record<string, string | number>,
  variables: TemplateVariable[] = [],
) {
  const defs = new Map(variables.map((v) => [v.name, v]));
  return content.replace(/{{\s*([\w.]+)\s*}}/g, (_, key) => {
    const def = defs.get(key);
    const value = data[key];
    if (def?.type === "image") {
      const src = safeImage(value);
      return src
        ? `<img src="${escapeHtml(src)}" alt="" style="width:${def.imageWidth ?? 180}px;height:${def.imageHeight ?? 120}px;object-fit:contain;max-width:100%"/>`
        : "";
    }
    if (def?.type === "date" && value) {
      const d = new Date(String(value) + "T00:00:00");
      if (!Number.isNaN(d.getTime())) {
        const dd = String(d.getDate()).padStart(2, "0"),
          mm = String(d.getMonth() + 1).padStart(2, "0"),
          yyyy = String(d.getFullYear());
        const fmt = def.dateFormat ?? "DD.MM.YYYY";
        return escapeHtml(
          fmt.replace("DD", dd).replace("MM", mm).replace("YYYY", yyyy),
        );
      }
    }
    return escapeHtml(value ?? `{{${key}}}`);
  });
}
