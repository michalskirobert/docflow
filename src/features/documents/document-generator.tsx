"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FormField, InputControl } from "@/components/shared/form";
import { HelpTooltip } from "@/components/ui/help-tooltip";
import {
  ArrowLeft,
  Clipboard,
  Check,
  Eye,
  FileText,
  LoaderCircle,
  Mail,
  Send,
  Save,
  Sparkles,
  X,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { useFeedback } from "@/components/ui/feedback-provider";
import { useUnsavedChanges } from "@/hooks/use-unsaved-changes";
import { PendingOverlay } from "@/components/ui/pending-overlay";
import { parseTemplateVariables } from "@/features/templates/types";
import { resolveCalculatedValues } from "@/features/templates/calculations";
import { formatTemplateNumber } from "@/features/templates/number-format";
import { TemplatePicker } from "./components/TemplatePicker";
import { DocumentPdfPreviewModal } from "./components/DocumentPdfPreviewModal";
import { VariableField } from "./components/VariableField";
import { validateVariable } from "./helpers";
import {
  useDocumentService,
  useDocumentTemplatesService,
  useDocumentTemplateService,
  useGenerateDocumentService,
  useRenderEmailService,
  useRenderDocumentEmailService,
  useRenderDocumentPreviewService,
  useEmailSettingsStatusService,
  useSendPreparedEmailService,
  useUpdateDocumentService,
} from "./service";
import type { RenderedEmail } from "./service";

const padDatePart = (value: number) => String(value).padStart(2, "0");
const currentVariableValue = (type: string, now = new Date()) => {
  const date = `${now.getFullYear()}-${padDatePart(now.getMonth() + 1)}-${padDatePart(now.getDate())}`;
  const time = `${padDatePart(now.getHours())}:${padDatePart(now.getMinutes())}`;
  if (type === "date") return date;
  if (type === "time") return time;
  if (type === "datetime") return `${date}T${time}`;
  return "";
};

const getInitialVariableValue = (
  variable: ReturnType<typeof parseTemplateVariables>[number],
  now: Date,
) => {
  // `current` is the persisted 2.1.x value. Keep the aliases so templates
  // created by an earlier hotfix still resolve instead of rendering empty.
  const mode = String(variable.defaultValueMode ?? "");
  if (["current", "currentDate", "now"].includes(mode)) {
    return currentVariableValue(variable.type, now);
  }
  return variable.defaultValue ?? "";
};

const getInitialTemplateValues = (variablesJson: string) => {
  // Use one Date instance for the whole form so date/time defaults are
  // internally consistent even when the minute changes during initialization.
  const now = new Date();
  return Object.fromEntries(
    parseTemplateVariables(variablesJson).map((variable) => [
      variable.name,
      getInitialVariableValue(variable, now),
    ]),
  );
};

export default function DocumentGenerator({
  documentId,
  mode = "document",
  sourceDocumentId,
}: {
  documentId?: string;
  mode?: "document" | "email";
  sourceDocumentId?: string;
}) {
  const t = useTranslations("documents");
  const router = useRouter();
  const { notify, confirm } = useFeedback();

  const templates = useDocumentTemplatesService(!sourceDocumentId);
  const documentQuery = useDocumentService(documentId ?? "");
  const generateMutation = useGenerateDocumentService();
  const updateMutation = useUpdateDocumentService(documentId ?? "");

  const isEditing = Boolean(documentId);
  const isEmailMode = mode === "email";

  const [templateId, setTemplateId] = useState("");
  const [documentName, setDocumentName] = useState("");
  const [documentNameError, setDocumentNameError] = useState("");
  const [emailSubject, setEmailSubject] = useState("");
  const [values, setValues] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [initialized, setInitialized] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [dirty, setDirty] = useState(false);
  const emailMutation = useRenderEmailService(templateId);
  const documentEmailMutation = useRenderDocumentEmailService(
    sourceDocumentId ?? "",
  );
  const sourceDocumentQuery = useDocumentService(sourceDocumentId ?? "");
  const sourceTemplateQuery = useDocumentTemplateService(
    sourceDocumentQuery.data?.templateId ?? "",
  );
  const documentPreviewMutation = useRenderDocumentPreviewService(templateId);
  const emailSettings = useEmailSettingsStatusService();
  const sendEmailMutation = useSendPreparedEmailService();
  const [recipientEmail, setRecipientEmail] = useState("");
  const [emailPreview, setEmailPreview] = useState<RenderedEmail | null>(null);
  const [documentPreviewHtml, setDocumentPreviewHtml] = useState<string | null>(
    null,
  );
  const [emailAction, setEmailAction] = useState<"preview" | "copy" | null>(
    null,
  );
  const [emailCopied, setEmailCopied] = useState(false);
  const copyFeedbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const documentNameRef = useRef<HTMLInputElement>(null);

  useEffect(
    () => () => {
      if (copyFeedbackTimer.current) clearTimeout(copyFeedbackTimer.current);
    },
    [],
  );

  useEffect(() => {
    if (!emailPreview) return;
    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setEmailPreview(null);
    };
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [emailPreview]);

  useEffect(() => {
    if (
      !isEmailMode ||
      !sourceDocumentId ||
      initialized ||
      !sourceDocumentQuery.data
    )
      return;
    const source = sourceDocumentQuery.data;
    setTemplateId(source.templateId ?? "");
    try {
      const payload = JSON.parse(source.payloadJson ?? "{}") as Record<
        string,
        unknown
      >;
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
  }, [initialized, isEmailMode, sourceDocumentId, sourceDocumentQuery.data]);

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

  const selected = sourceDocumentId
    ? sourceTemplateQuery.data
    : templates.data?.find((template) => template.id === templateId);

  const variables = useMemo(
    () => (selected ? parseTemplateVariables(selected.variablesJson) : []),
    [selected],
  );

  useEffect(() => {
    if (!isEmailMode || !selected) return;

    if (!emailSettings.data?.configured) {
      setEmailSubject("");
      return;
    }

    setEmailSubject((current) =>
      current.trim()
        ? current
        : selected.emailSubject?.trim() || selected.name || "",
    );
  }, [emailSettings.data?.configured, isEmailMode, selected]);

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

  const validateValues = () => {
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
        element?.scrollIntoView({ behavior: "smooth", block: "center" });
        element?.focus();
      });
      return false;
    }

    return true;
  };

  const renderEmail = async () => {
    if (!selected || !validateValues()) return null;
    try {
      if (sourceDocumentId) {
        return await documentEmailMutation.mutateAsync({
          subject: emailSubject.trim(),
          data: values,
        });
      }
      return await emailMutation.mutateAsync({
        data: values,
        subject: emailSubject.trim(),
      });
    } catch {
      notify(t("emailRenderError"), "error");
      return null;
    }
  };

  const previewEmail = async () => {
    if (emailAction) return;
    setEmailAction("preview");
    try {
      const email = await renderEmail();
      if (email) setEmailPreview(email);
    } finally {
      setEmailAction(null);
    }
  };

  const copyEmail = async () => {
    if (emailAction) return;
    setEmailAction("copy");
    const email = await renderEmail();
    if (!email) {
      setEmailAction(null);
      return;
    }

    try {
      if (typeof ClipboardItem !== "undefined" && navigator.clipboard?.write) {
        await navigator.clipboard.write([
          new ClipboardItem({
            "text/html": new Blob([email.html], { type: "text/html" }),
            "text/plain": new Blob([email.text], { type: "text/plain" }),
          }),
        ]);
      } else {
        await navigator.clipboard.writeText(email.text);
      }
      setEmailCopied(true);
      if (copyFeedbackTimer.current) clearTimeout(copyFeedbackTimer.current);
      copyFeedbackTimer.current = setTimeout(() => setEmailCopied(false), 1800);
      notify(t("emailCopied"), "success");
    } catch {
      notify(t("emailCopyError"), "error");
    } finally {
      setEmailAction(null);
    }
  };

  const sendPreparedEmail = async () => {
    if (!emailSettings.data?.configured) return;
    const recipient = recipientEmail.trim();
    if (!recipient || !recipient.includes("@")) {
      notify(t("recipientEmailRequired"), "error");
      return;
    }
    const email = await renderEmail();
    if (!email) return;
    try {
      await sendEmailMutation.mutateAsync({
        to: recipient,
        subject: email.subject,
        html: email.html,
        text: email.text,
      });
      notify(t("emailSent"), "success");
    } catch {
      notify(t("emailSendError"), "error");
    }
  };

  const downloadDocumentPreview = () => {
    if (!documentPreviewHtml) return;
    const anchor = document.createElement("a");
    anchor.href = documentPreviewHtml;
    anchor.download = `${(documentName || selected?.name || "document").replace(/[\\/:*?"<>|]+/g, "-")}.pdf`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
  };

  const previewDocument = async () => {
    if (!selected || documentPreviewMutation.isPending || !validateValues())
      return;
    try {
      const preview = await documentPreviewMutation.mutateAsync({
        data: values,
      });
      setDocumentPreviewHtml(preview.pdfDataUrl);
    } catch {
      notify(t("previewError"), "error");
    }
  };

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

    if (!validateValues()) return;

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

  if (
    isEmailMode &&
    sourceDocumentId &&
    (sourceDocumentQuery.isFetching ||
      sourceTemplateQuery.isFetching ||
      (!initialized &&
        !sourceDocumentQuery.isError &&
        !sourceTemplateQuery.isError))
  ) {
    return (
      <div
        className="document-generator-shell pending-form email-generator-loading"
        aria-busy="true"
      >
        <div className="form-actions document-sticky-actions">
          <button
            className="btn secondary"
            type="button"
            onClick={() => router.push("/documents")}
          >
            <ArrowLeft size={17} />
            {t("backToDocuments")}
          </button>
          <div className="email-header-actions">
            <button className="btn secondary" type="button" disabled>
              <Eye size={17} />
              {t("previewEmail")}
            </button>
            <button className="btn secondary" type="button" disabled>
              <Clipboard size={17} />
              {t("copyEmail")}
            </button>
            <button className="btn email-send-button" type="button" disabled>
              <Send size={17} />
              {t("sendEmail")}
            </button>
          </div>
        </div>
        <section className="card document-form-card email-form-skeleton">
          <div className="document-loading-heading">
            <span className="skeleton-icon" />
            <div>
              <span className="skeleton-line wide" />
              <span className="skeleton-line" />
            </div>
          </div>
          <div className="document-field-skeleton">
            <span className="skeleton-line short" />
            <span className="skeleton-input" />
          </div>
          <div className="document-field-skeleton">
            <span className="skeleton-line short" />
            <span className="skeleton-input" />
          </div>
          <div className="email-source-note-skeleton">
            <span className="skeleton-icon" />
            <div>
              <span className="skeleton-line wide" />
              <span className="skeleton-line" />
            </div>
          </div>
          {Array.from({ length: 5 }).map((_, index) => (
            <div className="document-field-skeleton" key={index}>
              <span className="skeleton-line short" />
              <span className="skeleton-input" />
            </div>
          ))}
        </section>
      </div>
    );
  }

  if (
    isEditing &&
    (documentQuery.isFetching || (!initialized && !documentQuery.isError))
  ) {
    return (
      <div className="document-generator-shell pending-form" aria-busy="true">
        <div className="form-actions document-sticky-actions">
          <button
            className="btn secondary"
            type="button"
            onClick={() => router.push("/documents")}
          >
            <ArrowLeft />
            {t("backToDocuments")}
          </button>
          <div className="document-primary-actions">
            <button className="btn secondary" type="button" disabled>
              <Eye size={17} />
              {t("preview")}
            </button>
            <button className="btn" type="button" disabled>
              <Save />
              {t("saveDocument")}
            </button>
          </div>
        </div>
        <section className="card document-form-card document-data-loading document-edit-form-skeleton">
          <div className="document-loading-heading">
            <span className="skeleton-icon" />
            <div>
              <span className="skeleton-line wide" />
              <span className="skeleton-line" />
            </div>
          </div>
          <div className="document-field-skeleton">
            <span className="skeleton-line short" />
            <span className="skeleton-input" />
          </div>
          {Array.from({ length: 5 }).map((_, index) => (
            <div className="document-field-skeleton" key={index}>
              <span className="skeleton-line short" />
              <span className="skeleton-input" />
            </div>
          ))}
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

  const documentPending =
    generateMutation.isPending || updateMutation.isPending || isRedirecting;
  const pending = isEmailMode ? false : documentPending;

  return (
    <div className="document-generator-shell pending-form" aria-busy={pending}>
      <PendingOverlay active={documentPending} label={t("saving")} />
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

        {isEmailMode ? (
          <div className="email-header-actions">
            <button
              className="btn secondary"
              type="button"
              disabled={!selected || emailAction !== null}
              onClick={() => void previewEmail()}
            >
              {emailAction === "preview" ? (
                <LoaderCircle className="spinner" size={17} />
              ) : (
                <Eye size={17} />
              )}
              {emailAction === "preview"
                ? t("preparingEmail")
                : t("previewEmail")}
            </button>
            <button
              className="btn secondary"
              type="button"
              disabled={!selected || emailAction !== null}
              onClick={() => void copyEmail()}
            >
              {emailAction === "copy" ? (
                <LoaderCircle className="spinner" size={17} />
              ) : emailCopied ? (
                <Check className="copy-success-icon" size={17} />
              ) : (
                <Clipboard size={17} />
              )}
              {emailAction === "copy"
                ? t("preparingEmail")
                : emailCopied
                  ? t("copied")
                  : t("copyEmail")}
            </button>
            <div className="email-send-action">
              <button
                className="btn email-send-button"
                type="button"
                disabled={
                  !selected ||
                  sendEmailMutation.isPending ||
                  !emailSettings.data?.configured ||
                  !recipientEmail.trim().includes("@")
                }
                onClick={() => void sendPreparedEmail()}
              >
                {sendEmailMutation.isPending ? (
                  <LoaderCircle className="spinner" size={17} />
                ) : (
                  <Send size={17} />
                )}
                {sendEmailMutation.isPending
                  ? t("sendingEmail")
                  : t("sendEmail")}
              </button>
              {(!emailSettings.data?.configured ||
                !recipientEmail.trim().includes("@")) && (
                <HelpTooltip
                  text={
                    !emailSettings.data?.configured
                      ? t("sendEmailSetupRequired")
                      : t("recipientEmailRequired")
                  }
                  label={
                    !emailSettings.data?.configured
                      ? t("sendEmailSetupRequired")
                      : t("recipientEmailRequired")
                  }
                />
              )}
            </div>
          </div>
        ) : (
          <div className="document-primary-actions">
            <button
              className="btn secondary"
              type="button"
              disabled={pending || documentPreviewMutation.isPending}
              onClick={() => void previewDocument()}
            >
              {documentPreviewMutation.isPending ? (
                <LoaderCircle className="spinner" size={17} />
              ) : (
                <Eye size={17} />
              )}
              {documentPreviewMutation.isPending
                ? t("preparingPreview")
                : t("preview")}
            </button>
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
          </div>
        )}
      </div>

      <section className="card document-form-card">
        <div className="section-heading">
          {isEmailMode ? <Mail /> : isEditing ? <Save /> : <Sparkles />}
          <div>
            <h2>
              {isEmailMode
                ? t("prepareEmailTitle")
                : isEditing
                  ? t("editFormTitle")
                  : t("generateTitle")}
            </h2>
            <p>
              {isEmailMode
                ? t("prepareEmailDescription")
                : isEditing
                  ? t("editFormDescription")
                  : t("generateDescription")}
            </p>
          </div>
        </div>

        {!isEditing && !sourceDocumentId && (
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
              // Choosing a template establishes the initial form state. It is
              // not a user edit by itself, so do not enable the leave guard.
              setDirty(false);

              setDocumentName(
                nextTemplate
                  ? `${nextTemplate.name} - ${new Date().toLocaleDateString()}`
                  : "",
              );

              setDocumentNameError("");
              setEmailSubject(
                emailSettings.data?.configured
                  ? nextTemplate?.emailSubject?.trim() ||
                      nextTemplate?.name ||
                      ""
                  : "",
              );
              setValues(
                nextTemplate
                  ? getInitialTemplateValues(nextTemplate.variablesJson)
                  : {},
              );
              setErrors({});
            }}
          />
        )}
        {selected && !isEmailMode && (
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

        {selected && isEmailMode && (
          <div
            className={
              !emailSettings.data?.configured
                ? "field-locked email-subject-locked"
                : undefined
            }
          >
            <FormField
              id="email-subject"
              label={t("emailSubject")}
              type="text"
              maxLength={250}
              value={emailSettings.data?.configured ? emailSubject : ""}
              disabled={!emailSettings.data?.configured}
              placeholder={
                emailSettings.data?.configured
                  ? t("emailSubjectPlaceholder")
                  : t("emailSubjectSetupPlaceholder")
              }
              onChange={(event) => {
                setEmailSubject(event.target.value);
                setDirty(true);
              }}
            />
            <div className="field-help-row">
              <small className="field-help">
                {emailSettings.data?.configured
                  ? t("emailSubjectOptional")
                  : t("emailSubjectSetupHelp")}
              </small>
            </div>
          </div>
        )}

        {selected && isEmailMode && emailSettings.data?.configured && (
          <div>
            <FormField
              id="recipient-email"
              label={t("recipientEmail")}
              type="email"
              value={recipientEmail}
              placeholder={t("recipientEmailPlaceholder")}
              onChange={(event) => setRecipientEmail(event.target.value)}
            />
            <small className="field-help">{t("recipientEmailHelp")}</small>
          </div>
        )}

        {sourceDocumentId &&
          (sourceDocumentQuery.isLoading ||
            sourceTemplateQuery.isLoading ||
            !initialized) && (
            <div
              className="email-source-loading email-form-skeleton"
              aria-busy="true"
            >
              <div className="email-source-note-skeleton">
                <span className="skeleton-icon" />
                <div>
                  <span className="skeleton-line wide" />
                  <span className="skeleton-line" />
                </div>
              </div>
              {Array.from({ length: 5 }).map((_, index) => (
                <div className="form-field-skeleton" key={index}>
                  <span className="skeleton-line skeleton-label" />
                  <span className="skeleton-control" />
                </div>
              ))}
            </div>
          )}

        {sourceDocumentId && sourceDocumentQuery.data && selected && (
          <div className="email-source-document" role="note">
            <FileText size={18} />
            <div>
              <strong>{t("emailFromDocument")}</strong>
              <p>
                {t("emailFromDocumentDescription", {
                  name: sourceDocumentQuery.data.name,
                })}
              </p>
            </div>
          </div>
        )}

        {variables.map((variable) => {
          let displayValue = values[variable.name] ?? "";
          if (variable.type === "formula") {
            try {
              const resolved = resolveCalculatedValues(variables, values);
              const result = resolved[variable.name];
              displayValue = typeof result === "number"
                ? formatTemplateNumber(result, variable)
                : String(result ?? "");
            } catch {
              displayValue = "—";
            }
          }
          return (
          <VariableField
            key={variable.name}
            variable={variable}
            value={displayValue}
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
          );
        })}

        {selected && isEmailMode && (
          <>
            {!emailSettings.data?.configured && (
              <div className="email-setup-notice" role="note">
                <Mail size={18} />
                <div>
                  <strong>{t("emailSetupNoticeTitle")}</strong>
                  <p>{t("emailSetupNoticeDescription")}</p>
                  <button
                    className="btn secondary compact"
                    type="button"
                    onClick={() => router.push("/settings")}
                  >
                    {t("openEmailSettings")}
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </section>

      {documentPreviewHtml && (
        <DocumentPdfPreviewModal
          title={documentName || selected?.name || ""}
          previewLabel={t("preview")}
          closeLabel={t("close")}
          printLabel={t("print")}
          downloadLabel={t("downloadPdf")}
          pdfUrl={documentPreviewHtml}
          onClose={() => setDocumentPreviewHtml(null)}
          onDownload={downloadDocumentPreview}
        />
      )}

      {emailPreview && (
        <div className="email-preview-backdrop" role="presentation">
          <section
            className="email-preview-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="email-preview-title"
          >
            <header className="email-preview-header">
              <div>
                <h2 id="email-preview-title">{t("emailPreviewTitle")}</h2>
                <p>{t("emailPreviewDescription")}</p>
              </div>
              <button
                type="button"
                className="btn secondary compact"
                aria-label={t("closeEmailPreview")}
                onClick={() => setEmailPreview(null)}
              >
                <X size={18} />
              </button>
            </header>
            {emailPreview.subject && (
              <div className="email-preview-subject">
                <strong>{t("emailSubject")}:</strong> {emailPreview.subject}
              </div>
            )}
            <div className="email-preview-frame-wrap">
              <iframe
                className="email-preview-frame"
                title={t("emailPreviewTitle")}
                srcDoc={emailPreview.html}
                sandbox=""
              />
            </div>
            <footer className="email-preview-actions">
              <button
                className="btn secondary"
                type="button"
                disabled={emailAction !== null}
                onClick={() => void copyEmail()}
              >
                {emailAction === "copy" ? (
                  <LoaderCircle className="spinner" size={17} />
                ) : emailCopied ? (
                  <Check className="copy-success-icon" size={17} />
                ) : (
                  <Clipboard size={17} />
                )}
                {emailAction === "copy"
                  ? t("preparingEmail")
                  : emailCopied
                    ? t("copied")
                    : t("copyEmail")}
              </button>
              <div className="email-send-action">
                <button
                  className="btn email-send-button"
                  type="button"
                  disabled={
                    sendEmailMutation.isPending ||
                    !emailSettings.data?.configured ||
                    !recipientEmail.trim().includes("@")
                  }
                  onClick={() => void sendPreparedEmail()}
                >
                  {sendEmailMutation.isPending ? (
                    <LoaderCircle className="spinner" size={17} />
                  ) : (
                    <Send size={17} />
                  )}
                  {sendEmailMutation.isPending
                    ? t("sendingEmail")
                    : t("sendEmail")}
                </button>
                {(!emailSettings.data?.configured ||
                  !recipientEmail.trim().includes("@")) && (
                  <HelpTooltip
                    text={
                      !emailSettings.data?.configured
                        ? t("sendEmailSetupRequired")
                        : t("recipientEmailRequired")
                    }
                    label={
                      !emailSettings.data?.configured
                        ? t("sendEmailSetupRequired")
                        : t("recipientEmailRequired")
                    }
                  />
                )}
              </div>
            </footer>
          </section>
        </div>
      )}
    </div>
  );
}
