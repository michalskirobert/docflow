"use client";

import {
  Edit3,
  Eye,
  FileText,
  LoaderCircle,
  MailPlus,
  Search,
  Trash2,
} from "lucide-react";
import { InputControl, SelectControl } from "@/components/shared/form";
import { type ReactNode, useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { ListSkeleton } from "@/components/ui/list-skeleton";
import { useFeedback } from "@/components/ui/feedback-provider";
import { useDeleteDocumentService } from "../service";
import type { DocumentSummary } from "../types";
import { DownloadPdfButton } from "./DownloadPdfButton";
import { DocumentPdfPreviewModal } from "./DocumentPdfPreviewModal";

export function DocumentHistory({
  documents,
  loading = false,
  action,
  q,
  sort,
  onQueryChange,
  onSortChange,
}: {
  documents: DocumentSummary[];
  loading?: boolean;
  action?: ReactNode;
  q: string;
  sort: string;
  onQueryChange: (value: string) => void;
  onSortChange: (value: string) => void;
}) {
  const t = useTranslations("documents");
  const { notify } = useFeedback();
  const [actionPending, setActionPending] = useState(false);
  const [previewDocument, setPreviewDocument] =
    useState<DocumentSummary | null>(null);
  const [previewPdfUrl, setPreviewPdfUrl] = useState<string | null>(null);
  const [previewPdfLoading, setPreviewPdfLoading] = useState(false);
  const [previewPdfError, setPreviewPdfError] = useState(false);
  const [previewDownloadLoading, setPreviewDownloadLoading] = useState(false);

  useEffect(() => {
    if (!previewDocument) {
      setPreviewPdfUrl(null);
      setPreviewPdfLoading(false);
      setPreviewPdfError(false);
      return;
    }

    const controller = new AbortController();
    let objectUrl: string | null = null;
    setPreviewPdfLoading(true);
    setPreviewPdfError(false);
    setPreviewPdfUrl(null);

    fetch(`/api/documents/${previewDocument.id}/pdf?inline=1`, {
      signal: controller.signal,
    })
      .then((response) => {
        if (!response.ok) throw new Error("PDF_GENERATION_FAILED");
        return response.blob();
      })
      .then((blob) => {
        if (controller.signal.aborted) return;
        objectUrl = URL.createObjectURL(blob);
        setPreviewPdfUrl(objectUrl);
      })
      .catch((error) => {
        if (error instanceof DOMException && error.name === "AbortError")
          return;
        setPreviewPdfError(true);
      })
      .finally(() => {
        if (!controller.signal.aborted) setPreviewPdfLoading(false);
      });

    return () => {
      controller.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [previewDocument]);

  const downloadPreview = async () => {
    if (!previewDocument || previewDownloadLoading) return;
    setPreviewDownloadLoading(true);
    try {
      const response = await fetch(`/api/documents/${previewDocument.id}/pdf`);
      if (!response.ok) throw new Error("PDF_DOWNLOAD_FAILED");
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `${previewDocument.name.replace(/[\\/:*?"<>|]+/g, "-")}.pdf`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch {
      notify(t("downloadError"), "error");
    } finally {
      setPreviewDownloadLoading(false);
    }
  };

  return (
    <section className="document-history">
      <div className="section-heading">
        <FileText />

        <div>
          <h2>{t("history")}</h2>
          <p className="section-subtitle">{t("historyDescription")}</p>
        </div>
      </div>

      <div className="filter-bar">
        <label className="search-field">
          <Search size={16} />

          <InputControl
            value={q}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder={t("searchPlaceholder")}
          />
        </label>

        <SelectControl
          value={sort}
          onChange={(event) => onSortChange(event.target.value)}
          aria-label={t("sort")}
        >
          <option value="newest">{t("newest")}</option>

          <option value="oldest">{t("oldest")}</option>

          <option value="nameAsc">{t("nameAsc")}</option>

          <option value="nameDesc">{t("nameDesc")}</option>
        </SelectControl>
        {action}
      </div>

      {loading ? (
        <ListSkeleton rows={5} />
      ) : documents.length ? (
        documents.map((document) => (
          <DocumentRow
            key={document.id}
            document={document}
            actionsDisabled={actionPending}
            onActionPendingChange={setActionPending}
            onPreview={setPreviewDocument}
          />
        ))
      ) : (
        <div className="empty-state compact">
          <FileText />
          <p>{t("noDocuments")}</p>
        </div>
      )}

      {previewDocument && (
        <DocumentPdfPreviewModal
          title={previewDocument.name}
          previewLabel={t("preview")}
          closeLabel={t("close")}
          printLabel={t("print")}
          downloadLabel={t("downloadPdf")}
          pdfUrl={previewPdfUrl}
          loading={previewPdfLoading}
          error={previewPdfError}
          downloading={previewDownloadLoading}
          onClose={() => setPreviewDocument(null)}
          onDownload={downloadPreview}
        />
      )}
    </section>
  );
}

function DocumentRow({
  document: d,
  actionsDisabled,
  onActionPendingChange,
  onPreview,
}: {
  document: DocumentSummary;
  actionsDisabled: boolean;
  onActionPendingChange: (pending: boolean) => void;
  onPreview: (document: DocumentSummary) => void;
}) {
  const t = useTranslations("documents");
  const remove = useDeleteDocumentService(d.id);
  const { confirm, notify } = useFeedback();
  const locale = useLocale();

  const del = async () => {
    if (
      await confirm({
        title: t("deleteTitle"),
        message: t("deleteMessage", {
          name: d.name,
        }),
        confirmLabel: t("deletePermanently"),
        kind: "danger",
      })
    ) {
      onActionPendingChange(true);
      try {
        await remove.mutateAsync(undefined);
        notify(t("deleteSuccess"), "success");
      } catch {
        notify(t("deleteError"), "error");
      } finally {
        onActionPendingChange(false);
      }
    }
  };

  return (
    <article className="document-row">
      <div className="document-icon">
        <FileText />
      </div>

      <div className="document-meta">
        <strong>{d.name}</strong>

        <span>
          {d.template?.name ?? t("deletedTemplate")} ·{" "}
          {new Date(d.createdAt).toLocaleDateString(locale)}
        </span>
      </div>

      <div className="document-actions">
        <button
          type="button"
          disabled={actionsDisabled}
          onClick={() => onPreview(d)}
        >
          <Eye />
          {t("preview")}
        </button>

        <Link
          href={`/documents/${d.id}/edit`}
          aria-disabled={actionsDisabled}
          onClick={(event) => actionsDisabled && event.preventDefault()}
        >
          <Edit3 />
          {t("edit")}
        </Link>

        <Link
          href={`/documents/email?documentId=${d.id}`}
          aria-disabled={actionsDisabled}
          onClick={(event) => actionsDisabled && event.preventDefault()}
        >
          <MailPlus />
          {t("email")}
        </Link>

        <DownloadPdfButton
          documentId={d.id}
          fileName={d.name}
          label={t("pdf")}
          errorLabel={t("downloadError")}
          disabled={actionsDisabled}
        />

        <button
          className="danger-link"
          disabled={actionsDisabled || remove.isPending}
          onClick={del}
        >
          {remove.isPending ? <LoaderCircle className="spinner" /> : <Trash2 />}

          {remove.isPending ? t("deleting") : t("delete")}
        </button>
      </div>
    </article>
  );
}
