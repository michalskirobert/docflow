import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/server/auth/require-session";
import { createDocumentPdf } from "@/server/documents/pdf";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await requireSession();
  const { id } = await params;

  const doc = await prisma.document.findFirst({
    where: { id, organizationId: session.organizationId },
  });

  if (!doc) return new NextResponse("Not found", { status: 404 });

  try {
    const pdf = await createDocumentPdf({
      content: doc.renderedContent,
      header: doc.renderedHeader,
      footer: doc.renderedFooter,
      pageNumbers: doc.pageNumbers,
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
      { code: "PDF_GENERATION_FAILED", message: "Could not generate PDF" },
      { status: 500 },
    );
  }
}
