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
const PAGE_NUMBER_LANE_MM = 10;
// A4 contract shared with the physical editor: 20mm header + 249mm body + 28mm footer.
// Do not add a second gap: it changes line wrapping and the page count.
const BODY_REGION_GAP_MM = 0;

const documentCss = `
  *{box-sizing:border-box}
  html,body{margin:0;padding:0}
  body{font-family:Arial,sans-serif;color:#111;line-height:1.55}
  img{max-width:100%}
  .docflow-rendered-data-table{max-width:100%;overflow:hidden}
  .docflow-rendered-data-table table,table{width:100%;border-collapse:collapse}
  td,th{border:1px solid #aeb5c2;padding:8px;white-space:normal;word-break:normal;overflow-wrap:anywhere}
  p{margin:.45em 0}
  h1{margin:.65em 0 .35em;font-size:32px}
  h2{font-size:26px}h3{font-size:21px}h4{font-size:18px}h5{font-size:16px}
  a{color:#4f46e5}
`;

const chromeRegionCss = `
  *{box-sizing:border-box}
  html,body{margin:0;padding:0;color:#111827;background:transparent}
  body{font-family:Arial,sans-serif;font-size:11px;line-height:1.55}
  img{max-width:100%}
  table{width:100%;border-collapse:collapse}
  p{margin:.45em 0}
  .document-header{font-size:16px}
  .document-header > :is(p,h1,h2,h3,h4,h5,blockquote){margin-block:0}
  .document-header h1{font-size:32px}
  .document-header h2{font-size:24px}
  .document-header h3{font-size:18.72px}
  .document-header h4{font-size:16px}
  .document-header h5{font-size:13.28px}
`;

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
    const page = await browser.newPage();
    await page.setContent(
      `<!doctype html><html><head><meta charset="utf-8"><style>@page{size:A4}${documentCss}</style></head><body>${content}</body></html>`,
      { waitUntil: "load" },
    );

    // Fonts can load after the HTML load event. Wait before pagination so
    // Chromium measures the same glyphs that appear in the exported PDF.
    await page.evaluate(() => document.fonts.ready.then(() => undefined));
    await optimizeRasterImages(page);

    // Match the editor physical sheet exactly: 20mm header + 249mm body
    // + 28mm footer = 297mm. Only the body paginates.
    const hasHeader = Boolean(header?.trim());
    const hasFooter = Boolean(footer?.trim());
    const showHeaderFooter = hasHeader || hasFooter || Boolean(pageNumbers);

    const pageNumber = pageNumbers
      ? '<span class="pageNumber"></span> / <span class="totalPages"></span>'
      : "";

    const headerTemplate = `<style>${chromeRegionCss}</style><div class="document-header" style="width:100%;height:${HEADER_REGION_MM}mm;padding:6mm ${PAGE_SIDE_MARGIN_MM}mm 3mm;overflow:hidden">${header ?? ""}</div>`;
    const footerTemplate = `<style>${chromeRegionCss}</style><div style="position:relative;width:100%;height:${FOOTER_REGION_MM}mm;padding:3mm ${PAGE_SIDE_MARGIN_MM}mm ${PAGE_NUMBER_LANE_MM}mm;overflow:hidden"><div style="max-height:${FOOTER_REGION_MM - PAGE_NUMBER_LANE_MM - 3}mm;overflow:hidden">${footer ?? ""}</div>${pageNumbers ? `<div style="position:absolute;right:${PAGE_SIDE_MARGIN_MM}mm;bottom:7mm;font-size:10px;line-height:1">${pageNumber}</div>` : ""}</div>`;

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
