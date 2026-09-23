"use client";

import { FilePlus2, MailPlus } from "lucide-react";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useDocumentsService } from "./service";
import { DocumentHistory } from "./components/DocumentHistory";

export default function DocumentList() {
  const t = useTranslations("documents");
  const [q, setQ] = useState("");
  const [sort, setSort] = useState("newest");
  const documents = useDocumentsService(q, sort);
  return (
    <DocumentHistory
      documents={documents.data ?? []}
      loading={documents.isLoading || documents.isFetching}
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
