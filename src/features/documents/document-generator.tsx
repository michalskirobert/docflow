"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { InputControl } from "@/components/shared/form";
import { ArrowLeft, LoaderCircle, Save, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { useFeedback } from "@/components/ui/feedback-provider";
import { useUnsavedChanges } from "@/hooks/use-unsaved-changes";
import { PendingOverlay } from "@/components/ui/pending-overlay";
import { ListSkeleton } from "@/components/ui/list-skeleton";
import { parseTemplateVariables } from "@/features/templates/types";
import { TemplatePicker } from "./components/TemplatePicker";
import { VariableField } from "./components/VariableField";
import { validateVariable } from "./helpers";
import {
  useDocumentService,
  useDocumentTemplatesService,
  useGenerateDocumentService,
  useUpdateDocumentService,
} from "./service";

export default function DocumentGenerator({
  documentId,
}: {
  documentId?: string;
}) {
  const t = useTranslations("documents");
  const router = useRouter();
  const { notify, confirm } = useFeedback();

  const templates = useDocumentTemplatesService();
  const documentQuery = useDocumentService(documentId ?? "");
  const generateMutation = useGenerateDocumentService();
  const updateMutation = useUpdateDocumentService(documentId ?? "");

  const isEditing = Boolean(documentId);

  const [templateId, setTemplateId] = useState("");
  const [documentName, setDocumentName] = useState("");
  const [documentNameError, setDocumentNameError] = useState("");
  const [values, setValues] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [initialized, setInitialized] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [dirty, setDirty] = useState(false);

  const documentNameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isEditing || initialized || !documentQuery.data) return;

    setTemplateId(documentQuery.data.templateId ?? "");
    setDocumentName(documentQuery.data.name ?? "");

    try {
      const payload = JSON.parse(
        documentQuery.data.payloadJson ?? "{}",
      ) as Record<string, unknown>;

      setValues(
        Object.fromEntries(
          Object.entries(payload).map(([key, value]) => [
            key,
            value == null ? "" : String(value),
          ]),
        ),
      );
    } catch {
      setValues({});
    }

    setInitialized(true);
    setDirty(false);
  }, [documentQuery.data, initialized, isEditing]);

  const selected = templates.data?.find(
    (template) => template.id === templateId,
  );

  const variables = useMemo(
    () => (selected ? parseTemplateVariables(selected.variablesJson) : []),
    [selected],
  );

  const confirmLeave = useCallback(
    () =>
      confirm({
        title: t("unsavedChangesTitle"),
        message: t("unsavedChangesWarning"),
        confirmLabel: t("unsavedChangesLeave"),
        cancelLabel: t("unsavedChangesStay"),
        kind: "danger",
      }),
    [confirm, t],
  );

  useUnsavedChanges(dirty && !isRedirecting, confirmLeave);

  const save = () => {
    if (!selected) return;

    const trimmedDocumentName = documentName.trim();

    if (!trimmedDocumentName) {
      setDocumentNameError(t("documentNameRequired"));

      requestAnimationFrame(() => {
        const element = documentNameRef.current;

        element?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });

        element?.focus();
      });

      return;
    }

    const nextErrors = Object.fromEntries(
      variables
        .map((variable) => [
          variable.name,
          validateVariable(variable, values[variable.name] ?? ""),
        ])
        .filter(([, error]) => error),
    );

    setErrors(nextErrors);

    if (Object.keys(nextErrors).length) {
      const first = variables.find((variable) => nextErrors[variable.name]);

      requestAnimationFrame(() => {
        const element = first
          ? document.getElementById(
              `document-variable-${first.name.replace(/[^a-zA-Z0-9_-]/g, "-")}`,
            )
          : null;

        element?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });

        element?.focus();
      });

      return;
    }

    if (isEditing && documentQuery.data) {
      updateMutation.mutate(
        {
          name: trimmedDocumentName,
          data: values,
        },
        {
          onSuccess: () => {
            setDirty(false);
            setIsRedirecting(true);
            notify(t("updateSuccess"), "success");
            router.push("/documents");
          },
          onError: () => {
            notify(t("updateError"), "error");
          },
        },
      );

      return;
    }

    generateMutation.mutate(
      {
        templateId,
        name: trimmedDocumentName,
        data: values,
      },
      {
        onSuccess: () => {
          setDirty(false);
          setIsRedirecting(true);
          notify(t("generateSuccess"), "success");
          router.push("/documents");
        },
        onError: () => {
          notify(t("generateError"), "error");
        },
      },
    );
  };

  if (isEditing && (documentQuery.isLoading || !initialized)) {
    return (
      <div
        className="document-generator-shell document-generator-loading"
        aria-busy="true"
      >
        <div
          className="document-sticky-actions document-actions-skeleton"
          aria-hidden="true"
        >
          <span className="skeleton-action" />
          <span className="skeleton-action" />
        </div>
        <section className="card document-form-card">
          <div className="document-loading-heading">
            <span className="skeleton-icon" />
            <div>
              <span className="skeleton-line wide" />
              <span className="skeleton-line" />
            </div>
          </div>
          <ListSkeleton rows={6} />
          <span className="sr-only">{t("loadingDocument")}</span>
        </section>
      </div>
    );
  }

  if (isEditing && !documentQuery.data) {
    return (
      <div className="empty-state">
        <p>{t("documentNotFound")}</p>
      </div>
    );
  }

  const pending =
    generateMutation.isPending || updateMutation.isPending || isRedirecting;

  return (
    <div className="document-generator-shell pending-form" aria-busy={pending}>
      <PendingOverlay active={pending} label={t("saving")} />
      <div className="form-actions document-sticky-actions">
        <button
          className="btn secondary"
          type="button"
          disabled={pending}
          onClick={async () => {
            if (dirty && !(await confirmLeave())) return;
            setDirty(false);
            router.push("/documents");
          }}
        >
          <ArrowLeft size={17} />
          {t("backToDocuments")}
        </button>

        {selected && (
          <button
            className="btn"
            type="button"
            disabled={pending}
            onClick={save}
          >
            {pending ? (
              <LoaderCircle className="spinner" size={17} />
            ) : isEditing ? (
              <Save size={17} />
            ) : (
              <Sparkles size={17} />
            )}

            {pending
              ? t("saving")
              : isEditing
                ? t("saveDocument")
                : t("generate")}
          </button>
        )}
      </div>

      <section className="card document-form-card">
        <div className="section-heading">
          {isEditing ? <Save /> : <Sparkles />}
          <div>
            <h2>{isEditing ? t("editFormTitle") : t("generateTitle")}</h2>
            <p>
              {isEditing ? t("editFormDescription") : t("generateDescription")}
            </p>
          </div>
        </div>

        {!isEditing && (
          <TemplatePicker
            templates={templates.data ?? []}
            loading={templates.isLoading}
            value={templateId}
            disabled={isEditing}
            onChange={(id) => {
              if (isEditing) return;

              const nextTemplateId = id === templateId ? "" : id;

              const nextTemplate = templates.data?.find(
                (template) => template.id === nextTemplateId,
              );

              setTemplateId(nextTemplateId);
              setDirty(true);

              setDocumentName(
                nextTemplate
                  ? `${nextTemplate.name} - ${new Date().toLocaleDateString()}`
                  : "",
              );

              setDocumentNameError("");
              setValues({});
              setErrors({});
            }}
          />
        )}
        {selected && (
          <label
            className={`field ${documentNameError ? "field-error" : ""}`}
            htmlFor="document-name"
          >
            <span>
              {t("documentName")} <strong className="required">*</strong>
            </span>

            <InputControl
              id="document-name"
              ref={documentNameRef}
              type="text"
              value={documentName}
              placeholder={t("documentNamePlaceholder")}
              aria-invalid={Boolean(documentNameError)}
              aria-describedby={
                documentNameError ? "document-name-error" : undefined
              }
              onChange={(event) => {
                const nextName = event.target.value;
                if (nextName !== documentName) setDirty(true);
                setDocumentName(nextName);

                if (documentNameError) {
                  setDocumentNameError("");
                }
              }}
            />

            {documentNameError && (
              <small id="document-name-error" className="form-error">
                {documentNameError}
              </small>
            )}
          </label>
        )}

        {variables.map((variable) => (
          <VariableField
            key={variable.name}
            variable={variable}
            value={values[variable.name] ?? ""}
            error={errors[variable.name]}
            onChange={(value) => {
              if (value !== (values[variable.name] ?? "")) setDirty(true);
              setValues((current) => ({
                ...current,
                [variable.name]: value,
              }));

              setErrors((current) => ({
                ...current,
                [variable.name]: "",
              }));
            }}
          />
        ))}
      </section>
    </div>
  );
}
