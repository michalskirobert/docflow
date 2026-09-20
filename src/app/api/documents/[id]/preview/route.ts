import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/server/auth/require-session";
export async function GET(
  _: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const s = await requireSession();
  const { id } = await params;
  const doc = await prisma.document.findFirst({
    where: { id, organizationId: s.organizationId },
  });
  if (!doc) return new NextResponse("Not found", { status: 404 });
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(doc.name)}</title><style>@page{size:A4;margin:18mm}body{font-family:Arial,sans-serif;color:#111;max-width:174mm;margin:0 auto;line-height:1.5}img{max-width:100%}table{width:100%;border-collapse:collapse}td,th{border:1px solid #bbb;padding:8px}@media print{.bar{display:none}}.bar{position:fixed;right:20px;top:20px}button{padding:10px 14px;border:0;border-radius:8px;background:#111827;color:#fff;cursor:pointer}</style></head><body><div class="bar"><button onclick="window.print()">Print / Save PDF</button></div>${doc.renderedContent}</body></html>`;
  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Security-Policy":
        "default-src 'self' https: data:; style-src 'unsafe-inline'; script-src 'unsafe-inline'; img-src https: data:;",
    },
  });
}
function escapeHtml(v: string) {
  return v.replace(
    /[&<>"']/g,
    (c) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;",
      })[c]!,
  );
}
