"use client";

import {
  FileText,
  LayoutDashboard,
  Layers,
  LogOut,
  Settings,
} from "lucide-react";
import { useTranslations } from "next-intl";

import { api } from "@/lib/axios";
import { Link, usePathname, useRouter } from "@/i18n/navigation";

const links = [
  { href: "/dashboard", key: "dashboard", icon: LayoutDashboard },
  { href: "/templates", key: "templates", icon: Layers },
  { href: "/documents", key: "documents", icon: FileText },
  { href: "/settings", key: "settings", icon: Settings },
] as const;

export function Sidebar() {
  const t = useTranslations("common");
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    await api.post("/auth/logout");
    router.replace("/login");
    router.refresh();
  }

  return (
    <aside className="sidebar">
      <div>
        <div className="brand">DocFlow</div>
        <div className="brand-by">by NurByte</div>
      </div>

      <nav>
        {links.map(({ href, key, icon: Icon }) => (
          <Link
            className={pathname === href ? "active" : undefined}
            href={href}
            key={href}
          >
            <Icon size={18} />
            {t(key)}
          </Link>
        ))}
      </nav>

      <button className="logout" onClick={logout} type="button">
        <LogOut size={18} />
        {t("logout")}
      </button>
    </aside>
  );
}
