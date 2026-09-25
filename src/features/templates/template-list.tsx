"use client";
import { InputControl, SelectControl } from "@/components/shared/form";
import { useState } from "react";
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
import type { Template, TemplateSummary } from "./types";
import { api } from "@/lib/axios";
import { parseTemplateVariables } from "./types";
import { TemplateEditor } from "./template-editor";
export default function TemplateList() {
  const t = useTranslations("templates");
  const create = useCreateTemplateService();
  const [editing, setEditing] = useState<Template | null | "new">(null);
  const [q, setQ] = useState("");
  const [sort, setSort] = useState("newest");
  const [cardActionPending, setCardActionPending] = useState(false);
  const query = useTemplatesService(q, sort);
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
        <SelectControl
          value={sort}
          onChange={(e) => setSort(e.target.value)}
          aria-label={t("sort")}
        >
          <option value="newest">{t("newest")}</option>
          <option value="oldest">{t("oldest")}</option>
          <option value="nameAsc">{t("nameAsc")}</option>
          <option value="nameDesc">{t("nameDesc")}</option>
        </SelectControl>
        <button className="btn" onClick={() => setEditing("new")}>
          <FilePlus2 size={18} /> {t("new")}
        </button>
      </div>
      {query.isLoading ? (
        <ListSkeleton rows={6} cards />
      ) : (query.data?.length ?? 0) > 0 ? (
        <div className="template-grid">
          {query.data!.map((item) => (
            <TemplateCard
              key={item.id}
              template={item}
              actionsDisabled={cardActionPending}
              onActionPendingChange={setCardActionPending}
              onEdit={async () => {
                setCardActionPending(true);
                try {
                  const full = (
                    await api.get<Template>(`/templates/${item.id}`)
                  ).data;
                  setEditing(full);
                } finally {
                  setCardActionPending(false);
                }
              }}
              onDuplicate={async () => {
                setCardActionPending(true);
                try {
                  const full = (
                    await api.get<Template>(`/templates/${item.id}`)
                  ).data;
                  await create.mutateAsync({
                    name: `${full.name.replace(/(?: copy)+$/i, "")} ${t("duplicateSuffix")}`,
                    description: full.description ?? "",
                    emailSubject: full.emailSubject ?? "",
                    content: full.content,
                    headerContent: full.headerContent ?? "",
                    footerContent: full.footerContent ?? "",
                    pageNumbers: full.pageNumbers,
                    variables: parseTemplateVariables(full.variablesJson),
                  });
                } finally {
                  setCardActionPending(false);
                }
              }}
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
  actionsDisabled,
  onActionPendingChange,
}: {
  template: TemplateSummary;
  onEdit: () => Promise<void>;
  onDuplicate: () => Promise<void>;
  actionsDisabled: boolean;
  onActionPendingChange: (pending: boolean) => void;
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
    ) {
      onActionPendingChange(true);
      try {
        await remove.mutateAsync(undefined);
      } finally {
        onActionPendingChange(false);
      }
    }
  };
  return (
    <article className="template-card">
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
          <button
            className="template-action-edit"
            onClick={() => void onEdit()}
            disabled={actionsDisabled}
          >
            <Edit3 /> {t("edit")}
          </button>
          <button
            className="template-action-duplicate"
            onClick={() => void onDuplicate()}
            disabled={actionsDisabled}
          >
            <Copy /> {t("duplicate")}
          </button>
          <button
            className="danger-link"
            onClick={del}
            disabled={
              actionsDisabled ||
              remove.isPending ||
              template.id.startsWith("default:")
            }
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
