"use client";

import {
  Edit3,
  Eye,
  FileText,
  LoaderCircle,
  Search,
  Trash2,
} from "lucide-react";
import { InputControl, SelectControl } from "@/components/shared/form";
import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { ListSkeleton } from "@/components/ui/list-skeleton";
import { useFeedback } from "@/components/ui/feedback-provider";
import { useDeleteDocumentService } from "../service";
import type { Document } from "../types";
import { DownloadPdfButton } from "./DownloadPdfButton";

export function DocumentHistory({
  documents,
  loading = false,
}: {
  documents: Document[];
  loading?: boolean;
}) {
  const t = useTranslations("documents");

  const [q, setQ] = useState("");
  const [sort, setSort] = useState("newest");

  const filtered = useMemo(
    () =>
      documents
        .filter((document) =>
          `${document.name} ${document.template?.name ?? ""}`
            .toLowerCase()
            .includes(q.toLowerCase()),
        )
        .sort((a, b) =>
          sort === "oldest"
            ? +new Date(a.createdAt) - +new Date(b.createdAt)
            : sort === "nameAsc"
              ? a.name.localeCompare(b.name)
              : sort === "nameDesc"
                ? b.name.localeCompare(a.name)
                : +new Date(b.createdAt) - +new Date(a.createdAt),
        ),
    [documents, q, sort],
  );

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
            onChange={(event) => setQ(event.target.value)}
            placeholder={t("searchPlaceholder")}
          />
        </label>

        <SelectControl
          value={sort}
          onChange={(event) => setSort(event.target.value)}
          aria-label={t("sort")}
        >
          <option value="newest">{t("newest")}</option>

          <option value="oldest">{t("oldest")}</option>

          <option value="nameAsc">{t("nameAsc")}</option>

          <option value="nameDesc">{t("nameDesc")}</option>
        </SelectControl>
      </div>

      {loading ? (
        <ListSkeleton rows={5} />
      ) : filtered.length ? (
        filtered.map((document) => (
          <DocumentRow key={document.id} document={document} />
        ))
      ) : (
        <div className="empty-state compact">
          <FileText />
          <p>{t("noDocuments")}</p>
        </div>
      )}
    </section>
  );
}

function DocumentRow({ document: d }: { document: Document }) {
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
      try {
        await remove.mutateAsync(undefined);
        notify(t("deleteSuccess"), "success");
      } catch {
        notify(t("deleteError"), "error");
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
        <a
          href={`/${locale}/documents/${d.id}/preview`}
          target="_blank"
          rel="noreferrer"
        >
          <Eye />
          {t("preview")}
        </a>

        <Link href={`/documents/${d.id}/edit`}>
          <Edit3 />
          {t("edit")}
        </Link>

        <DownloadPdfButton
          documentId={d.id}
          fileName={d.name}
          label={t("pdf")}
          errorLabel={t("downloadError")}
        />

        <button
          className="danger-link"
          disabled={remove.isPending}
          onClick={del}
        >
          {remove.isPending ? <LoaderCircle className="spinner" /> : <Trash2 />}

          {remove.isPending ? t("deleting") : t("delete")}
        </button>
      </div>
    </article>
  );
}
