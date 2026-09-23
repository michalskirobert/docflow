import { redirect } from "next/navigation";

import { AppProvider } from "@/contexts/app-context";
import { getSession } from "@/server/auth/session";

import { Footer } from "./footer";
import { Sidebar } from "./sidebar";

export async function AppShell({ children }: { children: React.ReactNode }) {
  const user = await getSession();

  if (!user) {
    redirect("/login");
  }

  return (
    <AppProvider user={user}>
      <div className="shell">
        <Sidebar />
        <div className="content-column">
          <main className="main">{children}</main>
          <Footer />
        </div>
      </div>
    </AppProvider>
  );
}
