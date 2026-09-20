"use client";
import { useMemo, useState } from "react";
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
export default function DocumentList() {
  const docs = useDocumentsService(),
    temps = useDocumentTemplatesService(),
    gen = useGenerateDocumentService();
  const [templateId, setTemplateId] = useState("");
  const [values, setValues] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const selected = temps.data?.find((t) => t.id === templateId);
  const variables = useMemo(
    () => (selected ? parseTemplateVariables(selected.variablesJson) : []),
    [selected],
  );
  const generate = () => {
    if (!selected) return;
    const next = Object.fromEntries(
      variables
        .map((v) => [v.name, validateVariable(v, values[v.name] ?? "")])
        .filter(([, e]) => e),
    );
    setErrors(next);
    if (Object.keys(next).length) return;
    gen.mutate({
      templateId,
      name: `${selected.name} - ${new Date().toLocaleDateString()}`,
      data: values,
    });
  };
  return (
    <div className="documents-layout">
      <section className="card generator-card">
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
            setTemplateId(id);
            setValues({});
            setErrors({});
          }}
        />
        {variables.map((v) => (
          <VariableField
            key={v.name}
            variable={v}
            value={values[v.name] ?? ""}
            error={errors[v.name]}
            onChange={(value) => {
              setValues((x) => ({ ...x, [v.name]: value }));
              setErrors((x) => ({ ...x, [v.name]: "" }));
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
                <LoaderCircle className="spinner" size={17} /> Generating…
              </>
            ) : (
              <>
                <Sparkles size={17} /> Generate document
              </>
            )}
          </button>
        )}
        {gen.error && (
          <p className="error">
            Generation failed. Check the fields and license access.
          </p>
        )}
      </section>
      <DocumentHistory documents={docs.data ?? []} loading={docs.isLoading} />
    </div>
  );
}
