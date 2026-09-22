const MAX_SOURCE_BYTES = 20 * 1024 * 1024;
const MAX_OUTPUT_BYTES = 2 * 1024 * 1024;
const MAX_DIMENSION = 1800;

export const TEMPLATE_IMAGE_ACCEPT =
  "image/*,.jpg,.jpeg,.png,.webp,.gif,.heic,.heif,.jxl";

export const SUPPORTED_TEMPLATE_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/heic",
  "image/heif",
  "image/jxl",
]);

export function normalizedImageType(file: File) {
  const extension = file.name.split(".").pop()?.toLowerCase();
  const declaredType = file.type.toLowerCase();
  // Prefer a known extension for HEIC/HEIF/JXL because Chromium/macOS can
  // report these files as application/octet-stream or another generic MIME.
  if (extension === "heic") return "image/heic";
  if (extension === "heif") return "image/heif";
  if (extension === "jxl") return "image/jxl";
  if (extension === "jpg" || extension === "jpeg") return "image/jpeg";
  if (extension === "png") return "image/png";
  if (extension === "webp") return "image/webp";
  if (extension === "gif") return "image/gif";
  if (SUPPORTED_TEMPLATE_IMAGE_TYPES.has(declaredType)) return declaredType;
  return "";
}

function loadHtmlImage(source: Blob) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const url = URL.createObjectURL(source);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("IMAGE_DECODE_FAILED"));
    };
    image.src = url;
  });
}

async function decodeHeic(file: File) {
  // Chromium/Brave can let the user select HEIC while still being unable to decode it.
  // heic2any performs the decode in the browser, after which the normal WebP pipeline
  // below handles resize/compression. Nothing HEIC-specific is persisted in the template.
  const { default: heic2any } = await import("heic2any");
  const converted = await heic2any({
    blob: file,
    toType: "image/jpeg",
    quality: 0.94,
  });
  return Array.isArray(converted) ? converted[0] : converted;
}

async function drawSourceToCanvas(file: File, type: string) {
  const source =
    type === "image/heic" || type === "image/heif"
      ? await decodeHeic(file)
      : file;
  const image = await loadHtmlImage(source);
  return {
    source: image,
    width: image.naturalWidth,
    height: image.naturalHeight,
  };
}

function canvasBlob(canvas: HTMLCanvasElement, quality: number) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) =>
        blob ? resolve(blob) : reject(new Error("IMAGE_ENCODE_FAILED")),
      "image/webp",
      quality,
    );
  });
}

export async function optimizeTemplateImage(file: File): Promise<File> {
  const type = normalizedImageType(file);
  if (!SUPPORTED_TEMPLATE_IMAGE_TYPES.has(type)) {
    throw new Error("IMAGE_TYPE_UNSUPPORTED");
  }
  if (file.size > MAX_SOURCE_BYTES) {
    throw new Error("IMAGE_SOURCE_TOO_LARGE");
  }

  // Keep animated GIFs intact. Rasterising them would silently remove animation.
  if (type === "image/gif") {
    if (file.size > MAX_OUTPUT_BYTES) throw new Error("IMAGE_OUTPUT_TOO_LARGE");
    return file;
  }

  const decoded = await drawSourceToCanvas(file, type);
  const scale = Math.min(
    1,
    MAX_DIMENSION / Math.max(decoded.width, decoded.height),
  );
  const width = Math.max(1, Math.round(decoded.width * scale));
  const height = Math.max(1, Math.round(decoded.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("IMAGE_CANVAS_UNAVAILABLE");
  context.drawImage(decoded.source, 0, 0, width, height);

  let quality = 0.84;
  let blob = await canvasBlob(canvas, quality);
  while (blob.size > MAX_OUTPUT_BYTES && quality > 0.5) {
    quality -= 0.08;
    blob = await canvasBlob(canvas, quality);
  }
  if (blob.size > MAX_OUTPUT_BYTES) throw new Error("IMAGE_OUTPUT_TOO_LARGE");

  const base = file.name.replace(/\.[^.]+$/, "") || "image";
  return new File([blob], `${base}.webp`, {
    type: "image/webp",
    lastModified: Date.now(),
  });
}

export function hasValidImageSignature(type: string, bytes: Uint8Array) {
  const ascii = (start: number, end: number) =>
    String.fromCharCode(...bytes.slice(start, end));

  switch (type) {
    case "image/png":
      return (
        bytes[0] === 0x89 &&
        bytes[1] === 0x50 &&
        bytes[2] === 0x4e &&
        bytes[3] === 0x47
      );
    case "image/jpeg":
      return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
    case "image/gif":
      return ["GIF87a", "GIF89a"].includes(ascii(0, 6));
    case "image/webp":
      return ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP";
    case "image/heic":
    case "image/heif": {
      if (ascii(4, 8) !== "ftyp") return false;
      return ["heic", "heix", "hevc", "hevx", "mif1", "msf1"].includes(
        ascii(8, 12),
      );
    }
    case "image/jxl":
      return (
        (bytes[0] === 0xff && bytes[1] === 0x0a) ||
        (bytes[0] === 0x00 &&
          bytes[1] === 0x00 &&
          bytes[2] === 0x00 &&
          bytes[3] === 0x0c &&
          ascii(4, 8) === "JXL " &&
          bytes[8] === 0x0d &&
          bytes[9] === 0x0a &&
          bytes[10] === 0x87 &&
          bytes[11] === 0x0a)
      );
    default:
      return false;
  }
}
