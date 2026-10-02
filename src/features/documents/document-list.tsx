"use client";

import { FilePlus2, MailPlus } from "lucide-react";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useDocumentsService } from "./service";
import { DocumentHistory } from "./components/DocumentHistory";
import { QueryErrorState } from "@/components/ui/query-error-state";

export default function DocumentList() {
  const t = useTranslations("documents");
  const [q, setQ] = useState("");
  const [sort, setSort] = useState("newest");
  const [templateFilter, setTemplateFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const documents = useDocumentsService(q, sort);
  const allDocuments = documents.data ?? [];
  const templateOptions = Array.from(
    new Map(
      allDocuments.map((document) => [
        document.templateId ?? `deleted:${document.template?.name ?? ""}`,
        document.template?.name ?? t("deletedTemplate"),
      ]),
    ).entries(),
  );
  const filteredDocuments = allDocuments.filter((document) => {
    const templateKey =
      document.templateId ?? `deleted:${document.template?.name ?? ""}`;
    if (templateFilter !== "all" && templateKey !== templateFilter)
      return false;
    const createdAt = new Date(document.createdAt);
    if (dateFrom) {
      const from = new Date(`${dateFrom}T00:00:00`);
      if (createdAt < from) return false;
    }
    if (dateTo) {
      const to = new Date(`${dateTo}T23:59:59.999`);
      if (createdAt > to) return false;
    }
    return true;
  });

  if (documents.isError && !documents.data) {
    return (
      <section className="document-history">
        <QueryErrorState
          title={t("loadErrorTitle")}
          message={t("loadErrorMessage")}
          retryLabel={t("retry")}
          retrying={documents.isFetching}
          onRetry={() => void documents.refetch()}
        />
      </section>
    );
  }

  return (
    <DocumentHistory
      documents={filteredDocuments}
      templateFilter={templateFilter}
      templateOptions={templateOptions}
      dateFrom={dateFrom}
      dateTo={dateTo}
      onTemplateFilterChange={setTemplateFilter}
      onDateFromChange={setDateFrom}
      onDateToChange={setDateTo}
      loading={documents.isPending && !documents.data}
      q={q}
      sort={sort}
      onQueryChange={setQ}
      onSortChange={setSort}
      action={
        <div className="document-create-actions">
          <Link className="btn secondary" href="/documents/email">
            <MailPlus size={18} /> {t("prepareEmail")}
          </Link>
          <Link className="btn" href="/documents/new">
            <FilePlus2 size={18} /> {t("newDocument")}
          </Link>
        </div>
      }
    />
  );
}
