"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, LoaderCircle, Save, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { useFeedback } from "@/components/ui/feedback-provider";
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
  const { notify } = useFeedback();

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
  }, [documentQuery.data, initialized, isEditing]);

  const selected = templates.data?.find(
    (template) => template.id === templateId,
  );

  const variables = useMemo(
    () => (selected ? parseTemplateVariables(selected.variablesJson) : []),
    [selected],
  );

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
      <div className="card loading-card">
        <LoaderCircle className="spinner" />
        {t("loadingDocument")}
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

  const pending = generateMutation.isPending || updateMutation.isPending;

  return (
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

          <input
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
              setDocumentName(event.target.value);

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

      <div className="form-actions">
        <button
          className="btn secondary"
          type="button"
          onClick={() => router.push("/documents")}
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
    </section>
  );
}
