"use client";
import { SelectField } from "@/components/shared/form";
import { FilterDateControl, ListToolbar } from "@/components/shared/list";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Copy,
  Edit3,
  FilePlus2,
  LoaderCircle,
  Trash2,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
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
  const [source, setSource] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [cardActionPending, setCardActionPending] = useState(false);
  const query = useTemplatesService(q, sort, source, dateFrom, dateTo);
  const activeFilterCount = (source !== "all" ? 1 : 0) + (dateFrom ? 1 : 0) + (dateTo ? 1 : 0);
  return (
    <>
      <ListToolbar
        search={q}
        searchPlaceholder={t("search")}
        onSearchChange={setQ}
        sort={sort}
        sortLabel={t("sort")}
        sortOptions={[
          { value: "newest", label: t("newest") },
          { value: "oldest", label: t("oldest") },
          { value: "nameAsc", label: t("nameAsc") },
          { value: "nameDesc", label: t("nameDesc") },
        ]}
        onSortChange={setSort}
        filterLabel={t("filters")}
        closeLabel={t("closeFilters")}
        clearLabel={t("clearFilters")}
        applyLabel={t("applyFilters")}
        activeFilterCount={activeFilterCount}
        onClearFilters={() => { setSource("all"); setDateFrom(""); setDateTo(""); }}
        filters={<div className="list-filter-grid">
          <SelectField label={t("sourceFilter")} value={source} onChange={(e) => setSource(e.target.value)}><option value="all">{t("sourceAll")}</option><option value="default">{t("sourceDefault")}</option><option value="own">{t("sourceOwn")}</option></SelectField>
          <FilterDateControl label={t("dateFrom")} value={dateFrom} onChange={setDateFrom} />
          <FilterDateControl label={t("dateTo")} value={dateTo} onChange={setDateTo} />
        </div>}
        action={<button className="btn list-toolbar-primary" onClick={() => setEditing("new")}><FilePlus2 size={18} /> {t("new")}</button>}
      />
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
  const locale = useLocale();
  const [editPending, setEditPending] = useState(false);
  const remove = useDeleteTemplateService(template.id);
  const queryClient = useQueryClient();
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
        queryClient.setQueriesData<TemplateSummary[]>(
          { queryKey: ["templates"] },
          (current) =>
            Array.isArray(current)
              ? current.filter((item) => item.id !== template.id)
              : current,
        );
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
        <span className="template-created-at">{t("createdAt", { date: new Date(template.createdAt).toLocaleDateString(locale) })}</span>
        <div className="variable-list">
          {variables.slice(0, 4).map((v) => (
            <span key={v.name}>{`{{${v.name}}}`}</span>
          ))}
        </div>
        <div className="card-actions">
          <button
            className="template-action-edit"
            onClick={() => {
              setEditPending(true);
              void onEdit().finally(() => setEditPending(false));
            }}
            disabled={actionsDisabled}
            aria-busy={editPending}
          >
            {editPending ? (
              <>
                <LoaderCircle className="spinner" /> {t("openingEditor")}
              </>
            ) : (
              <>
                <Edit3 /> {t("edit")}
              </>
            )}
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
