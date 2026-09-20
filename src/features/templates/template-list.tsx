"use client";
import { useMemo, useState } from "react";
import {
  Copy,
  Edit3,
  FilePlus2,
  LoaderCircle,
  Search,
  Trash2,
} from "lucide-react";
import { ListSkeleton } from "@/components/ui/list-skeleton";
import { useFeedback } from "@/components/ui/feedback-provider";
import {
  useCreateTemplateService,
  useDeleteTemplateService,
  useTemplatesService,
} from "./service";
import type { Template } from "./types";
import { parseTemplateVariables } from "./types";
import { TemplateEditor } from "./template-editor";
export default function TemplateList() {
  const query = useTemplatesService();
  const create = useCreateTemplateService();
  const [editing, setEditing] = useState<Template | null | "new">(null);
  const [q, setQ] = useState("");
  const filtered = useMemo(
    () =>
      query.data?.filter((t) =>
        `${t.name} ${t.description ?? ""}`
          .toLowerCase()
          .includes(q.toLowerCase()),
      ) ?? [],
    [query.data, q],
  );
  return (
    <>
      <div className="page-actions template-list-actions">
        <label className="search-field">
          <Search size={16} />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search templates…"
          />
        </label>
        <button className="btn" onClick={() => setEditing("new")}>
          <FilePlus2 size={18} /> New template
        </button>
      </div>
      {query.isLoading ? (
        <ListSkeleton rows={6} cards />
      ) : filtered.length ? (
        <div className="template-grid">
          {filtered.map((t) => (
            <TemplateCard
              key={t.id}
              template={t}
              onEdit={() => setEditing(t)}
              onDuplicate={() =>
                create.mutate({
                  name: `${t.name.replace(/(?: copy)+$/i, "")} copy`,
                  description: t.description ?? "",
                  content: t.content,
                  variables: parseTemplateVariables(t.variablesJson),
                })
              }
            />
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <FilePlus2 />
          <h2>{q ? "No matching templates" : "Create your first template"}</h2>
          <p>
            {q
              ? "Try another search phrase."
              : "Design reusable documents with variables, tables and images."}
          </p>
        </div>
      )}
      {editing && (
        <TemplateEditor
          template={editing === "new" ? undefined : editing}
          onClose={() => setEditing(null)}
        />
      )}
    </>
  );
}
function TemplateCard({
  template,
  onEdit,
  onDuplicate,
}: {
  template: Template;
  onEdit: () => void;
  onDuplicate: () => void;
}) {
  const remove = useDeleteTemplateService(template.id);
  const { confirm } = useFeedback();
  const variables = parseTemplateVariables(template.variablesJson);
  const del = async () => {
    if (
      await confirm({
        title: "Delete template?",
        message: `${template.name} will be permanently deleted. This action cannot be undone.`,
        confirmLabel: "Delete permanently",
        kind: "danger",
      })
    )
      await remove.mutateAsync(undefined);
  };
  return (
    <article className="template-card">
      <div className="template-preview-frame">
        <div
          className="template-preview"
          dangerouslySetInnerHTML={{ __html: template.content }}
        />
      </div>
      <div className="template-body">
        <div className="row between">
          <h3>{template.name}</h3>
          {template.isExample && <span className="badge">Example</span>}
        </div>
        <p className="muted clamp">
          {template.description || "No description"}
        </p>
        <div className="variable-list">
          {variables.slice(0, 4).map((v) => (
            <span key={v.name}>{`{{${v.name}}}`}</span>
          ))}
        </div>
        <div className="card-actions">
          <button onClick={onEdit}>
            <Edit3 /> Edit
          </button>
          <button onClick={onDuplicate}>
            <Copy /> Duplicate
          </button>
          <button
            className="danger-link"
            onClick={del}
            disabled={remove.isPending}
            aria-busy={remove.isPending}
          >
            {remove.isPending ? (
              <LoaderCircle className="spinner" />
            ) : (
              <Trash2 />
            )}
          </button>
        </div>
      </div>
    </article>
  );
}
