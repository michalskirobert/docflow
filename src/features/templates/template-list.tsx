"use client";
import { InputControl } from "@/components/shared/form";
import { useMemo, useState } from "react";
import {
  Copy,
  Edit3,
  FilePlus2,
  LoaderCircle,
  Search,
  Trash2,
} from "lucide-react";
import { useTranslations } from "next-intl";
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
  const t = useTranslations("templates");
  const query = useTemplatesService();
  const create = useCreateTemplateService();
  const [editing, setEditing] = useState<Template | null | "new">(null);
  const [q, setQ] = useState("");
  const filtered = useMemo(
    () =>
      query.data?.filter((item) =>
        `${item.name} ${item.description ?? ""}`
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
          <InputControl
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t("search")}
          />
        </label>
        <button className="btn" onClick={() => setEditing("new")}>
          <FilePlus2 size={18} /> {t("new")}
        </button>
      </div>
      {query.isLoading ? (
        <ListSkeleton rows={6} cards />
      ) : filtered.length ? (
        <div className="template-grid">
          {filtered.map((item) => (
            <TemplateCard
              key={item.id}
              template={item}
              onEdit={() => setEditing(item)}
              onDuplicate={() =>
                create.mutate({
                  name: `${item.name.replace(/(?: copy)+$/i, "")} ${t("duplicateSuffix")}`,
                  description: item.description ?? "",
                  content: item.content,
                  variables: parseTemplateVariables(item.variablesJson),
                })
              }
            />
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <FilePlus2 />
          <h2>{q ? t("noMatching") : t("first")}</h2>
          <p>{q ? t("trySearch") : t("firstDescription")}</p>
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
  const t = useTranslations("templates");
  const remove = useDeleteTemplateService(template.id);
  const { confirm } = useFeedback();
  const variables = parseTemplateVariables(template.variablesJson);
  const del = async () => {
    if (
      await confirm({
        title: t("deleteTitle"),
        message: t("deleteMessage", { name: template.name }),
        confirmLabel: t("deletePermanently"),
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
          {template.isExample && <span className="badge">{t("example")}</span>}
        </div>
        <p className="muted clamp">
          {template.description || t("noDescription")}
        </p>
        <div className="variable-list">
          {variables.slice(0, 4).map((v) => (
            <span key={v.name}>{`{{${v.name}}}`}</span>
          ))}
        </div>
        <div className="card-actions">
          <button onClick={onEdit}>
            <Edit3 /> {t("edit")}
          </button>
          <button onClick={onDuplicate}>
            <Copy /> {t("duplicate")}
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
