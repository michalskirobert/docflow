"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";

import { useFeedback } from "@/components/ui/feedback-provider";
import {
  ChoiceField,
  InputControl,
  SearchableSelectField,
} from "@/components/shared/form";
import { PendingOverlay } from "@/components/ui/pending-overlay";
import { LoaderCircle } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { api } from "@/lib/axios";
import {
  formatPostalCode,
  getCountryOptions,
  getPostalMaxLength,
  getPostalPlaceholder,
  isPostalNumeric,
} from "@/lib/countries";
import type { ApiError } from "@/types/api";
import type { AppLocale, CustomerType } from "@/types/auth";

import { FormField } from "./form-field";
import { registerSchema, type RegisterFormValues } from "./schema";
import { useCaptcha, useRegister } from "./service";

type PublicPlan = {
  code: "FREE" | "YEARLY";
  documentLimit: number;
  net: number;
  vat: number;
  gross: number;
  vatRate: number;
  available: boolean;
  displayAmount: number;
  displayNet: boolean;
};

export default function RegisterForm() {
  const t = useTranslations("auth");
  const locale = useLocale() as AppLocale;
  const router = useRouter();

  const { notify } = useFeedback();
  const captcha = useCaptcha();
  const mutation = useRegister();
  const [isRedirecting, setIsRedirecting] = useState(false);

  const {
    register,
    handleSubmit,
    setError,
    setValue,
    resetField,
    control,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      organizationName: "",
      email: "",
      password: "",
      confirmPassword: "",
      customerType: "INDIVIDUAL",
      billingEmail: "",
      companyName: "",
      taxId: "",
      vatId: "",
      countryCode: "PL",
      street: "",
      buildingNumber: "",
      apartmentNumber: "",
      postalCode: "",
      city: "",
      plan: "FREE",
      paymentMethod: "PAYU",
      locale,
      captchaToken: "",
      captchaAnswer: "",
    },
  });

  const customerType = useWatch({
    control,
    name: "customerType",
  }) as CustomerType;

  const email = useWatch({
    control,
    name: "email",
  });
  const selectedPlan = useWatch({ control, name: "plan" });
  const countryCode = useWatch({ control, name: "countryCode" }) || "PL";
  const countryOptions = getCountryOptions(locale);
  const paymentMethod = useWatch({ control, name: "paymentMethod" });
  const taxId = useWatch({ control, name: "taxId" });
  const [companyLoading, setCompanyLoading] = useState(false);
  const [companyMessage, setCompanyMessage] = useState("");
  const lookupCompany = async () => {
    const nip = (taxId ?? "").replace(/\D/g, "");
    if (nip.length !== 10) {
      setError("taxId", { type: "manual", message: "invalidNipLookup" });
      return;
    }
    setCompanyLoading(true);
    setCompanyMessage("");
    try {
      const { data } = await api.get(`/company-data?nip=${nip}`);
      setValue("companyName", data.companyName ?? "");
      setValue("taxId", data.taxId ?? nip);
      setValue("countryCode", "PL");
      if (data.street) setValue("street", data.street);
      if (data.buildingNumber) setValue("buildingNumber", data.buildingNumber);
      if (data.postalCode) setValue("postalCode", data.postalCode);
      if (data.city) setValue("city", data.city);
      setCompanyMessage(t("companyLoaded"));
    } catch {
      setError("taxId", { type: "manual", message: "companyNotFound" });
    } finally {
      setCompanyLoading(false);
    }
  };

  const plans = useQuery({
    queryKey: ["plans", customerType],
    queryFn: async () => {
      const response = await api.get<PublicPlan[]>(
        `/plans?customerType=${customerType}`,
      );

      return response.data;
    },
  });

  useEffect(() => {
    setValue("locale", locale);
  }, [locale, setValue]);

  useEffect(() => {
    if (customerType === "BUSINESS" && selectedPlan === "FREE") {
      setValue("plan", "YEARLY", { shouldDirty: true, shouldValidate: true });
    }
  }, [customerType, selectedPlan, setValue]);

  useEffect(() => {
    if (!email) {
      return;
    }

    setValue("billingEmail", email, {
      shouldDirty: false,
    });
  }, [email, setValue]);

  useEffect(() => {
    if (!captcha.data?.token) {
      return;
    }

    setValue("captchaToken", captcha.data.token, {
      shouldDirty: false,
      shouldValidate: false,
    });
  }, [captcha.data?.token, setValue]);

  const translateValidation = (key?: string) => {
    if (!key) return "";
    const normalizedKey = key
      .replace(/^auth\.validation\./, "")
      .replace(/^validation\./, "");
    return t(`validation.${normalizedKey}`);
  };

  const fieldError = (error: any) => {
    if (!error) {
      return undefined;
    }

    return {
      ...error,
      message: translateValidation(String(error.message)),
    };
  };

  async function refreshCaptcha() {
    const result = await captcha.refetch();

    resetField("captchaAnswer", {
      defaultValue: "",
    });

    if (!result.data?.token) {
      setValue("captchaToken", "", {
        shouldDirty: false,
        shouldValidate: false,
      });

      return;
    }

    setValue("captchaToken", result.data.token, {
      shouldDirty: false,
      shouldValidate: false,
    });
  }

  const submit = handleSubmit(async (values) => {
    try {
      /*
       * The question displayed to the user comes directly
       * from captcha.data.
       *
       * Therefore we also submit the token directly from
       * captcha.data instead of trusting the hidden RHF value.
       *
       * This prevents:
       *
       * question A + token B
       */
      const currentCaptchaToken = captcha.data?.token;

      if (!currentCaptchaToken) {
        setError("captchaAnswer", {
          type: "server",
          message: "captchaUnavailable",
        });

        await refreshCaptcha();

        return;
      }

      const result = await mutation.mutateAsync({
        ...values,

        /*
         * Explicitly overwrite the hidden form value
         * with the token belonging to the currently
         * rendered challenge.
         */
        captchaToken: currentCaptchaToken,

        captchaAnswer: values.captchaAnswer.trim(),
      });

      setIsRedirecting(true);
      notify(t("registrationCreated"), "success");

      router.push(
        `/registration-success?email=${encodeURIComponent(result.email)}${result.paymentMethod === "BANK_TRANSFER" ? `&payment=bank&reference=${encodeURIComponent(result.transferReference ?? "")}` : ""}`,
      );
    } catch (error) {
      const response = axios.isAxiosError<
        ApiError & {
          code?: string;
        }
      >(error)
        ? error.response
        : undefined;

      const code = response?.data?.code;

      if (code === "EMAIL_EXISTS") {
        setError("email", {
          type: "server",
          message: "emailExists",
        });

        return;
      }

      if (code === "INVALID_CAPTCHA") {
        /*
         * Refresh FIRST.
         *
         * refreshCaptcha() resets captchaAnswer,
         * therefore setError() must happen afterwards.
         */
        await refreshCaptcha();

        setError("captchaAnswer", {
          type: "server",
          message: "invalidCaptcha",
        });

        return;
      }

      if (code === "PLAN_UNAVAILABLE") {
        setError("plan", {
          type: "server",
          message: "planUnavailable",
        });

        return;
      }

      setError("root", {
        type: "server",
        message: "registrationFailed",
      });
    }
  });

  const pending = mutation.isPending || isRedirecting;

  return (
    <form
      onSubmit={submit}
      className="auth-form wide pending-form"
      noValidate
      aria-busy={pending}
    >
      <PendingOverlay active={pending} label={t("creatingAccount")} />
      <fieldset disabled={pending} className="pending-fieldset">
        <InputControl type="hidden" {...register("locale")} />

        <InputControl type="hidden" {...register("captchaToken")} />

        <h2>{t("accountDetails")}</h2>

        <div className="form-grid">
          <FormField
            label={t("firstName")}
            requiredMark
            {...register("firstName")}
            error={fieldError(errors.firstName)}
          />

          <FormField
            label={t("lastName")}
            requiredMark
            {...register("lastName")}
            error={fieldError(errors.lastName)}
          />
        </div>

        <FormField
          label={
            customerType === "INDIVIDUAL"
              ? t("workspaceName")
              : t("organization")
          }
          requiredMark
          {...register("organizationName")}
          error={fieldError(errors.organizationName)}
        />

        <FormField
          label={t("email")}
          type="email"
          requiredMark
          autoComplete="email"
          {...register("email")}
          error={fieldError(errors.email)}
        />

        <div className="form-grid">
          <FormField
            label={t("password")}
            type="password"
            requiredMark
            autoComplete="new-password"
            {...register("password")}
            error={fieldError(errors.password)}
          />

          <FormField
            label={t("confirmPassword")}
            type="password"
            requiredMark
            autoComplete="new-password"
            {...register("confirmPassword")}
            error={fieldError(errors.confirmPassword)}
          />
        </div>

        <h2>{t("billing")}</h2>

        <div className="segmented">
          <ChoiceField
            type="radio"
            value="INDIVIDUAL"
            label={t("privatePerson")}
            {...register("customerType")}
          />
          <ChoiceField
            type="radio"
            value="BUSINESS"
            label={t("business")}
            {...register("customerType")}
          />
        </div>

        {customerType === "BUSINESS" && (
          <>
            <FormField
              label={t("companyName")}
              requiredMark
              {...register("companyName")}
              error={fieldError(errors.companyName)}
            />

            <div className="nip-row">
              <FormField
                label={t("taxId")}
                requiredMark
                {...register("taxId")}
                error={fieldError(errors.taxId)}
              />
              <button
                type="button"
                className="btn secondary"
                onClick={lookupCompany}
                disabled={companyLoading}
              >
                {companyLoading ? t("companyLoading") : t("fetchCompany")}
              </button>
            </div>
            {companyMessage && <p className="hint">{companyMessage}</p>}
            <FormField
              label={t("vatId")}
              {...register("vatId")}
              error={fieldError(errors.vatId)}
            />
          </>
        )}

        <FormField
          label={t("billingEmail")}
          type="email"
          requiredMark
          autoComplete="email"
          {...register("billingEmail")}
          error={fieldError(errors.billingEmail)}
        />

        <div className="form-grid">
          <Controller
            name="countryCode"
            control={control}
            render={({ field }) => (
              <SearchableSelectField
                label={t("country")}
                requiredMark
                value={field.value || "PL"}
                options={countryOptions.map((country) => ({
                  value: country.code,
                  label: country.label,
                }))}
                onChange={(value) => {
                  field.onChange(value);
                  setValue("postalCode", "", { shouldValidate: true });
                }}
                error={fieldError(errors.countryCode)}
              />
            )}
          />

          <FormField
            label={t("city")}
            requiredMark
            autoComplete="address-level2"
            {...register("city")}
            error={fieldError(errors.city)}
          />
        </div>

        <div className="form-grid">
          <FormField
            label={t("street")}
            requiredMark
            autoComplete="address-line1"
            {...register("street")}
            error={fieldError(errors.street)}
          />

          <FormField
            label={t("buildingNumber")}
            requiredMark
            {...register("buildingNumber")}
            error={fieldError(errors.buildingNumber)}
          />
        </div>

        <div className="form-grid">
          <FormField
            label={t("apartmentNumber")}
            {...register("apartmentNumber")}
            error={fieldError(errors.apartmentNumber)}
          />

          <FormField
            label={t("postalCode")}
            requiredMark
            autoComplete="postal-code"
            placeholder={getPostalPlaceholder(countryCode)}
            maxLength={getPostalMaxLength(countryCode)}
            inputMode={isPostalNumeric(countryCode) ? "numeric" : "text"}
            onInput={(event) => {
              event.currentTarget.value = formatPostalCode(
                countryCode,
                event.currentTarget.value,
              );
            }}
            {...register("postalCode")}
            error={fieldError(errors.postalCode)}
          />
        </div>

        <h2>{t("choosePlan")}</h2>

        <div className="plan-grid">
          {plans.data?.map((plan) => (
            <label
              key={plan.code}
              className={`plan-card ${!plan.available ? "disabled" : ""} ${selectedPlan === plan.code ? "selected" : ""}`}
            >
              <input
                className="plan-radio"
                type="radio"
                value={plan.code}
                disabled={!plan.available}
                aria-label={
                  plan.code === "FREE" ? t("freeLicense") : t("annualLicense")
                }
                {...register("plan")}
              />

              <div className="plan-visual" aria-hidden="true">
                <span>{plan.code === "FREE" ? "✦" : "◆"}</span>
              </div>
              <div className="plan-check">✓</div>
              <strong className="plan-name">
                {plan.code === "FREE" ? t("freeLicense") : t("annualLicense")}
              </strong>
              <small className="plan-copy">
                {plan.code === "FREE"
                  ? t("freeLicenseCopy")
                  : t("annualLicenseCopy")}
              </small>

              <span>
                {(plan.displayAmount / 100).toLocaleString(locale, {
                  style: "currency",
                  currency: "PLN",
                })}{" "}
                {plan.displayNet ? t("net") : t("gross")}
              </span>

              {plan.code !== "FREE" && (
                <small>
                  {plan.displayNet
                    ? `+ ${plan.vatRate}% VAT`
                    : t("vatIncluded")}
                </small>
              )}

              <small>
                {plan.documentLimit} {t("documentsPerMonth")}
              </small>
            </label>
          ))}
        </div>

        {errors.plan && (
          <p className="form-error">
            {translateValidation(String(errors.plan.message))}
          </p>
        )}

        {selectedPlan === "YEARLY" && (
          <>
            <h2>{t("paymentMethod")}</h2>
            <div className="payment-methods">
              <label
                className={`payment-option ${paymentMethod === "PAYU" ? "selected" : ""}`}
              >
                <ChoiceField
                  type="radio"
                  value="PAYU"
                  {...register("paymentMethod")}
                />
                <div>
                  <strong>{t("payu")}</strong>
                  <small>{t("payuCopy")}</small>
                </div>
              </label>
              <label
                className={`payment-option ${paymentMethod === "BANK_TRANSFER" ? "selected" : ""}`}
              >
                <ChoiceField
                  type="radio"
                  value="BANK_TRANSFER"
                  {...register("paymentMethod")}
                />
                <div>
                  <strong>{t("bankTransfer")}</strong>
                  <small>{t("bankTransferCopy")}</small>
                </div>
              </label>
            </div>
            <p className="hint">{t("freeWhilePaymentPending")}</p>
          </>
        )}

        <div
          className={`captcha-box${errors.captchaAnswer ? " captcha-error" : ""}`}
        >
          <div>
            <strong>{t("verification")} *</strong>

            <p>
              {captcha.isLoading ? t("loadingCaptcha") : captcha.data?.question}
            </p>
          </div>

          <button
            type="button"
            className="btn secondary"
            onClick={refreshCaptcha}
            disabled={captcha.isFetching}
          >
            {t("newChallenge")}
          </button>
        </div>

        <FormField
          label={t("answer")}
          requiredMark
          inputMode="numeric"
          autoComplete="off"
          {...register("captchaAnswer")}
          error={fieldError(errors.captchaAnswer)}
        />

        {errors.root && (
          <p className="form-error">{t(String(errors.root.message))}</p>
        )}

        <button
          className="btn full"
          disabled={pending || captcha.isLoading || !captcha.data?.token}
        >
          {mutation.isPending && (
            <LoaderCircle className="spinner" aria-hidden="true" />
          )}
          {mutation.isPending ? t("creatingAccount") : t("register")}
        </button>
      </fieldset>
    </form>
  );
}
