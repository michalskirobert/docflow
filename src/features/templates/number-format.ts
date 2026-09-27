import type { TemplateVariable } from "./types";

export function parseTemplateNumber(
  value: string | number,
  variable: TemplateVariable,
): number {
  if (typeof value === "number") return value;

  let normalized = String(value ?? "")
    .trim()
    .replace(/\u00a0/g, " ")
    .replace(/[^0-9,.'+\-\s]/g, "")
    .replace(/\s/g, "");

  if (!normalized) return Number.NaN;

  const configuredDecimal = variable.decimalSeparator ?? ",";
  const lastComma = normalized.lastIndexOf(",");
  const lastDot = normalized.lastIndexOf(".");
  let decimalSeparator: "," | "." | null = null;

  if (lastComma >= 0 && lastDot >= 0) {
    decimalSeparator = lastComma > lastDot ? "," : ".";
  } else if (lastComma >= 0 || lastDot >= 0) {
    const separator = lastComma >= 0 ? "," : ".";
    const index = separator === "," ? lastComma : lastDot;
    const fractionLength = normalized.length - index - 1;
    const occurrences = normalized.split(separator).length - 1;

    if (
      separator === configuredDecimal ||
      (occurrences === 1 && fractionLength !== 3)
    ) {
      decimalSeparator = separator;
    }
  }

  if (decimalSeparator) {
    const thousandsSeparator = decimalSeparator === "," ? "." : ",";
    normalized = normalized.split(thousandsSeparator).join("");
    const decimalIndex = normalized.lastIndexOf(decimalSeparator);
    normalized =
      normalized.slice(0, decimalIndex).split(decimalSeparator).join("") +
      "." +
      normalized.slice(decimalIndex + 1);
  } else {
    normalized = normalized.replace(/[.,]/g, "");
  }

  return Number(normalized);
}

export function formatTemplateNumber(
  value: number,
  variable: TemplateVariable,
): string {
  if (!Number.isFinite(value)) return "";
  const places = Math.max(0, variable.decimalPlaces ?? 0);
  const [integerPart, fractionPart] = Math.abs(value)
    .toFixed(places)
    .split(".");
  const separator = variable.thousandsSeparator ?? "none";
  const grouping =
    separator === "space" ? " " : separator === "none" ? "" : separator;
  const groupedInteger = grouping
    ? integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, grouping)
    : integerPart;
  const sign = value < 0 ? "-" : "";
  const decimal = variable.decimalSeparator ?? ",";
  const formatted =
    places > 0
      ? `${sign}${groupedInteger}${decimal}${fractionPart}`
      : `${sign}${groupedInteger}`;
  const numberFormat = variable.numberFormat ?? "number";
  if (numberFormat === "currency" && variable.currency)
    return `${formatted} ${variable.currency}`;
  if (numberFormat === "percentage") return `${formatted}%`;
  if (numberFormat === "measure" && variable.unit)
    return `${formatted} ${variable.unit}`;
  return formatted;
}
