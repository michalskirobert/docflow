import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { requireSession } from "@/server/auth/require-session";
import { isPlatformAdmin } from "@/server/auth/platform-admin";
import PendingPayments from "@/features/admin/pending-payments";
export default async function Page() {
  const s = await requireSession();
  if (!isPlatformAdmin(s)) redirect("/dashboard");
  return (
    <AppShell>
      <h1>Payment verification</h1>
      <p className="muted">
        Platform-admin view for manually confirming bank transfers.
      </p>
      <PendingPayments />
    </AppShell>
  );
}
