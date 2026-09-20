"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { useLocale, useTranslations } from "next-intl";
import { useEffect } from "react";
import { useForm, useWatch } from "react-hook-form";

import { useFeedback } from "@/components/ui/feedback-provider";
import { useRouter } from "@/i18n/navigation";
import { api } from "@/lib/axios";
import type { ApiError } from "@/types/api";
import type { AppLocale, CustomerType } from "@/types/auth";

import { FormField } from "./form-field";
import { registerSchema, type RegisterFormValues } from "./schema";
import { useCaptcha, useRegister } from "./service";

type PublicPlan = {
  code: "FREE" | "MONTHLY" | "YEARLY";
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
    if (!key) {
      return "";
    }

    return t(`validation.${key}`);
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

        notify(t("validation.captchaUnavailable"), "error");

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

      notify(t("registrationCreated"), "success");

      if (result.redirectUri) {
        window.location.assign(result.redirectUri);

        return;
      }

      router.push(
        `/registration-success?email=${encodeURIComponent(result.email)}`,
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

        notify(t("validation.emailExists"), "error");

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

        notify(t("validation.invalidCaptcha"), "error");

        return;
      }

      if (code === "PLAN_UNAVAILABLE") {
        setError("plan", {
          type: "server",
          message: "planUnavailable",
        });

        notify(t("validation.planUnavailable"), "error");

        return;
      }

      setError("root", {
        type: "server",
        message: "registrationFailed",
      });

      notify(t("registrationFailed"), "error");
    }
  });

  return (
    <form onSubmit={submit} className="auth-form wide" noValidate>
      <input type="hidden" {...register("locale")} />

      <input type="hidden" {...register("captchaToken")} />

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
        label={t("organization")}
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
        <label>
          <input
            type="radio"
            value="INDIVIDUAL"
            {...register("customerType")}
          />

          {t("privatePerson")}
        </label>

        <label>
          <input type="radio" value="BUSINESS" {...register("customerType")} />

          {t("business")}
        </label>
      </div>

      {customerType === "BUSINESS" && (
        <>
          <FormField
            label={t("companyName")}
            requiredMark
            {...register("companyName")}
            error={fieldError(errors.companyName)}
          />

          <div className="form-grid">
            <FormField
              label={t("taxId")}
              requiredMark
              {...register("taxId")}
              error={fieldError(errors.taxId)}
            />

            <FormField
              label={t("vatId")}
              {...register("vatId")}
              error={fieldError(errors.vatId)}
            />
          </div>
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
        <FormField
          label={t("countryCode")}
          requiredMark
          {...register("countryCode")}
          error={fieldError(errors.countryCode)}
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
          {...register("postalCode")}
          error={fieldError(errors.postalCode)}
        />
      </div>

      <h2>{t("choosePlan")}</h2>

      <div className="plan-grid">
        {plans.data?.map((plan) => (
          <label
            key={plan.code}
            className={`plan-card ${!plan.available ? "disabled" : ""}`}
          >
            <input
              type="radio"
              value={plan.code}
              disabled={!plan.available}
              {...register("plan")}
            />

            <strong>{plan.code}</strong>

            <span>
              {(plan.displayAmount / 100).toLocaleString(locale, {
                style: "currency",
                currency: "PLN",
              })}{" "}
              {plan.displayNet ? t("net") : t("gross")}
            </span>

            {plan.code !== "FREE" && (
              <small>
                {plan.displayNet ? `+ ${plan.vatRate}% VAT` : t("vatIncluded")}
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
        disabled={
          mutation.isPending || captcha.isLoading || !captcha.data?.token
        }
      >
        {mutation.isPending ? t("creatingAccount") : t("register")}
      </button>
    </form>
  );
}
