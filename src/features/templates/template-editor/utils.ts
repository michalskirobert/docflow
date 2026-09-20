import type { TemplateVariable } from "../types";
export type ImageAlign = "inline" | "left" | "center" | "right";
export type ImageFit = "contain" | "cover" | "fill";
export function escapeHtmlAttribute(value: string) {
  return value.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
}
export function imageStyle(
  width: string | number,
  align: ImageAlign,
  height?: number | string,
  fit: ImageFit = "contain",
) {
  const w = Math.max(32, Math.min(1200, Number(width) || 240));
  const h =
    height && Number(height) > 0
      ? Math.max(32, Math.min(1600, Number(height)))
      : undefined;
  const size = [
    `width:${w}px`,
    `max-width:100%`,
    h ? `height:${h}px` : "height:auto",
    `object-fit:${fit}`,
  ];
  if (align === "left")
    return [...size, "float:left", "margin:0 16px 10px 0"].join(";");
  if (align === "right")
    return [...size, "float:right", "margin:0 0 10px 16px"].join(";");
  if (align === "inline")
    return [
      ...size,
      "display:inline-block",
      "vertical-align:middle",
      "margin:4px 8px",
    ].join(";");
  return [...size, "display:block", "margin:8px auto"].join(";");
}
const PLACEHOLDER =
  "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==";
export function variableHtml(v: TemplateVariable) {
  if (v.type !== "image") return `{{${v.name}}}`;
  const n = escapeHtmlAttribute(v.name),
    fit = v.imageFit ?? "contain";
  return `<img draggable="true" src="${PLACEHOLDER}" alt="{{${n}}}" title="{{${n}}}" data-variable-name="${n}" data-variable-type="image" data-image-fit="${fit}" contenteditable="false" style="${imageStyle(v.imageWidth ?? 180, v.imageAlign ?? "center", v.imageHeight, fit)}" /><span class="variable-image-name" data-variable-label="${n}" contenteditable="false">{{${n}}}</span>&nbsp;`;
}
export function upsertVariable(
  list: TemplateVariable[],
  next: TemplateVariable,
) {
  return [...list.filter((v) => v.name !== next.name), next];
}
export function getImageAlign(i: HTMLImageElement): ImageAlign {
  if (i.style.float === "left") return "left";
  if (i.style.float === "right") return "right";
  if (i.style.display === "inline-block") return "inline";
  return "center";
}
export function getImageFit(i: HTMLImageElement): ImageFit {
  return (i.dataset.imageFit || i.style.objectFit || "contain") as ImageFit;
}
export function safeHttpUrl(raw: string) {
  try {
    const u = new URL(raw);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}
export function safeRasterImageUrl(raw: string) {
  try {
    const u = new URL(raw);
    return (
      (u.protocol === "http:" || u.protocol === "https:") &&
      /\.(png|jpe?g|webp|gif)$/i.test(u.pathname)
    );
  } catch {
    return false;
  }
}
