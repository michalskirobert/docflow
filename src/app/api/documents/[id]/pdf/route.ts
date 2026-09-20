import { NextResponse } from "next/server";
import puppeteer from "puppeteer";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/server/auth/require-session";

export const runtime = "nodejs";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  const { id } = await params;
  const doc = await prisma.document.findFirst({ where: { id, organizationId: session.organizationId } });
  if (!doc) return new NextResponse("Not found", { status: 404 });

  let browser: Awaited<ReturnType<typeof puppeteer.launch>> | undefined;
  try {
    browser = await puppeteer.launch({ headless: true, args: ["--no-sandbox", "--disable-setuid-sandbox"] });
    const page = await browser.newPage();
    await page.setContent(`<!doctype html><html><head><meta charset="utf-8"><style>@page{size:A4;margin:20mm}*{box-sizing:border-box}body{margin:0;font-family:Arial,sans-serif;color:#111;line-height:1.55}img{max-width:100%;height:auto}table{width:100%;border-collapse:collapse}td,th{border:1px solid #aeb5c2;padding:8px}p{margin:.45em 0}h1{margin:.65em 0 .35em;font-size:32px}h2{font-size:26px}h3{font-size:21px}h4{font-size:18px}h5{font-size:16px}a{color:#4f46e5}</style></head><body>${doc.renderedContent}</body></html>`, { waitUntil: "networkidle0" });
    const pdf = await page.pdf({ format: "A4", printBackground: true, preferCSSPageSize: true });
    const filename = `${doc.name.replace(/[^a-zA-Z0-9._-]+/g, "-") || "document"}.pdf`;
    return new NextResponse(Buffer.from(pdf), { headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="${filename}"`, "Cache-Control": "private, no-store" } });
  } catch (error) {
    console.error("[GET document PDF]", error);
    return NextResponse.json({ code: "PDF_GENERATION_FAILED", message: "Could not generate PDF" }, { status: 500 });
  } finally {
    await browser?.close();
  }
}
