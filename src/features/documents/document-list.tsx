"use client";

import { FilePlus2, MailPlus } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import {
  useDocumentsService,
  useDocumentTemplateFiltersService,
} from "./service";
import { DocumentHistory } from "./components/DocumentHistory";
import { QueryErrorState } from "@/components/ui/query-error-state";

export default function DocumentList() {
  const t = useTranslations("documents");
  const [q, setQ] = useState("");
  const [sort, setSort] = useState("newest");
  const [templateFilter, setTemplateFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const documents = useDocumentsService(
    q,
    sort,
    categoryFilter,
    templateFilter,
    dateFrom,
    dateTo,
  );
  const templateFilters = useDocumentTemplateFiltersService();
  const allDocuments = useMemo(
    () => documents.data?.pages.flatMap((page) => page.items) ?? [],
    [documents.data],
  );
  const templateOptions = useMemo(
    () =>
      (templateFilters.data ?? []).map(
        (item) => [item.id, item.name] as [string, string],
      ),
    [templateFilters.data],
  );
  const loadMoreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const target = loadMoreRef.current;
    if (!target || !documents.hasNextPage) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !documents.isFetchingNextPage) {
          void documents.fetchNextPage();
        }
      },
      { rootMargin: "240px" },
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [
    documents.hasNextPage,
    documents.isFetchingNextPage,
    documents.fetchNextPage,
  ]);

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
      documents={allDocuments}
      templateFilter={templateFilter}
      categoryFilter={categoryFilter}
      templateOptions={templateOptions}
      dateFrom={dateFrom}
      dateTo={dateTo}
      onTemplateFilterChange={setTemplateFilter}
      onCategoryFilterChange={setCategoryFilter}
      onDateFromChange={setDateFrom}
      onDateToChange={setDateTo}
      loading={documents.isPending && !documents.data}
      loadingMore={documents.isFetchingNextPage}
      loadMoreRef={loadMoreRef}
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
