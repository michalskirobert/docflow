import type { TemplateVariable } from "../types";
export function variableHtml(v: TemplateVariable) {
  if (v.type === "image")
    return `<span class="variable-image-token" contenteditable="false" data-variable="${v.name}" style="display:inline-flex;width:${v.imageWidth ?? 180}px;height:${v.imageHeight ?? 120}px">{{${v.name}}}</span>`;
  return `{{${v.name}}}`;
}
export function upsertVariable(
  list: TemplateVariable[],
  next: TemplateVariable,
) {
  return [...list.filter((v) => v.name !== next.name), next];
}
