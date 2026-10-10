"use client";

import {
  ArrowLeft,
  Clipboard,
  Eye,
  Mail,
  Save,
  Send,
  Sparkles,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useRouter } from "@/i18n/navigation";
import {
  MOBILE_EDITOR_NAV_BACK,
  publishMobileEditorNav,
} from "@/lib/mobile-editor-nav";

export function DocumentFieldSkeleton({
  metadata = false,
  help = false,
}: {
  metadata?: boolean;
  help?: boolean;
}) {
  return (
    <div
      className={`document-matched-field${metadata ? " document-desktop-meta" : ""}`}
      aria-hidden="true"
    >
      <span className="skeleton-line skeleton-label" />
      <span className="skeleton-control" />
      {help && <span className="skeleton-line document-matched-help" />}
    </div>
  );
}

export function DocumentGeneratorSkeleton({
  email = false,
  editing = false,
  source = false,
  selected = editing || source,
  recipient = false,
}: {
  email?: boolean;
  editing?: boolean;
  source?: boolean;
  selected?: boolean;
  recipient?: boolean;
}) {
  const t = useTranslations("documents");
  const router = useRouter();
  const primary = t(
    email ? "sendEmail" : editing ? "saveDocument" : "generate",
  );
  return (
    <div
      className="document-generator-shell document-mobile-editor document-matched-loading"
      aria-busy="true"
      aria-label={t("loadingDocument")}
    >
      <div className="form-actions document-sticky-actions">
        <button
          className="btn secondary"
          type="button"
          onClick={() => router.push("/documents")}
        >
          <ArrowLeft size={17} />
          {t("backToDocuments")}
        </button>
        <div
          className={
            email ? "email-header-actions" : "document-primary-actions"
          }
        >
          <button className="btn secondary" type="button" disabled>
            <Eye size={17} />
            {t(email ? "previewEmail" : "preview")}
          </button>
          {email && (
            <button className="btn secondary" type="button" disabled>
              <Clipboard size={17} />
              {t("copyEmail")}
            </button>
          )}
          <button
            className={email ? "btn email-send-button" : "btn"}
            type="button"
            disabled
          >
            {email ? (
              <Send size={17} />
            ) : editing ? (
              <Save size={17} />
            ) : (
              <Sparkles size={17} />
            )}{" "}
            {primary}
          </button>
        </div>
      </div>
      <section className="card document-form-card document-form-skeleton">
        <span className="document-form-progress" aria-hidden="true" />
        <div className="section-heading">
          {email ? <Mail /> : editing ? <Save /> : <Sparkles />}
          <div>
            <h2>
              {t(
                email
                  ? "prepareEmailTitle"
                  : editing
                    ? "editFormTitle"
                    : "generateTitle",
              )}
            </h2>
            <p>
              {t(
                email
                  ? "prepareEmailDescription"
                  : editing
                    ? "editFormDescription"
                    : "generateDescription",
              )}
            </p>
          </div>
        </div>
        {!editing && !source && (
          <span className="skeleton-template-trigger" aria-hidden="true" />
        )}
        {selected && !email && (
          <>
            <DocumentFieldSkeleton metadata />
            <DocumentFieldSkeleton metadata />
          </>
        )}
        {selected && email && (
          <>
            <DocumentFieldSkeleton help />
            {recipient && <DocumentFieldSkeleton help />}
          </>
        )}
      </section>
    </div>
  );
}

export function DocumentGeneratorRouteLoading({
  email = false,
  editing = false,
}: {
  email?: boolean;
  editing?: boolean;
}) {
  const t = useTranslations("documents");
  const router = useRouter();
  const params = useSearchParams();
  const source = email && Boolean(params.get("documentId"));
  useEffect(() => {
    publishMobileEditorNav({
      active: true,
      kind: email ? "email" : "document",
      name: t(
        email ? "prepareEmail" : editing ? "editFormTitle" : "generateTitle",
      ),
      backLabel: t("backToDocuments"),
      primaryLabel: t(
        email ? "sendEmail" : editing ? "saveDocument" : "generate",
      ),
      primaryIcon: email ? "send" : editing ? "save" : "generate",
      primaryDisabled: true,
      metadataDisabled: true,
      actions: email
        ? [
            { id: "preview", label: t("previewEmail"), disabled: true },
            { id: "copy", label: t("copyEmail"), disabled: true },
          ]
        : [{ id: "preview", label: t("preview"), disabled: true }],
    });
    const back = () => router.push("/documents");
    window.addEventListener(MOBILE_EDITOR_NAV_BACK, back);
    return () => {
      window.removeEventListener(MOBILE_EDITOR_NAV_BACK, back);
      publishMobileEditorNav({ active: false });
    };
  }, [email, editing, router, t]);
  return (
    <>
      <h1 className="document-editor-page-title">
        {t(email ? "prepareEmail" : editing ? "editDocument" : "newDocument")}
      </h1>
      <DocumentGeneratorSkeleton
        email={email}
        editing={editing}
        source={source}
      />
    </>
  );
}
