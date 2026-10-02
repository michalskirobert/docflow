import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/server/auth/require-session";

const createSchema = z.object({ name: z.string().trim().min(2).max(60) });

export async function GET() {
  const session = await requireSession();
  return NextResponse.json(
    await prisma.category.findMany({
      where: { organizationId: session.organizationId },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  );
}

export async function POST(request: Request) {
  try {
    const session = await requireSession();
    const { name } = createSchema.parse(await request.json());
    const existing = await prisma.category.findFirst({
      where: {
        organizationId: session.organizationId,
        name: { equals: name, mode: "insensitive" },
      },
      select: { id: true, name: true },
    });
    if (existing) return NextResponse.json(existing);

    return NextResponse.json(
      await prisma.category.create({
        data: { organizationId: session.organizationId, name },
        select: { id: true, name: true },
      }),
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof z.ZodError)
      return NextResponse.json(
        { message: "Invalid category" },
        { status: 400 },
      );
    return NextResponse.json(
      { message: "Could not save category" },
      { status: 500 },
    );
  }
}
