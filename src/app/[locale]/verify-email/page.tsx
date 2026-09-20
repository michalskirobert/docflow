"use client";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { api } from "@/lib/axios";
import { Link } from "@/i18n/navigation";
export default function VerifyEmailPage() {
  const params = useSearchParams();
  const [state, setState] = useState<"loading" | "ok" | "error">("loading");
  useEffect(() => {
    const token = params.get("token");
    if (!token) {
      setState("error");
      return;
    }
    api
      .post("/auth/verify-email", { token })
      .then(() => setState("ok"))
      .catch(() => setState("error"));
  }, [params]);
  return (
    <main className="auth-page">
      <section className="auth-card">
        <h1>
          {state === "loading"
            ? "Verifying…"
            : state === "ok"
              ? "Email verified"
              : "Verification failed"}
        </h1>
        <p>
          {state === "ok"
            ? "Your account is ready. You can sign in now."
            : state === "error"
              ? "The link is invalid or expired."
              : "Please wait."}
        </p>
        {state !== "loading" && (
          <Link className="btn full" href="/login">
            Sign in
          </Link>
        )}
      </section>
    </main>
  );
}
