import { NextResponse } from "next/server";
import chromium from "@sparticuz/chromium";
import puppeteer from "puppeteer-core";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/server/auth/require-session";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await requireSession();
  const { id } = await params;

  const doc = await prisma.document.findFirst({
    where: {
      id,
      organizationId: session.organizationId,
    },
  });

  if (!doc) {
    return new NextResponse("Not found", { status: 404 });
  }

  let browser: Awaited<ReturnType<typeof puppeteer.launch>> | undefined;

  try {
    const isVercel = Boolean(process.env.VERCEL);
    const localExecutablePath = process.env.CHROME_EXECUTABLE_PATH;

    browser = await puppeteer.launch({
      headless: true,
      args: isVercel
        ? chromium.args
        : ["--no-sandbox", "--disable-setuid-sandbox"],
      executablePath: isVercel
        ? await chromium.executablePath()
        : localExecutablePath ||
          "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    });

    const page = await browser.newPage();

    await page.setContent(
      `<!doctype html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            @page {
              size: A4;
              margin: 20mm;
            }

            * {
              box-sizing: border-box;
            }

            body {
              margin: 0;
              font-family: Arial, sans-serif;
              color: #111;
              line-height: 1.55;
            }

            img {
              max-width: 100%;
            }

            table {
              width: 100%;
              border-collapse: collapse;
            }

            td,
            th {
              border: 1px solid #aeb5c2;
              padding: 8px;
            }

            p {
              margin: 0.45em 0;
            }

            h1 {
              margin: 0.65em 0 0.35em;
              font-size: 32px;
            }

            h2 {
              font-size: 26px;
            }

            h3 {
              font-size: 21px;
            }

            h4 {
              font-size: 18px;
            }

            h5 {
              font-size: 16px;
            }

            a {
              color: #4f46e5;
            }
          </style>
        </head>

        <body>
          ${doc.renderedContent}
        </body>
      </html>`,
      {
        waitUntil: "load",
      },
    );

    const showHeaderFooter = Boolean(
      doc.renderedHeader || doc.renderedFooter || doc.pageNumbers,
    );

    const pageNumber = doc.pageNumbers
      ? `<span class="pageNumber"></span> / <span class="totalPages"></span>`
      : "";

    const headerTemplate = `
      <div
        style="
          font-size: 9px;
          width: 100%;
          padding: 0 20mm;
          color: #64748b;
        "
      >
        ${doc.renderedHeader ?? ""}
      </div>
    `;

    const footerTemplate = `
      <div
        style="
          font-size: 9px;
          width: 100%;
          padding: 0 20mm;
          color: #64748b;
          display: flex;
          justify-content: space-between;
        "
      >
        <span>${doc.renderedFooter ?? ""}</span>
        <span>${pageNumber}</span>
      </div>
    `;

    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      preferCSSPageSize: true,
      displayHeaderFooter: showHeaderFooter,
      headerTemplate,
      footerTemplate,
      margin: showHeaderFooter
        ? {
            top: "24mm",
            bottom: "24mm",
            left: "20mm",
            right: "20mm",
          }
        : undefined,
    });

    const filename = `${
      doc.name.replace(/[^a-zA-Z0-9._-]+/g, "-") || "document"
    }.pdf`;

    return new NextResponse(Buffer.from(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `${
          new URL(request.url).searchParams.get("inline") === "1"
            ? "inline"
            : "attachment"
        }; filename="${filename}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    console.error("[GET document PDF]", error);

    return NextResponse.json(
      {
        code: "PDF_GENERATION_FAILED",
        message: "Could not generate PDF",
      },
      {
        status: 500,
      },
    );
  } finally {
    await browser?.close();
  }
}
