import { createHmac, timingSafeEqual } from "node:crypto";

const TTL_SECONDS = 5 * 60;

type Payload = {
  a: number;
  b: number;
  exp: number;
};

function secret(): string {
  const value = process.env.CAPTCHA_SECRET;

  if (!value || value.length < 32) {
    throw new Error("CAPTCHA_SECRET must contain at least 32 characters.");
  }

  return value;
}

function sign(encoded: string): string {
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

  const signature = sign(encoded);

  return {
    question: `${a} + ${b} = ?`,
    token: `${encoded}.${signature}`,
    expiresInSeconds: TTL_SECONDS,
  };
}

export function verifyCaptcha(token: string, answer: string): boolean {
  try {
    const [encoded, signature] = token.split(".");

    if (!encoded || !signature) {
      return false;
    }

    const expectedSignature = sign(encoded);

    if (signature.length !== expectedSignature.length) {
      return false;
    }

    const signatureValid = timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature),
    );

    if (!signatureValid) {
      return false;
    }

    const payload = JSON.parse(
      Buffer.from(encoded, "base64url").toString("utf8"),
    ) as Payload;

    const now = Math.floor(Date.now() / 1000);

    if (payload.exp < now) {
      return false;
    }

    const numericAnswer = Number(answer.trim());

    if (!Number.isFinite(numericAnswer)) {
      return false;
    }

    return numericAnswer === payload.a + payload.b;
  } catch {
    return false;
  }
}
