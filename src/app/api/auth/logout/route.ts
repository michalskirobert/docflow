import { NextResponse } from "next/server";
import { destroySession } from "@/server/auth/session";

export async function POST() {
  await destroySession();
  return NextResponse.json({ ok: true });
}

export async function GET(request: Request) {
  await destroySession();
  return NextResponse.redirect(new URL("/login", request.url));
}
