"use client";
import { Download, Eye, FileText, Search, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { useLocale } from "next-intl";
import { useFeedback } from "@/components/ui/feedback-provider";
import { useDeleteDocumentService } from "../service";
import type { Document } from "../types";
export function DocumentHistory({ documents }: { documents: Document[] }) {
  const [q, setQ] = useState("");
  const [sort, setSort] = useState("newest");
  const filtered = useMemo(
    () =>
      documents
        .filter((d) =>
          `${d.name} ${d.template.name}`
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
          <h2>Document history</h2>
          <p>Search, sort, preview or download generated documents.</p>
        </div>
      </div>
      <div className="filter-bar">
        <label className="search-field">
          <Search size={16} />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search documents…"
          />
        </label>
        <select value={sort} onChange={(e) => setSort(e.target.value)}>
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
          <option value="nameAsc">Name A–Z</option>
          <option value="nameDesc">Name Z–A</option>
        </select>
      </div>
      {filtered.length ? (
        filtered.map((d) => <DocumentRow key={d.id} document={d} />)
      ) : (
        <div className="empty-state compact">
          <FileText />
          <p>No matching documents.</p>
        </div>
      )}
    </section>
  );
}
function DocumentRow({ document: d }: { document: Document }) {
  const remove = useDeleteDocumentService(d.id);
  const { confirm } = useFeedback();
  const locale = useLocale();
  const del = async () => {
    if (
      await confirm({
        title: "Delete document?",
        message: `${d.name} will be permanently deleted. This action cannot be undone.`,
        confirmLabel: "Delete permanently",
        kind: "danger",
      })
    )
      await remove.mutateAsync(undefined);
  };
  return (
    <article className="document-row">
      <div className="document-icon">
        <FileText />
      </div>
      <div className="document-meta">
        <strong>{d.name}</strong>
        <span>
          {d.template.name} · {new Date(d.createdAt).toLocaleDateString()}
        </span>
      </div>
      <div className="document-actions">
        <a
          href={`/${locale}/documents/${d.id}/preview`}
          target="_blank"
          rel="noreferrer"
        >
          <Eye /> Preview
        </a>
        <a href={`/api/documents/${d.id}/pdf`} download>
          <Download /> PDF
        </a>
        <button
          className="danger-link"
          disabled={remove.isPending}
          onClick={del}
        >
          <Trash2 /> Delete
        </button>
      </div>
    </article>
  );
}
