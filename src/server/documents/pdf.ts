import chromium from "@sparticuz/chromium";
import puppeteer from "puppeteer-core";

type PdfInput = {
  content: string;
  header?: string | null;
  footer?: string | null;
  pageNumbers?: boolean;
};

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
      `<!doctype html><html><head><meta charset="utf-8"><style>
      @page{size:A4;margin:20mm}*{box-sizing:border-box}body{margin:0;font-family:Arial,sans-serif;color:#111;line-height:1.55}
      img{max-width:100%}.docflow-rendered-data-table{max-width:100%;overflow:hidden}.docflow-rendered-data-table table,table{width:100%;border-collapse:collapse}td,th{border:1px solid #aeb5c2;padding:8px}
      p{margin:.45em 0}h1{margin:.65em 0 .35em;font-size:32px}h2{font-size:26px}h3{font-size:21px}h4{font-size:18px}h5{font-size:16px}a{color:#4f46e5}
    </style></head><body>${content}</body></html>`,
      { waitUntil: "load" },
    );

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

    const showHeaderFooter = Boolean(header || footer || pageNumbers);
    const pageNumber = pageNumbers
      ? '<span class="pageNumber"></span> / <span class="totalPages"></span>'
      : "";
    return Buffer.from(
      await page.pdf({
        format: "A4",
        printBackground: true,
        preferCSSPageSize: true,
        displayHeaderFooter: showHeaderFooter,
        headerTemplate: `<div style="font-size:9px;width:100%;padding:0 20mm;color:#64748b">${header ?? ""}</div>`,
        footerTemplate: `<div style="font-size:9px;width:100%;padding:0 20mm;color:#64748b;display:flex;justify-content:space-between"><span>${footer ?? ""}</span><span>${pageNumber}</span></div>`,
        margin: showHeaderFooter
          ? { top: "24mm", bottom: "24mm", left: "20mm", right: "20mm" }
          : undefined,
      }),
    );
  } finally {
    await browser.close();
  }
}
