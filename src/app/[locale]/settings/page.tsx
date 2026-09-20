import { AppShell } from "@/components/layout/app-shell";
import SettingsPanel from "@/features/settings/SettingsPanel";
export default function Page() {
  return (
    <AppShell>
      <div className="page-heading">
        <h1>Settings</h1>
        <p className="muted">Account, billing, invoices and preferences.</p>
      </div>
      <SettingsPanel />
    </AppShell>
  );
}
