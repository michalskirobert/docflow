"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Calculator } from "lucide-react";
import { Link } from "@/i18n/navigation";
import {
  evaluateFormula,
  validateFormula,
} from "@/features/templates/calculations";
import type { TemplateVariable } from "@/features/templates/types";

export default function CalculationsHelpPage() {
  const t = useTranslations("calculationHelp");
  const [formula, setFormula] = useState("{{quantity}} * {{price}}");
  const [quantity, setQuantity] = useState("4");
  const [price, setPrice] = useState("25");
  const playgroundVariables = useMemo<TemplateVariable[]>(
    () => [
      { name: "quantity", label: "Quantity", type: "number" },
      { name: "price", label: "Price", type: "number" },
    ],
    [],
  );
  const playground = useMemo(() => {
    const error = validateFormula(formula, playgroundVariables);
    if (error) return { error, result: null as number | null };
    try {
      return {
        error: null,
        result: evaluateFormula(formula, { quantity, price }),
      };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : t("invalid"),
        result: null,
      };
    }
  }, [formula, playgroundVariables, price, quantity, t]);

  return (
    <>
      <div className="page-heading calculation-help-heading">
        <nav className="calculation-breadcrumb" aria-label="Breadcrumb">
          <Link href="/help">{t("breadcrumb")}</Link>
          <span>/</span>
          <span>{t("title")}</span>
        </nav>
        <span className="eyebrow">{t("eyebrow")}</span>
        <h1>
          <Calculator size={26} /> {t("title")}
        </h1>
        <p className="muted">{t("description")}</p>
      </div>

      <div className="calculation-help-grid">
        <section className="card calculation-guide">
          <div className="calculation-step">
            <span>1</span>
            <div>
              <h2>{t("step1")}</h2>
              <code>24 * 25</code>
            </div>
          </div>
          <div className="calculation-step">
            <span>2</span>
            <div>
              <h2>{t("step2")}</h2>
              <code>{"24 * {{quantity}}"}</code>
            </div>
          </div>
          <div className="calculation-step">
            <span>3</span>
            <div>
              <h2>{t("step3")}</h2>
              <code>{"{{income}} * {{VAT}} - {{Insurance}}"}</code>
            </div>
          </div>
          <div className="calculation-info">
            <h2>{t("syntaxTitle")}</h2>
            <p className="muted">{t("syntax")}</p>
          </div>
          <div className="calculation-info">
            <h2>{t("validationTitle")}</h2>
            <p className="muted">{t("validation")}</p>
          </div>
        </section>

        <section className="card calculation-playground">
          <h2>{t("tryTitle")}</h2>
          <p className="muted">{t("tryDescription")}</p>
          <div className="form-grid two calculation-playground-values">
            <label className="field">
              <span>
                {t("quantity")} — <code>{"{{quantity}}"}</code>
              </span>
              <input
                type="number"
                value={quantity}
                onChange={(event) => setQuantity(event.target.value)}
              />
            </label>
            <label className="field">
              <span>
                {t("price")} — <code>{"{{price}}"}</code>
              </span>
              <input
                type="number"
                value={price}
                onChange={(event) => setPrice(event.target.value)}
              />
            </label>
          </div>
          <label className="field">
            <span>{t("formula")}</span>
            <input
              value={formula}
              onChange={(event) => setFormula(event.target.value)}
            />
          </label>
          <div
            className={`calculation-result${playground.error ? " invalid" : ""}`}
          >
            <span>{t("result")}</span>
            <strong>{playground.error ? "—" : playground.result}</strong>
          </div>
          {playground.error && (
            <small className="field-error">{playground.error}</small>
          )}
        </section>
      </div>
    </>
  );
}
