"use client";
import { useSearchParams } from "next/navigation";
import { Link } from "@/i18n/navigation";
export default function RegistrationSuccessPage() {
  const email = useSearchParams().get("email") ?? "your email";
  return (
    <main className="auth-page">
      <section className="auth-card">
        <h1>Check your email</h1>
        <p>
          We sent a verification link to <strong>{email}</strong>. Verify the
          address before signing in.
        </p>
        <Link className="btn full" href="/login">
          Go to sign in
        </Link>
      </section>
    </main>
  );
}
