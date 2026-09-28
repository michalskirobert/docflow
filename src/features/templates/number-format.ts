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

export function getTemplateNumberDecimalPlaces(
  variable: TemplateVariable,
): number {
  const numberFormat = variable.numberFormat ?? "number";

  if (numberFormat === "quantity") return 0;

  if (numberFormat === "currency" && variable.currency) {
    try {
      return (
        new Intl.NumberFormat(variable.numberLocale || "pl-PL", {
          style: "currency",
          currency: variable.currency,
        }).resolvedOptions().maximumFractionDigits ?? 2
      );
    } catch {
      return 2;
    }
  }

  return Math.max(0, variable.decimalPlaces ?? 0);
}

export function formatTemplateNumber(
  value: number,
  variable: TemplateVariable,
): string {
  if (!Number.isFinite(value)) return "";

  const places = getTemplateNumberDecimalPlaces(variable);
  const numberFormat = variable.numberFormat ?? "number";
  const locale = variable.numberLocale || "pl-PL";

  try {
    if (numberFormat === "currency" && variable.currency) {
      return new Intl.NumberFormat(locale, {
        style: "currency",
        currency: variable.currency,
      }).format(value);
    }

    const decimalSeparator = variable.decimalSeparator ?? ",";
    const thousandsSeparator = variable.thousandsSeparator ?? "none";
    const [integerPart, fractionPart] = value.toFixed(places).split(".");
    const groupingCharacter =
      thousandsSeparator === "space" ? " " : thousandsSeparator;
    const groupedInteger =
      groupingCharacter && groupingCharacter !== "none"
        ? integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, groupingCharacter)
        : integerPart;
    const formatted = fractionPart
      ? `${groupedInteger}${decimalSeparator}${fractionPart}`
      : groupedInteger;

    if (numberFormat === "percentage") return `${formatted}%`;
    if (["measure", "quantity"].includes(numberFormat) && variable.unit) {
      return `${formatted} ${variable.unit}`;
    }
    return formatted;
  } catch {
    return value.toFixed(places);
  }
}
