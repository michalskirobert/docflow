import { NextResponse } from "next/server";
import { createCaptchaChallenge } from "@/server/captcha/challenge";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(createCaptchaChallenge(), {
    headers: { "Cache-Control": "no-store, max-age=0" },
  });
}
