"use client";

import { useMemo, useRef, useState } from "react";
import { LoaderCircle, Sparkles } from "lucide-react";
import {
  useDocumentsService,
  useDocumentTemplatesService,
  useGenerateDocumentService,
} from "./service";
import { parseTemplateVariables } from "@/features/templates/types";
import { TemplatePicker } from "./components/TemplatePicker";
import { VariableField } from "./components/VariableField";
import { DocumentHistory } from "./components/DocumentHistory";
import { validateVariable } from "./helpers";
import { useFeedback } from "@/components/ui/feedback-provider";

export default function DocumentList() {
  const docs = useDocumentsService();
  const temps = useDocumentTemplatesService();
  const gen = useGenerateDocumentService();

  const { notify } = useFeedback();

  const [templateId, setTemplateId] = useState("");
  const [values, setValues] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  const generatorRef = useRef<HTMLElement>(null);

  const selected = temps.data?.find((t) => t.id === templateId);

  const variables = useMemo(
    () => (selected ? parseTemplateVariables(selected.variablesJson) : []),
    [selected],
  );

  const generate = () => {
    if (!selected) {
      return;
    }

    const next = Object.fromEntries(
      variables
        .map((v) => [v.name, validateVariable(v, values[v.name] ?? "")])
        .filter(([, error]) => error),
    );

    setErrors(next);

    if (Object.keys(next).length) {
      const first = variables.find((v) => next[v.name]);

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

    gen.mutate(
      {
        templateId,
        name: `${selected.name} - ${new Date().toLocaleDateString()}`,
        data: values,
      },
      {
        onSuccess: () => {
          notify("Document generated successfully.", "success");

          setTemplateId("");
          setValues({});
          setErrors({});
        },
        onError: () => {
          notify("Document generation failed. Please try again.", "error");
        },
      },
    );
  };

  return (
    <div className="documents-layout">
      <section ref={generatorRef} className="card generator-card">
        <div className="section-heading">
          <Sparkles />

          <div>
            <h2>Generate document</h2>

            <p>
              Find a template and complete the fields defined by its author.
            </p>
          </div>
        </div>

        <TemplatePicker
          templates={temps.data ?? []}
          loading={temps.isLoading}
          value={templateId}
          onChange={(id) => {
            const nextId = id === templateId ? "" : id;

            setTemplateId(nextId);
            setValues({});
            setErrors({});
          }}
        />

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

        {selected && (
          <button
            className="btn full"
            disabled={gen.isPending}
            onClick={generate}
          >
            {gen.isPending ? (
              <>
                <LoaderCircle className="spinner" size={17} />
                Generating…
              </>
            ) : (
              <>
                <Sparkles size={17} />
                Generate document
              </>
            )}
          </button>
        )}
      </section>

      <DocumentHistory documents={docs.data ?? []} loading={docs.isLoading} />
    </div>
  );
}
