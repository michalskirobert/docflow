import type { TemplateVariable } from "./types";

export function parseTemplateNumber(value: string | number, variable: TemplateVariable): number {
  if (typeof value === "number") return value;
  let normalized = String(value ?? "").trim().replace(/\u00a0/g, " ");
  const thousands = variable.thousandsSeparator ?? "none";
  if (thousands === "space") normalized = normalized.replace(/\s/g, "");
  else if (thousands !== "none") normalized = normalized.split(thousands).join("");
  const decimal = variable.decimalSeparator ?? ",";
  if (decimal !== ".") normalized = normalized.replace(decimal, ".");
  return Number(normalized);
}

export function formatTemplateNumber(value: number, variable: TemplateVariable): string {
  if (!Number.isFinite(value)) return "";
  const places = Math.max(0, variable.decimalPlaces ?? 0);
  const [integerPart, fractionPart] = Math.abs(value).toFixed(places).split(".");
  const separator = variable.thousandsSeparator ?? "none";
  const grouping = separator === "space" ? " " : separator === "none" ? "" : separator;
  const groupedInteger = grouping
    ? integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, grouping)
    : integerPart;
  const sign = value < 0 ? "-" : "";
  const decimal = variable.decimalSeparator ?? ",";
  return places > 0 ? `${sign}${groupedInteger}${decimal}${fractionPart}` : `${sign}${groupedInteger}`;
}
