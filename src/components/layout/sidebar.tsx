"use client";
import {
  FileText,
  LayoutDashboard,
  Layers,
  LogOut,
  Settings,
  UserRound,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { api } from "@/lib/axios";
import { Link, usePathname, useRouter } from "@/i18n/navigation";

import { version } from "../../../package.json";

const links = [
  { href: "/dashboard", key: "dashboard", icon: LayoutDashboard },
  { href: "/templates", key: "templates", icon: Layers },
  { href: "/documents", key: "documents", icon: FileText },
  { href: "/account", key: "account", icon: UserRound },
  { href: "/settings", key: "settings", icon: Settings },
] as const;

export function Sidebar() {
  const t = useTranslations("common"),
    pathname = usePathname(),
    router = useRouter(),
    [profileOpen, setProfileOpen] = useState(false);

  useEffect(() => {
    links.forEach(({ href }) => router.prefetch(href));
  }, [router]);
  async function logout() {
    await api.post("/auth/logout");
    router.replace("/login");
    router.refresh();
  }
  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="brand-mark">D</div>
        <div>
          <div className="brand">DocFlow</div>
          <div className="brand-by">by NurByte</div>
        </div>
      </div>
      <nav>
        {links.map(({ href, key, icon: Icon }) => (
          <Link
            className={`${pathname === href ? "active" : ""} nav-${key}`.trim()}
            href={href}
            key={href}
          >
            <Icon size={19} />
            <span>{t(key)}</span>
          </Link>
        ))}
      </nav>
      <div className="sidebar-bottom">
        <button className="logout" onClick={logout}>
          <LogOut size={18} />
          <span>{t("logout")}</span>
        </button>
        <span className="version desktop-version">DocFlow v{version}</span>
      </div>

      <div className="mobile-profile">
        {profileOpen && (
          <>
            <button
              className="mobile-profile-backdrop"
              type="button"
              aria-label="Close"
              onClick={() => setProfileOpen(false)}
            />
            <div className="mobile-profile-menu">
              <Link href="/account" onClick={() => setProfileOpen(false)}>
                <UserRound size={18} />
                <span>{t("account")}</span>
              </Link>
              <Link href="/settings" onClick={() => setProfileOpen(false)}>
                <Settings size={18} />
                <span>{t("settings")}</span>
              </Link>
              <button type="button" onClick={logout}>
                <LogOut size={18} />
                <span>{t("logout")}</span>
              </button>
            </div>
          </>
        )}
        <button
          className={`mobile-profile-trigger ${profileOpen || pathname === "/settings" || pathname === "/account" ? "active" : ""}`}
          type="button"
          aria-label={t("settings")}
          title={t("settings")}
          aria-expanded={profileOpen}
          onClick={() => setProfileOpen((open) => !open)}
        >
          <UserRound size={19} />
        </button>
      </div>

      <div
        className="mobile-product-meta"
        aria-label={`DocFlow by NurByte, version ${version}`}
      >
        <span>DocFlow · NurByte · v{version}</span>
      </div>
    </aside>
  );
}
