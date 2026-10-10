"use client";

import {
  FileText,
  LayoutDashboard,
  Layers,
  LogOut,
  Settings,
  CircleHelp,
  UserRound,
  Pencil,
  ArrowLeft,
  Save,
  Sparkles,
  LoaderCircle,
  MoreVertical,
  Send,
  Clipboard,
  Eye,
} from "lucide-react";
import { EditorBottomSheet } from "@/components/ui/editor-bottom-sheet";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { api } from "@/lib/axios";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { DocFlowLogo } from "@/components/brand/docflow-logo";
import {
  MOBILE_EDITOR_NAV_BACK,
  MOBILE_EDITOR_NAV_SAVE,
  MOBILE_EDITOR_NAV_STATE,
  MOBILE_EDITOR_NAV_ACTION,
  MOBILE_EDITOR_NAV_EDIT_META,
  type MobileEditorNavDetail,
} from "@/lib/mobile-editor-nav";

import { version } from "../../../package.json";

const links = [
  { href: "/dashboard", key: "dashboard", icon: LayoutDashboard },
  { href: "/templates", key: "templates", icon: Layers },
  { href: "/documents", key: "documents", icon: FileText },
  { href: "/account", key: "account", icon: UserRound },
  { href: "/settings", key: "settings", icon: Settings },
  { href: "/help", key: "help", icon: CircleHelp },
] as const;

const mobileHiddenLinks = new Set(["/account", "/settings", "/help"]);

