import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { cache } from "react";
import type { SessionUser } from "@/types/auth";

const COOKIE_NAME = "docflow_session";
const PERSISTENT_SECONDS = 60 * 60 * 24 * 30;
const SESSION_EXPIRATION = "12h";

function key() {
  const secret = process.env.AUTH_SECRET;

  if (!secret || secret.length < 32)
    throw new Error("AUTH_SECRET must contain at least 32 characters.");
  return new TextEncoder().encode(secret);
}

export async function createSession(user: SessionUser, rememberMe = false) {
  const token = await new SignJWT(user as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(rememberMe ? "30d" : SESSION_EXPIRATION)
    .sign(key());

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    ...(rememberMe ? { maxAge: PERSISTENT_SECONDS } : {}),
  });
}

export async function destroySession() {
  (await cookies()).delete(COOKIE_NAME);
}

async function readSession(): Promise<SessionUser | null> {
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    return (await jwtVerify(token, key())).payload as unknown as SessionUser;
  } catch {
    return null;
  }
}

// Deduplicate session verification when a page and AppShell request it during the same render.
export const getSession = cache(readSession);
