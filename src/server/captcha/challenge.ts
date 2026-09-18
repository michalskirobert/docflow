import { createHmac, timingSafeEqual } from "node:crypto";

const TTL_SECONDS = 5 * 60;

type Payload = { a: number; b: number; exp: number };

function secret() {
  const value = process.env.CAPTCHA_SECRET;
  if (!value || value.length < 32)
    throw new Error("CAPTCHA_SECRET must contain at least 32 characters.");
  return value;
}

function sign(encoded: string) {
  return createHmac("sha256", secret()).update(encoded).digest("base64url");
}

export function createCaptchaChallenge() {
  const a = Math.floor(Math.random() * 8) + 2;
  const b = Math.floor(Math.random() * 8) + 2;
  const payload: Payload = {
    a,
    b,
    exp: Math.floor(Date.now() / 1000) + TTL_SECONDS,
  };
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return {
    question: `${a} + ${b} = ?`,
    token: `${encoded}.${sign(encoded)}`,
    expiresInSeconds: TTL_SECONDS,
  };
}

export function verifyCaptcha(token: string, answer: string) {
  try {
    const [encoded, signature] = token.split(".");
    if (!encoded || !signature) return false;
    const expected = sign(encoded);
    if (
      signature.length !== expected.length ||
      !timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
    )
      return false;
    const payload = JSON.parse(
      Buffer.from(encoded, "base64url").toString(),
    ) as Payload;
    if (payload.exp < Math.floor(Date.now() / 1000)) return false;
    return Number(answer) === payload.a + payload.b;
  } catch {
    return false;
  }
}
