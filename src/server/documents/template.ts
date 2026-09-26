import type { TemplateVariable } from "@/features/templates/types";
import { resolveCalculatedValues } from "./calculations";
import { formatTemplateNumber } from "@/features/templates/number-format";
import { parseTableRows } from "@/features/templates/data-table";

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

function renderDataTableMarkup(
  table: TemplateVariable,
  data: Record<string, string | number>,
  variables: TemplateVariable[],
) {
  const defs = new Map(variables.map((variable) => [variable.name, variable]));
  const columns = table.dataTable?.columns ?? [];
  const rows = parseTableRows(String(data[table.name] ?? "[]"));
  const widths = columns.map((column) => Math.max(1, column.width ?? 230));
  const totalWidth = widths.reduce((sum, width) => sum + width, 0) || 1;
  const colgroup = widths
    .map(
      (width) =>
        `<col style="width:${((width / totalWidth) * 100).toFixed(4)}%">`,
    )
    .join("");
  const header = columns
    .map(
      (column) =>
        `<th style="padding:8px 10px;border:1px solid #d1d5db;background:#f3f4f6;color:#111827;font-weight:600;text-align:left;vertical-align:top;white-space:normal;word-break:normal;overflow-wrap:normal">${escapeHtml(column.label || (column.variableName ? defs.get(column.variableName)?.label : undefined) || column.variableName || "Column")}</th>`,
    )
    .join("");
  const body = rows
    .map((row) => {
      let resolved: Record<string, string | number> = { ...data, ...row };
      try {
        resolved = resolveCalculatedValues(
          variables.filter((variable) => variable.type !== "dataTable"),
          resolved,
        );
      } catch {}
      const cells = columns
        .map((column) => {
          if (!column.variableName)
            return `<td style="padding:8px 10px;border:1px solid #d1d5db;background:#fff;color:#111827;vertical-align:top;white-space:normal;word-break:normal;overflow-wrap:normal">${escapeHtml(column.staticText ?? "")}</td>`;
          const def = defs.get(column.variableName);
          const raw = resolved[column.variableName] ?? "";
          const value =
            def?.type === "formula" && typeof raw === "number"
              ? formatTemplateNumber(raw, def)
              : raw;
          return `<td style="padding:8px 10px;border:1px solid #d1d5db;background:#fff;color:#111827;vertical-align:top;white-space:normal;word-break:normal;overflow-wrap:normal">${escapeHtml(value)}</td>`;
        })
        .join("");
      return `<tr>${cells}</tr>`;
    })
    .join("");
  const empty =
    rows.length === 0
      ? `<tr><td colspan="${Math.max(1, columns.length)}" style="height:120px;padding:24px;border:1px solid #d1d5db;background:#fff;text-align:center;vertical-align:middle;color:#64748b">No data</td></tr>`
      : "";
  return `<div class="docflow-rendered-data-table" style="width:100%;background:#fff;color:#111827"><table style="width:100%;border-collapse:collapse;table-layout:fixed;background:#fff;color:#111827"><colgroup>${colgroup}</colgroup><thead><tr>${header}</tr></thead><tbody>${body || empty}</tbody></table></div>`;
}

function renderDataTables(
  content: string,
  data: Record<string, string | number>,
  variables: TemplateVariable[],
) {
  const defs = new Map(variables.map((variable) => [variable.name, variable]));
  let rendered = content.replace(
    /<div\b[^>]*data-data-table-name=["']([\w-]+)["'][^>]*>[\s\S]*?<\/div>/gi,
    (_full, name: string) => {
      const table = defs.get(name);
      return table?.type === "dataTable"
        ? renderDataTableMarkup(table, data, variables)
        : "";
    },
  );
  for (const table of variables.filter(
    (variable) => variable.type === "dataTable",
  )) {
    const token = new RegExp(
      `{{\\s*${table.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*}}`,
      "g",
    );
    rendered = rendered.replace(
      token,
      renderDataTableMarkup(table, data, variables),
    );
  }
  return rendered;
}

export function renderTemplate(
  content: string,
  data: Record<string, string | number>,
  variables: TemplateVariable[] = [],
) {
  const defs = new Map(variables.map((variable) => [variable.name, variable]));
  const resolvedData = resolveCalculatedValues(variables, data);
  const withTables = renderDataTables(content, resolvedData, variables);
  const withImages = replaceImagePlaceholders(withTables, resolvedData).replace(
    /<span\b[^>]*data-variable-label=["'][^"']+["'][^>]*>[\s\S]*?<\/span>/gi,
    "",
  );
  return withImages.replace(/{{\s*([\w.]+)\s*}}/g, (_, key) => {
    const def = defs.get(key),
      value = resolvedData[key];
    if (def?.type === "image") return "";
    if (def?.type === "formula" && typeof value === "number") {
      return escapeHtml(formatTemplateNumber(value, def));
    }
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

export function renderTextTemplate(
  content: string,
  data: Record<string, string | number>,
) {
  return content.replace(/{{\s*([\w.]+)\s*}}/g, (_, key) =>
    String(data[key] ?? `{{${key}}}`),
  );
}
