import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { requireSession } from "@/server/auth/require-session";

const schema = z.object({ locale: z.enum(["pl", "en", "id"]) });

export async function PATCH(request: Request) {
  try {
    const session = await requireSession();
    const body = schema.parse(await request.json());

    await prisma.user.update({
      where: { id: session.id },
      data: { locale: body.locale },
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
}
