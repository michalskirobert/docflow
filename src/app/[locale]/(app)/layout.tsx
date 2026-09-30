import "@/styles/app.scss";
import type { ReactNode } from "react";
import type { Metadata } from "next";
import { AppShell } from "@/components/layout/app-shell";
import { requireSession } from "@/server/auth/require-session";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function AuthenticatedLayout({
  children,
}: {
  children: ReactNode;
}) {
  await requireSession();

  return <AppShell>{children}</AppShell>;
}
