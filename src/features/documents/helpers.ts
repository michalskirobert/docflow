import type { TemplateVariable } from "@/features/templates/types";
import { parseTemplateNumber } from "@/features/templates/number-format";
export function applyInputMask(value: string, mask?: string) {
  if (!mask) return value;
  const chars = value.replace(/[^a-zA-Z0-9]/g, "").split("");
  let out = "";
  for (const token of mask) {
    if (token === "9") {
      const i = chars.findIndex((c) => /\d/.test(c));
      if (i < 0) break;
      out += chars.splice(i, 1)[0];
    } else if (token === "A") {
      const i = chars.findIndex((c) => /[a-z]/i.test(c));
      if (i < 0) break;
      out += chars.splice(i, 1)[0];
    } else out += token;
  }
  return out;
}
export function parseFormattedNumber(value: string, v: TemplateVariable) {
  const number = parseTemplateNumber(value, v);
  const decimal = v.decimalSeparator ?? ",";
  const cleaned = value.trim().replace(/\u00a0/g, " ").replace(/\s/g, "");
  const decimalIndex = cleaned.lastIndexOf(decimal);
  const normalized = Number.isFinite(number)
    ? decimalIndex >= 0
      ? `${Math.trunc(number)}.${cleaned.slice(decimalIndex + 1).replace(/\D/g, "")}`
      : String(number)
    : cleaned;
  return { normalized, number };
}


export type ValidationTranslator = (
  key: string,
  values?: Record<string, string | number>,
) => string;

export function validateVariable(
  v: TemplateVariable,
  value: string,
  t?: ValidationTranslator,
) {
  const message = (
    key: string,
    fallback: string,
    values?: Record<string, string | number>,
  ) => (t ? t(key, values) : fallback);
  if (v.type === "formula") return "";
  if (v.required && !value.trim()) {
    const customRequired = v.requiredMessage?.trim();
    const localizedDefaults = new Set([
      "This field is required.",
      "To pole jest wymagane.",
      "Kolom ini wajib diisi.",
    ]);
    if (customRequired && !localizedDefaults.has(customRequired)) return customRequired;
    return message("fieldRequired", "This field is required.");
  }
  if (!value) return "";
  if ((v.minLength ?? 0) > 0 && value.length < v.minLength!)
    return message("minimumCharacters", `Minimum ${v.minLength} characters.`, { count: v.minLength! });
  if ((v.maxLength ?? 0) > 0 && value.length > v.maxLength!)
    return message("maximumCharacters", `Maximum ${v.maxLength} characters.`, { count: v.maxLength! });
  if (v.type === "number") {
    const { normalized: normalizedValue, number } = parseFormattedNumber(value, v);
    if (!Number.isFinite(number)) return message("validNumber", "Enter a valid number.");
    if ((v.minNumber ?? 0) > 0 && number < v.minNumber!)
      return message("minimumValue", `Minimum value is ${v.minNumber}.`, { value: v.minNumber! });
    if ((v.maxNumber ?? 0) > 0 && number > v.maxNumber!)
      return message("maximumValue", `Maximum value is ${v.maxNumber}.`, { value: v.maxNumber! });
    if ((v.decimalPlaces ?? 0) > 0) {
      const decimals = (normalizedValue.split(".")[1] ?? "").length;
      if (decimals > v.decimalPlaces!)
        return message("maximumDecimalPlaces", `Maximum ${v.decimalPlaces} decimal places.`, { count: v.decimalPlaces! });
    }
  }
  if (["date", "datetime"].includes(v.type)) {
    if (v.minDate && value < v.minDate)
      return message("dateMin", `Date must be on or after ${v.minDate}.`, { date: v.minDate });
    if (v.maxDate && value > v.maxDate)
      return message("dateMax", `Date must be on or before ${v.maxDate}.`, { date: v.maxDate });
  }
  return "";
}
