import type { TemplateVariable } from "./types";

export type DataTableColumn = {
  id: string;
  label?: string;
  variableName?: string;
  staticText?: string;
  width?: number;
};

export type DataTableDefinition = {
  columns: DataTableColumn[];
  minRows?: number;
  maxRows?: number;
};

export function isDataTable(variable: TemplateVariable) {
  return variable.type === "dataTable";
}

export function parseTableRows(value: string): Record<string, string>[] {
  if (!value) return [];
  try {
    const rows = JSON.parse(value) as unknown;
    if (!Array.isArray(rows)) return [];
    return rows.map((row) =>
      row && typeof row === "object"
        ? Object.fromEntries(
            Object.entries(row).map(([key, item]) => [
              key,
              item == null ? "" : String(item),
            ]),
          )
        : {},
    );
  } catch {
    return [];
  }
}

export function dataTableHtml(
  variable: TemplateVariable,
  variables: TemplateVariable[],
) {
  const columns = variable.dataTable?.columns ?? [];
  const defs = new Map(variables.map((item) => [item.name, item]));
  const name = variable.name.replace(/[^A-Za-z0-9_-]/g, "");
  const widths = columns.map((column) => Math.max(1, column.width ?? 230));
  const totalWidth = widths.reduce((sum, width) => sum + width, 0) || 1;
  const colgroup = widths
    .map(
      (width) =>
        `<col style="width:${((width / totalWidth) * 100).toFixed(4)}%">`,
    )
    .join("");
  const head = columns
    .map(
      (column) =>
        `<th>${escapeHtml(column.label || (column.variableName ? defs.get(column.variableName)?.label : undefined) || column.variableName || "Column")}</th>`,
    )
    .join("");
  const row = columns
    .map((column) =>
      column.variableName
        ? `<td><span data-table-variable="${escapeAttr(column.variableName)}" contenteditable="false">{{${escapeHtml(column.variableName)}}}</span></td>`
        : `<td><span contenteditable="false">${escapeHtml(column.staticText ?? "")}</span></td>`,
    )
    .join("");
  return `<p class="docflow-table-caret-host"><br></p><div class="docflow-data-table" data-data-table-name="${escapeAttr(name)}" contenteditable="false"><table><colgroup>${colgroup}</colgroup><thead><tr>${head}</tr></thead><tbody><tr>${row}</tr></tbody></table></div><p class="docflow-table-caret-host"><br></p>`;
}

export function ensureDataTableCaretHosts(root: HTMLElement) {
  root
    .querySelectorAll<HTMLElement>(".docflow-data-table[data-data-table-name]")
    .forEach((table) => {
      const previous = table.previousElementSibling;
      if (!previous || previous.tagName !== "P") {
        const before = document.createElement("p");
        before.className = "docflow-table-caret-host";
        before.innerHTML = "<br>";
        table.before(before);
      }

      const next = table.nextElementSibling;
      if (!next || next.tagName !== "P") {
        const after = document.createElement("p");
        after.className = "docflow-table-caret-host";
        after.innerHTML = "<br>";
        table.after(after);
      }
    });
}

function escapeHtml(value: string) {
  return value.replace(
    /[&<>"']/g,
    (char) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        char
      ]!,
  );
}
const escapeAttr = escapeHtml;