export function Sidebar() {
  const t = useTranslations("common"),
    pathname = usePathname(),
    router = useRouter(),
    [profileOpen, setProfileOpen] = useState(false),
    [mobileEditor, setMobileEditor] = useState<MobileEditorNavDetail>({
      active: false,
    });

  const [actionsOpen, setActionsOpen] = useState(false);

  useEffect(() => {
    setActionsOpen(false);
  }, [mobileEditor.active, mobileEditor.kind, pathname]);

  useEffect(() => {
    links.forEach(({ href }) => router.prefetch(href));
  }, [router]);

  useEffect(() => {
    const syncEditorNav = (event: Event) => {
      setMobileEditor((event as CustomEvent<MobileEditorNavDetail>).detail);
      setProfileOpen(false);
    };
    window.addEventListener(MOBILE_EDITOR_NAV_STATE, syncEditorNav);
    return () =>
      window.removeEventListener(MOBILE_EDITOR_NAV_STATE, syncEditorNav);
  }, []);

  async function logout() {
    await api.post("/auth/logout");
    router.replace("/login");
    router.refresh();
  }

  return (
    <aside
      className={`sidebar ${mobileEditor.active ? "mobile-editor-nav-active" : ""}`}
    >
      {mobileEditor.active && (
        <div
          className={`mobile-editor-nav${mobileEditor.actions?.length ? " mobile-editor-nav--with-menu" : ""}`}
          aria-label={
            mobileEditor.kind === "template"
              ? "Template editor"
              : mobileEditor.kind === "email"
                ? "Email editor"
                : "Document editor"
          }
        >
          {Boolean(mobileEditor.actions?.length) && (
            <button
              type="button"
              className="mobile-editor-nav-action more"
              aria-label={t("moreActions")}
              aria-haspopup="dialog"
              aria-expanded={actionsOpen}
              onClick={() => setActionsOpen(true)}
            >
              <MoreVertical size={22} />
            </button>
          )}
          <button
            type="button"
            className="mobile-editor-nav-action secondary"
            aria-label={mobileEditor.backLabel || t("back")}
            title={mobileEditor.backLabel || t("back")}
            onClick={() =>
              window.dispatchEvent(new Event(MOBILE_EDITOR_NAV_BACK))
            }
          >
            <ArrowLeft size={20} />
            <span>{mobileEditor.backLabel || t("back")}</span>
          </button>
          <button
            type="button"
            className="mobile-editor-nav-name"
            disabled={mobileEditor.metadataDisabled}
            title={mobileEditor.name || ""}
            onClick={() =>
              window.dispatchEvent(new Event(MOBILE_EDITOR_NAV_EDIT_META))
            }
          >
            <span>
              {mobileEditor.name ||
                (mobileEditor.kind === "template"
                  ? t("templates")
                  : t("documents"))}
            </span>
            <Pencil size={15} aria-hidden="true" />
          </button>
          <button
            type="button"
            className="mobile-editor-nav-action save"
            disabled={mobileEditor.primaryDisabled ?? mobileEditor.pending}
            aria-label={mobileEditor.primaryLabel || t("save")}
            title={
              mobileEditor.primaryTitle ||
              mobileEditor.primaryLabel ||
              t("save")
            }
            onClick={() =>
              window.dispatchEvent(new Event(MOBILE_EDITOR_NAV_SAVE))
            }
          >
            {mobileEditor.pending ? (
              <LoaderCircle className="spinner" size={20} />
            ) : mobileEditor.primaryIcon === "send" ? (
              <Send size={20} />
            ) : mobileEditor.primaryIcon === "generate" ? (
              <Sparkles size={20} />
            ) : (
              <Save size={20} />
            )}
            <span>{mobileEditor.primaryLabel || t("save")}</span>
          </button>
        </div>
      )}
      <EditorBottomSheet
        open={actionsOpen}
        title={t("moreActions")}
        onClose={() => setActionsOpen(false)}
      >
        <div className="mobile-editor-action-list">
          {mobileEditor.actions?.map((action) => (
            <button
              key={action.id}
              type="button"
              disabled={action.disabled}
              onClick={() => {
                setActionsOpen(false);
                window.dispatchEvent(
                  new CustomEvent(MOBILE_EDITOR_NAV_ACTION, {
                    detail: action.id,
                  }),
                );
              }}
            >
              {action.id === "preview" ? (
                <Eye size={20} />
              ) : action.id === "copy" ? (
                <Clipboard size={20} />
              ) : (
                <Pencil size={20} />
              )}
              <span>{action.label}</span>
            </button>
          ))}
        </div>
      </EditorBottomSheet>
      <Link
        href="/dashboard"
        className="sidebar-brand"
        aria-label="DocFlow by NurByte — Dashboard"
      >
        <DocFlowLogo showByline />
      </Link>

      <nav>
        {links.map(({ href, key, icon: Icon }) => (
          <Link
            className={`${pathname === href || pathname.startsWith(`${href}/`) ? "active" : ""} nav-${key}${
              mobileHiddenLinks.has(href) ? " mobile-hidden" : ""
            }`.trim()}
            href={href}
            key={href}
            onClick={() => setProfileOpen(false)}
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

        <div className="desktop-product-meta">
          <span className="version desktop-version">DocFlow v{version}</span>
          <span className="desktop-copyright">© NurByte 2026</span>
        </div>
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

              <Link href="/help" onClick={() => setProfileOpen(false)}>
                <CircleHelp size={18} />
                <span>{t("help")}</span>
              </Link>

              <button type="button" onClick={logout}>
                <LogOut size={18} />
                <span>{t("logout")}</span>
              </button>
            </div>
          </>
        )}

        <button
          className={`mobile-profile-trigger ${profileOpen ? "active" : ""}`}
          type="button"
          aria-label={t("settings")}
          title={t("settings")}
          aria-expanded={profileOpen}
          onClick={() => setProfileOpen((open) => !open)}
        >
          <UserRound size={19} />
          <span className="mobile-profile-label">{t("account")}</span>
        </button>
      </div>

      <div
        className="mobile-product-meta"
        aria-label={`DocFlow by NurByte, version ${version}`}
      >
        <DocFlowLogo compact className="mobile-docflow-logo" />
        <span className="mobile-version">v{version}</span>
      </div>
    </aside>
  );
}
