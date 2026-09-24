import type { TemplateVariable } from "../types";

export type ImageAlign = "inline" | "left" | "center" | "right";
export type ImageFit = "contain" | "cover" | "fill";

export function escapeHtmlAttribute(value: string) {
  return value.replace(
    /[&<>"']/g,
    (c) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[c]!,
  );
}

function escapeXml(value: string) {
  return value.replace(
    /[&<>"']/g,
    (c) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&apos;",
      })[c]!,
  );
}

export function createImageVariablePlaceholder(name: string): string {
  const escapedName = escapeXml(name);

  const svg = `
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="240"
      height="160"
      viewBox="0 0 240 160"
    >
      <rect
        x="1"
        y="1"
        width="238"
        height="158"
        rx="10"
        fill="#f8fafc"
        stroke="#cbd5e1"
        stroke-width="2"
        stroke-dasharray="6 5"
      />

      <g
        transform="translate(92 34)"
        fill="none"
        stroke="#94a3b8"
        stroke-width="2.5"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <rect
          x="0"
          y="0"
          width="56"
          height="46"
          rx="5"
        />

        <circle
          cx="17"
          cy="14"
          r="5"
        />

        <path d="M6 38l14-14 10 10 7-7 13 11" />
      </g>

      <text
        x="120"
        y="108"
        text-anchor="middle"
        font-family="Arial, Helvetica, sans-serif"
        font-size="14"
        font-weight="600"
        fill="#475569"
      >{{${escapedName}}}</text>

      <text
        x="120"
        y="130"
        text-anchor="middle"
        font-family="Arial, Helvetica, sans-serif"
        font-size="11"
        fill="#94a3b8"
      >Image variable</text>
    </svg>
  `.trim();

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

export const IMAGE_VARIABLE_PLACEHOLDER =
  createImageVariablePlaceholder("image");

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
    "max-width:100%",
    h ? `height:${h}px` : "height:auto",
    `object-fit:${fit}`,
  ];

  if (align === "left") {
    return [...size, "float:left", "margin:0 16px 10px 0"].join(";");
  }

  if (align === "right") {
    return [...size, "float:right", "margin:0 0 10px 16px"].join(";");
  }

  if (align === "inline") {
    return [
      ...size,
      "display:inline-block",
      "vertical-align:middle",
      "margin:4px 8px",
    ].join(";");
  }

  return [...size, "display:block", "margin:8px auto"].join(";");
}

export function variableHtml(v: TemplateVariable) {
  if (v.type !== "image") {
    const styles = [
      v.fontSize ? `font-size:${v.fontSize}px` : "",
      v.bold ? "font-weight:700" : "",
      v.italic ? "font-style:italic" : "",
      v.underline ? "text-decoration:underline" : "",
      v.color ? `color:${v.color}` : "",
    ]
      .filter(Boolean)
      .join(";");
    const name = escapeHtmlAttribute(v.name);
    return `<span data-variable-name="${name}" data-variable-type="value" contenteditable="false"${styles ? ` style="${styles}"` : ""}>{{${name}}}</span>`;
  }

  const name = escapeHtmlAttribute(v.name);
  const fit = v.imageFit ?? "contain";
  const placeholder = createImageVariablePlaceholder(v.name);

  return `<img draggable="true" src="${placeholder}" alt="" title="{{${name}}}" data-variable-name="${name}" data-variable-type="image" data-image-fit="${fit}" contenteditable="false" style="${imageStyle(
    v.imageWidth ?? 180,
    v.imageAlign ?? "center",
    v.imageHeight,
    fit,
  )}" />&nbsp;`;
}

export function upsertVariable(
  list: TemplateVariable[],
  next: TemplateVariable,
  previousName = next.name,
) {
  const index = list.findIndex((v) => v.name === previousName);

  if (index < 0) {
    return [...list, next];
  }

  return list.map((variable, currentIndex) =>
    currentIndex === index ? next : variable,
  );
}

export function normalizeEditorVariableImages(region: HTMLElement | null) {
  if (!region) {
    return;
  }

  region
    .querySelectorAll<HTMLImageElement>(
      'img[data-variable-type="image"][data-variable-name]',
    )
    .forEach((image) => {
      const name = image.dataset.variableName ?? "image";
      const placeholder = createImageVariablePlaceholder(name);

      if (image.getAttribute("src") !== placeholder) {
        image.setAttribute("src", placeholder);
      }

      image.draggable = true;
      image.alt = "";
      image.title = `{{${name}}}`;

      const labels = Array.from(
        region.querySelectorAll<HTMLElement>(
          `[data-variable-label="${CSS.escape(name)}"]`,
        ),
      );

      labels.forEach((label) => label.remove());
    });
}

export function removePlacedImage(image: HTMLImageElement) {
  const name = image.dataset.variableName;
  const next = image.nextElementSibling as HTMLElement | null;

  if (name && next?.dataset.variableLabel === name) {
    next.remove();
  }

  image.remove();
}

export function getImageAlign(image: HTMLImageElement): ImageAlign {
  if (image.style.float === "left") {
    return "left";
  }

  if (image.style.float === "right") {
    return "right";
  }

  if (image.style.display === "inline-block") {
    return "inline";
  }

  return "center";
}

export function getImageFit(image: HTMLImageElement): ImageFit {
  return (image.dataset.imageFit ||
    image.style.objectFit ||
    "contain") as ImageFit;
}

export function safeHttpUrl(raw: string) {
  try {
    const url = new URL(raw);

    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function safeRasterImageUrl(raw: string) {
  try {
    const url = new URL(raw);

    return (
      (url.protocol === "http:" || url.protocol === "https:") &&
      /\.(png|jpe?g|webp|gif)$/i.test(url.pathname)
    );
  } catch {
    return false;
  }
}
