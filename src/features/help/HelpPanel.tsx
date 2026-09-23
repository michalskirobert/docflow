"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import axios from "axios";
import {
  Bug,
  ChevronDown,
  Headphones,
  Lightbulb,
  RefreshCw,
  Send,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslations } from "next-intl";
import { Button } from "@/components/shared/button";
import { SelectField } from "@/components/shared/form";
import { PendingOverlay } from "@/components/ui/pending-overlay";
import { useFeedback } from "@/components/ui/feedback-provider";
import { api } from "@/lib/axios";
import type { CaptchaChallenge } from "@/types/auth";
import { supportSchema, type SupportFormValues } from "./schema";

const faqKeys = [
  "templates",
  "variables",
  "documents",
  "pdf",
  "billing",
  "account",
] as const;

export function HelpPanel() {
  const t = useTranslations("help");
  const { notify } = useFeedback();
  const [captcha, setCaptcha] = useState<CaptchaChallenge | null>(null);
  const [captchaLoading, setCaptchaLoading] = useState(false);
  const [openFaq, setOpenFaq] = useState<string | null>(faqKeys[0]);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<SupportFormValues>({
    resolver: zodResolver(supportSchema),
    defaultValues: {
      type: "SUPPORT",
      message: "",
      captchaToken: "",
      captchaAnswer: "",
    },
  });

  const loadCaptcha = async () => {
    setCaptchaLoading(true);
    try {
      const { data } = await api.get<CaptchaChallenge>("/auth/captcha");
      setCaptcha(data);
      setValue("captchaToken", data.token, { shouldValidate: false });
      setValue("captchaAnswer", "", { shouldValidate: false });
    } catch {
      notify(t("captchaLoadError"), "error");
    } finally {
      setCaptchaLoading(false);
    }
  };

  useEffect(() => {
    void loadCaptcha();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const errorText = (message?: string) =>
    message ? t(`validation.${message}`) : undefined;

  const submit = handleSubmit(async (values) => {
    try {
      const { data } = await api.post<{ caseNumber: string }>(
        "/support",
        values,
      );
      notify(t("sent", { caseNumber: data.caseNumber }), "success");
      reset({
        type: "SUPPORT",
        message: "",
        captchaToken: "",
        captchaAnswer: "",
      });
      await loadCaptcha();
    } catch (error) {
      const code = axios.isAxiosError(error)
        ? error.response?.data?.code
        : undefined;
      if (code === "INVALID_CAPTCHA") {
        setError("captchaAnswer", {
          type: "server",
          message: "invalidCaptcha",
        });
        await loadCaptcha();
        return;
      }
      notify(code === "RATE_LIMIT" ? t("rateLimit") : t("sendError"), "error");
      await loadCaptcha();
    }
  });

  return (
    <div className="help-layout">
      <section className="card help-card">
        <div className="section-heading">
          <Headphones />
          <div>
            <h2>{t("faqTitle")}</h2>
            <p>{t("faqDescription")}</p>
          </div>
        </div>
        <div className="faq-list">
          {faqKeys.map((key) => {
            const open = openFaq === key;
            return (
              <div className={`faq-item${open ? " open" : ""}`} key={key}>
                <button
                  type="button"
                  className="faq-question"
                  aria-expanded={open}
                  onClick={() => setOpenFaq(open ? null : key)}
                >
                  <span>{t(`faq.${key}.question`)}</span>
                  <ChevronDown size={18} />
                </button>
                {open && (
                  <div className="faq-answer">{t(`faq.${key}.answer`)}</div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <section className="card help-card support-card">
        <div className="section-heading">
          <Send />
          <div>
            <h2>{t("contactTitle")}</h2>
            <p>{t("contactDescription")}</p>
          </div>
        </div>
        <form
          className="support-form pending-form"
          onSubmit={submit}
          noValidate
        >
          <fieldset className="pending-fieldset" disabled={isSubmitting}>
            <SelectField
              label={t("type")}
              requiredMark
              {...register("type")}
              error={errorText(errors.type?.message)}
            >
              <option value="BUG">{t("types.bug")}</option>
              <option value="FEATURE">{t("types.feature")}</option>
              <option value="SUPPORT">{t("types.support")}</option>
            </SelectField>
            <label className={`field${errors.message ? " field-error" : ""}`}>
              <span className="field-label">
                {t("message")}
                <span className="required-mark" aria-hidden="true">
                  {" "}
                  *
                </span>
              </span>
              <textarea
                rows={8}
                maxLength={5000}
                {...register("message")}
                aria-invalid={Boolean(errors.message)}
                placeholder={t("messagePlaceholder")}
              />
              {errors.message && (
                <span className="field-error-message" role="alert">
                  {errorText(errors.message.message)}
                </span>
              )}
            </label>
            <input type="hidden" {...register("captchaToken")} />
            <label
              className={`field${errors.captchaAnswer ? " field-error" : ""}`}
            >
              <span className="field-label">
                {t("captcha")}
                <span className="required-mark" aria-hidden="true">
                  {" "}
                  *
                </span>
              </span>
              <div className="captcha-row">
                <div className="captcha-question" aria-live="polite">
                  {captchaLoading
                    ? t("captchaLoading")
                    : (captcha?.question ?? "—")}
                </div>
                <input
                  inputMode="numeric"
                  autoComplete="off"
                  {...register("captchaAnswer")}
                  aria-invalid={Boolean(errors.captchaAnswer)}
                />
                <button
                  type="button"
                  className="captcha-refresh"
                  onClick={() => void loadCaptcha()}
                  disabled={captchaLoading || isSubmitting}
                  aria-label={t("captchaRefresh")}
                  title={t("captchaRefresh")}
                >
                  <RefreshCw
                    size={17}
                    className={captchaLoading ? "spinner" : undefined}
                  />
                </button>
              </div>
              {errors.captchaAnswer && (
                <span className="field-error-message" role="alert">
                  {errorText(errors.captchaAnswer.message)}
                </span>
              )}
            </label>
            <div className="support-type-hint">
              <Bug size={16} />
              <Lightbulb size={16} />
              <Headphones size={16} />
              <span>{t("caseNumberHint")}</span>
            </div>
            <Button type="submit" loading={isSubmitting} disabled={!captcha}>
              {t("send")}
            </Button>
          </fieldset>
          <PendingOverlay active={isSubmitting} label={t("sending")} />
        </form>
      </section>
    </div>
  );
}
