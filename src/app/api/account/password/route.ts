import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { passwordSchema } from "@/features/settings/schema";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/server/auth/require-session";
export async function POST(request: Request) {
  try {
    const s = await requireSession();
    const parsed = passwordSchema.safeParse(await request.json());
    if (!parsed.success)
      return NextResponse.json(
        { code: "VALIDATION_ERROR", issues: parsed.error.flatten() },
        { status: 400 },
      );
    const user = await prisma.user.findUniqueOrThrow({
      where: { id: s.id },
      select: { passwordHash: true },
    });
    if (!(await bcrypt.compare(parsed.data.currentPassword, user.passwordHash)))
      return NextResponse.json(
        { code: "INVALID_CURRENT_PASSWORD" },
        { status: 400 },
      );
    await prisma.user.update({
      where: { id: s.id },
      data: { passwordHash: await bcrypt.hash(parsed.data.newPassword, 12) },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[POST account/password]", error);
    return NextResponse.json(
      { message: "Could not change password" },
      { status: 500 },
    );
  }
}
