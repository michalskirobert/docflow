import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/server/auth/require-session";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireSession();
    const { id } = await params;
    const document = await prisma.salesDocument.findFirst({
      where: {
        id,
        organizationId: session.organizationId,
      },
      select: {
        fileUrl: true,
        number: true,
        type: true,
      },
    });

    if (!document) {
      return NextResponse.json({ message: "Not found" }, { status: 404 });
    }

    if (!document.fileUrl) {
      return NextResponse.json(
        { message: "Invoice file is not available yet" },
        { status: 404 },
      );
    }

    const target = new URL(document.fileUrl, request.url);
    if (!["http:", "https:"].includes(target.protocol)) {
      return NextResponse.json(
        { message: "Invalid file URL" },
        { status: 400 },
      );
    }

    const response = await fetch(target, { cache: "no-store" });
    if (!response.ok || !response.body) {
      return NextResponse.json(
        { message: "Could not download invoice" },
        { status: 502 },
      );
    }

    const filename =
      `${document.type === "RECEIPT" ? "receipt" : "invoice"}-${document.number ?? id}.pdf`.replace(
        /[^a-zA-Z0-9._-]+/g,
        "-",
      );

    return new NextResponse(response.body, {
      headers: {
        "Content-Type":
          response.headers.get("content-type") || "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    console.error("[GET billing invoice download]", error);
    return NextResponse.json(
      { message: "Could not download invoice" },
      { status: 500 },
    );
  }
}
