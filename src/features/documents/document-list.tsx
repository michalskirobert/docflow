"use client";
import { useMemo, useState } from "react";
import {
  useDocumentsService,
  useDocumentTemplatesService,
  useGenerateDocumentService,
} from "./service";
export default function DocumentList() {
  const docs = useDocumentsService(),
    temps = useDocumentTemplatesService(),
    gen = useGenerateDocumentService();
  const [templateId, setTemplateId] = useState("");
  const [values, setValues] = useState<Record<string, string>>({});
  const selected = temps.data?.find((t) => t.id === templateId);
  const variables = useMemo(
    () => (selected ? (JSON.parse(selected.variablesJson) as string[]) : []),
    [selected],
  );
  return (
    <>
      <div className="card">
        <h3>Generate document</h3>
        <label className="field">
          Template
          <select
            value={templateId}
            onChange={(e) => {
              setTemplateId(e.target.value);
              setValues({});
            }}
          >
            <option value="">Choose...</option>
            {temps.data?.map((t) => (
              <option value={t.id} key={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </label>
        {variables.map((v) => (
          <label className="field" key={v}>
            {v}
            <input
              value={values[v] ?? ""}
              onChange={(e) =>
                setValues((x) => ({ ...x, [v]: e.target.value }))
              }
            />
          </label>
        ))}
        {selected && (
          <button
            className="btn"
            disabled={gen.isPending}
            onClick={() =>
              gen.mutate({
                templateId,
                name: `${selected.name} - ${new Date().toLocaleDateString()}`,
                data: values,
              })
            }
          >
            Generate
          </button>
        )}
        {gen.error && (
          <p className="error">Generation failed. Check subscription access.</p>
        )}
      </div>
      <div style={{ marginTop: 20 }}>
        {docs.data?.map((d) => (
          <article className="card" key={d.id} style={{ marginBottom: 12 }}>
            <div className="row">
              <h3>{d.name}</h3>
              <span className="badge">{d.template.name}</span>
            </div>
            <div className="doc">{d.renderedContent}</div>
          </article>
        ))}
      </div>
    </>
  );
}
