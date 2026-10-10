import { TEMPLATE_EDITOR_FONT_FAMILIES } from "@/utils/constants";
import { normalizeDocumentFontHtml } from "@/lib/document-fonts";
import { readFile } from "node:fs/promises";
import path from "node:path";
import chromium from "@sparticuz/chromium";
import puppeteer from "puppeteer-core";

type PdfInput = {
  content: string;
  header?: string | null;
  footer?: string | null;
  pageNumbers?: boolean;
};

const PAGE_SIDE_MARGIN_MM = 20;
const HEADER_REGION_MM = 20;
const FOOTER_REGION_MM = 28;
// A4 contract shared with the physical editor: 20mm header + 249mm body + 28mm footer.
// Do not add a second gap: it changes line wrapping and the page count.
const BODY_REGION_GAP_MM = 0;

// Reuse the editor stylesheet, embedding the exact same local font binaries.
// Chromium print headers have isolated documents and cannot resolve public URLs.
let printStyles: Promise<string> | undefined;
async function getPrintStyles() {
  if (!printStyles)
    printStyles = (async () => {
      const directory = path.join(process.cwd(), "public", "fonts");
      let css = await readFile(path.join(directory, "document.css"), "utf8");
      const files = [
        ...new Set(
          Array.from(
            css.matchAll(/\/fonts\/([A-Za-z0-9-]+\.ttf)/g),
            (match) => match[1],
          ),
        ),
      ];
      for (const file of files) {
        const bytes = await readFile(path.join(directory, file));
        css = css.replaceAll(
          `/fonts/${file}`,
          `data:font/ttf;base64,${bytes.toString("base64")}`,
        );
      }
      return `*{box-sizing:border-box}html,body{margin:0;padding:0}body{font-family:"DejaVu Sans",sans-serif;color:#111827;line-height:1.55}.docflow-rendered-data-table{max-width:100%;overflow:hidden}a{color:#4f46e5}${css}`;
    })().catch((error) => {
      printStyles = undefined;
      throw error;
    });
  return printStyles;
}

async function optimizeRasterImages(
  page: Awaited<
    ReturnType<Awaited<ReturnType<typeof puppeteer.launch>>["newPage"]>
  >,
) {
  await page.evaluate(async () => {
    const images = Array.from(document.images);
    await Promise.all(
      images.map(async (image) => {
        if (!image.src || image.src.startsWith("data:image/svg+xml")) return;
        if (!image.complete)
          await new Promise<void>((resolve) => {
            image.addEventListener("load", () => resolve(), { once: true });
            image.addEventListener("error", () => resolve(), { once: true });
          });
        if (!image.naturalWidth || !image.naturalHeight) return;

        const scale = Math.min(
          1,
          1280 / image.naturalWidth,
          800 / image.naturalHeight,
        );
        const width = Math.max(1, Math.round(image.naturalWidth * scale));
        const height = Math.max(1, Math.round(image.naturalHeight * scale));
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const context = canvas.getContext("2d");
        if (!context) return;
        context.fillStyle = "#ffffff";
        context.fillRect(0, 0, width, height);
        context.drawImage(image, 0, 0, width, height);

        const approximateBytes = (value: string) =>
          Math.ceil((value.length - value.indexOf(",") - 1) * 0.75);
        let quality = 0.68;
        let dataUrl = canvas.toDataURL("image/jpeg", quality);
        while (approximateBytes(dataUrl) > 160 * 1024 && quality > 0.38) {
          quality = Math.max(0.38, quality - 0.06);
          dataUrl = canvas.toDataURL("image/jpeg", quality);
        }
        image.src = dataUrl;
        await image.decode().catch(() => undefined);
      }),
    );
  });
}

export async function createDocumentPdf({
  content,
  header,
  footer,
  pageNumbers,
}: PdfInput) {
  const isVercel = Boolean(process.env.VERCEL);
  const localExecutablePath = process.env.CHROME_EXECUTABLE_PATH;
  const browser = await puppeteer.launch({
    headless: true,
    args: isVercel
      ? chromium.args
      : ["--no-sandbox", "--disable-setuid-sandbox"],
    executablePath: isVercel
      ? await chromium.executablePath()
      : localExecutablePath ||
        "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  });

  try {
    const css = await getPrintStyles();
    const page = await browser.newPage();
    await page.setContent(
      `<!doctype html><html><head><meta charset="utf-8"><style>@page{size:A4;margin:20mm 20mm 28mm}${css}.docflow-print-body{display:flow-root}</style></head><body class="docflow-print-body">${normalizeDocumentFontHtml(content)}</body></html>`,
      { waitUntil: "load" },
    );

    // Fonts can load after the HTML load event. Wait before pagination so
    // Chromium measures the same glyphs that appear in the exported PDF.
    await page.evaluate(
      async (families: string[]) => {
        // Preload families used only in the isolated header/footer as well.
        await Promise.all(
          families.flatMap((family) =>
            [400, 700].flatMap((weight) =>
              ["normal", "italic"].map((style) =>
                document.fonts.load(`${style} ${weight} 16px "${family}"`),
              ),
            ),
          ),
        );
        await document.fonts.ready;
      },
      TEMPLATE_EDITOR_FONT_FAMILIES.map((font) => font.label),
    );
    await optimizeRasterImages(page);

    // Match the editor physical sheet exactly: 20mm header + 249mm body
    // + 28mm footer = 297mm. Only the body paginates.
    const showHeaderFooter = Boolean(
      header?.trim() || footer?.trim() || pageNumbers,
    );

    const pageNumber = pageNumbers
      ? '<span class="pageNumber"></span> / <span class="totalPages"></span>'
      : "";

    // Chromium adds a fixed 20px vertical inset to native page chrome.
    // Compensate it explicitly so the shared physical bounds stay identical.
    const headerTemplate = `<style>${css}</style><div class="document-header" style="width:100%;height:20mm;padding:3mm 20mm;clip-path:inset(3mm 0 3mm 0);overflow:hidden;transform:translateY(-20px)">${normalizeDocumentFontHtml(header ?? "")}</div>`;
    const footerTemplate = `<style>${css}</style><div style="position:relative;width:100%;height:28mm;transform:translateY(20px)"><div class="document-footer" style="height:28mm;padding:3mm 20mm 10mm;clip-path:inset(3mm 0 10mm 0);overflow:hidden">${normalizeDocumentFontHtml(footer ?? "")}</div>${pageNumbers ? `<div style="position:absolute;right:20mm;bottom:7mm;font-size:10px;line-height:normal;color:#64748b">${pageNumber}</div>` : ""}</div>`;

    return Buffer.from(
      await page.pdf({
        format: "A4",
        printBackground: true,
        preferCSSPageSize: true,
        displayHeaderFooter: showHeaderFooter,
        headerTemplate,
        footerTemplate,
        margin: {
          top: `${HEADER_REGION_MM + BODY_REGION_GAP_MM}mm`,
          bottom: `${FOOTER_REGION_MM + BODY_REGION_GAP_MM}mm`,
          left: `${PAGE_SIDE_MARGIN_MM}mm`,
          right: `${PAGE_SIDE_MARGIN_MM}mm`,
        },
      }),
    );
  } finally {
    await browser.close();
  }
}
