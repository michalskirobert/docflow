"use client";

import { FilePlus2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useDocumentsService } from "./service";
import { DocumentHistory } from "./components/DocumentHistory";

export default function DocumentList() {
  const t = useTranslations("documents");
  const documents = useDocumentsService();
  return (
    <>
      <div className="page-actions">
        <Link className="btn" href="/documents/new">
          <FilePlus2 size={18} /> {t("newDocument")}
        </Link>
      </div>
      <DocumentHistory
        documents={documents.data ?? []}
        loading={documents.isLoading}
      />
    </>
  );
}
