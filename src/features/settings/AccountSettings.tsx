"use client";
import { zodResolver } from "@hookform/resolvers/zod";
import axios from "axios";
import { useTranslations } from "next-intl";
import { useEffect } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { Button } from "@/components/shared/button";
import {
  FormField,
  SearchableSelectField,
  SelectField,
} from "@/components/shared/form";
import { useFeedback } from "@/components/ui/feedback-provider";
import { accountSchema, type AccountFormValues } from "./schema";
import { useAccountDetails, useUpdateAccount } from "./service";
import { useLocale } from "next-intl";
import {
  formatPostalCode,
  getCountryOptions,
  getPostalMaxLength,
  getPostalPlaceholder,
  isPostalNumeric,
} from "@/lib/countries";
export function AccountSettings() {
  const t = useTranslations("settings");
  const locale = useLocale();
  const auth = useTranslations("auth");
  const { notify } = useFeedback();
  const account = useAccountDetails();
  const update = useUpdateAccount();
  const {
    register,
    handleSubmit,
    reset,
    setError,
    control,
    setValue,
    formState: { errors },
  } = useForm<AccountFormValues>({ resolver: zodResolver(accountSchema) });
  const countryCode = useWatch({ control, name: "countryCode" }) || "PL";
  const customerType =
    useWatch({ control, name: "customerType" }) || "INDIVIDUAL";
  const countryOptions = getCountryOptions(locale);
  useEffect(() => {
    if (account.data) reset(account.data);
  }, [account.data, reset]);
  const msg = (error: any) =>
    error?.message ? auth(`validation.${String(error.message)}`) : undefined;
  const submit = handleSubmit(async (values) => {
    try {
      const result = await update.mutateAsync(values);
      notify(
        result.emailChanged ? t("profileSavedVerifyEmail") : t("profileSaved"),
        result.emailChanged ? "warning" : "success",
      );
    } catch (e) {
      const code = axios.isAxiosError(e) ? e.response?.data?.code : undefined;
      if (code === "EMAIL_EXISTS") {
        setError("email", { type: "server", message: "emailExists" });
        return;
      }
      notify(t("profileSaveError"), "error");
    }
  });
  if (account.isLoading)
    return (
      <section
        className="card settings-card settings-skeleton"
        aria-busy="true"
        aria-label={t("accountData")}
      >
        <div className="skeleton-line wide" />
        <div className="skeleton-line" />
        <div className="settings-skeleton-grid">
          {Array.from({ length: 10 }).map((_, index) => (
            <div className="settings-skeleton-field" key={index}>
              <div className="skeleton-line short" />
              <div className="settings-skeleton-input" />
            </div>
          ))}
        </div>
        <div className="settings-skeleton-button" />
      </section>
    );
  return (
    <section className="card settings-card">
      <h2>{t("accountData")}</h2>
      <p className="muted">{t("accountDataHelp")}</p>
      <form onSubmit={submit} className="settings-form" noValidate>
        <div className="form-grid account-details-grid">
          <FormField
            label={t("firstName")}
            requiredMark
            {...register("firstName")}
            error={msg(errors.firstName)}
          />
          <FormField
            label={t("lastName")}
            requiredMark
            {...register("lastName")}
            error={msg(errors.lastName)}
          />
          <FormField
            label={t("email")}
            type="email"
            requiredMark
            {...register("email")}
            error={msg(errors.email)}
          />
          <FormField
            label={t("organizationName")}
            requiredMark
            disabled={!account.data?.canEditOrganization}
            {...register("organizationName")}
            error={msg(errors.organizationName)}
          />
          <SelectField label={t("customerType")} {...register("customerType")}>
            <option value="INDIVIDUAL">{t("individual")}</option>
            <option value="BUSINESS">{t("business")}</option>
          </SelectField>
          <FormField
            label={t("billingEmail")}
            type="email"
            requiredMark
            {...register("billingEmail")}
            error={msg(errors.billingEmail)}
          />
          {customerType === "BUSINESS" && (
            <>
              <FormField
                label={t("companyName")}
                {...register("companyName")}
                error={msg(errors.companyName)}
              />
              <FormField
                label={t("taxId")}
                {...register("taxId")}
                error={msg(errors.taxId)}
              />
              <FormField
                label={t("vatId")}
                {...register("vatId")}
                error={msg(errors.vatId)}
              />
            </>
          )}
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
                error={msg(errors.countryCode)}
              />
            )}
          />
          <FormField
            label={t("street")}
            requiredMark
            {...register("street")}
            error={msg(errors.street)}
          />
          <FormField
            label={t("buildingNumber")}
            requiredMark
            {...register("buildingNumber")}
            error={msg(errors.buildingNumber)}
          />
          <FormField
            label={t("apartmentNumber")}
            {...register("apartmentNumber")}
            error={msg(errors.apartmentNumber)}
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
            error={msg(errors.postalCode)}
          />
          <FormField
            label={t("city")}
            requiredMark
            {...register("city")}
            error={msg(errors.city)}
          />
        </div>
        <Button type="submit" loading={update.isPending}>
          {t("saveChanges")}
        </Button>
      </form>
    </section>
  );
}
