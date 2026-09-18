"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import {
  useCreateTemplateService,
  useDeleteTemplateService,
  useTemplatesService,
} from "./service";
import type { Template } from "./types";

export default function TemplateList() {
  const t = useTranslations("templates");
  const query = useTemplatesService();
  const create = useCreateTemplateService();
  const [showForm, setShowForm] = useState(false);

  return (
    <>
      <div className="row">
        <button
          className="btn"
          onClick={() => setShowForm((value) => !value)}
          type="button"
        >
          {t("new")}
        </button>
      </div>

      {showForm ? (
        <form
          className="card"
          style={{ marginTop: 16 }}
          onSubmit={(event) => {
            event.preventDefault();
            const form = new FormData(event.currentTarget);
            create.mutate(
              {
                name: String(form.get("name")),
                description: String(form.get("description") || ""),
                content: String(form.get("content")),
              },
              { onSuccess: () => setShowForm(false) },
            );
          }}
        >
          <label className="field">
            {t("name")}
            <input name="name" required />
          </label>
          <label className="field">
            {t("descriptionLabel")}
            <input name="description" />
          </label>
          <label className="field">
            {t("content")}
            <textarea
              name="content"
              placeholder="Hello {{customerName}}"
              required
            />
          </label>
          <button className="btn" type="submit">
            {t("create")}
          </button>
        </form>
      ) : null}

      <div className="grid">
        {query.data?.map((template) => (
          <TemplateCard key={template.id} template={template} />
        ))}
      </div>
    </>
  );
}

function TemplateCard({ template }: { template: Template }) {
  const t = useTranslations("templates");
  const remove = useDeleteTemplateService(template.id);
  const variables = JSON.parse(template.variablesJson) as string[];

  return (
    <article className="card">
      <div className="row">
        <h3>{template.name}</h3>
        {template.isExample ? (
          <span className="badge">{t("example")}</span>
        ) : null}
      </div>
      <p className="muted">{template.description}</p>
      <p>
        {t("variables")}: {variables.join(", ") || t("none")}
      </p>
      <button
        className="btn secondary"
        onClick={() => remove.mutate(undefined)}
        type="button"
      >
        {t("delete")}
      </button>
    </article>
  );
}
