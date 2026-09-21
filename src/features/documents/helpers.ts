import type { TemplateVariable } from "@/features/templates/types";
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
export function validateVariable(v: TemplateVariable, value: string) {
  if (v.required && !value.trim())
    return v.requiredMessage || "This field is required.";
  if (!value) return "";
  if ((v.minLength ?? 0) > 0 && value.length < v.minLength!)
    return `Minimum ${v.minLength} characters.`;
  if ((v.maxLength ?? 0) > 0 && value.length > v.maxLength!)
    return `Maximum ${v.maxLength} characters.`;
  if (v.type === "number") {
    const normalizedValue = value.replace(",", ".");
    const number = Number(normalizedValue);
    if (!Number.isFinite(number)) return "Enter a valid number.";
    if ((v.minNumber ?? 0) > 0 && number < v.minNumber!)
      return `Minimum value is ${v.minNumber}.`;
    if ((v.maxNumber ?? 0) > 0 && number > v.maxNumber!)
      return `Maximum value is ${v.maxNumber}.`;
    if ((v.decimalPlaces ?? 0) > 0) {
      const decimals = (normalizedValue.split(".")[1] ?? "").length;
      if (decimals > v.decimalPlaces!)
        return `Maximum ${v.decimalPlaces} decimal places.`;
    }
  }
  if (["date", "datetime"].includes(v.type)) {
    if (v.minDate && value < v.minDate)
      return `Date must be on or after ${v.minDate}.`;
    if (v.maxDate && value > v.maxDate)
      return `Date must be on or before ${v.maxDate}.`;
  }
  return "";
}
