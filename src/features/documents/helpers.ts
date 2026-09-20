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
  return "";
}
