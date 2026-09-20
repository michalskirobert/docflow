"use client";
import { zodResolver } from "@hookform/resolvers/zod";
import axios from "axios";
import { useTranslations } from "next-intl";
import { useEffect } from "react";
import { useForm, useWatch } from "react-hook-form";
import { Button } from "@/components/shared/button";
import { FormField, SelectField } from "@/components/shared/form";
import { useFeedback } from "@/components/ui/feedback-provider";
import { accountSchema, type AccountFormValues } from "./schema";
import { useAccountDetails, useUpdateAccount } from "./service";
export function AccountSettings() {
  const t = useTranslations("settings");
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
    formState: { errors },
  } = useForm<AccountFormValues>({ resolver: zodResolver(accountSchema) });
  const customerType = useWatch({ control, name: "customerType" });
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
      <section className="card settings-card">
        <div className="skeleton-line" />
        <div className="skeleton-line" />
      </section>
    );
  return (
    <section className="card settings-card">
      <h2>{t("accountData")}</h2>
      <p className="muted">{t("accountDataHelp")}</p>
      <form onSubmit={submit} className="settings-form" noValidate>
        <div className="form-grid">
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
          <SelectField
            label={t("customerType")}
            requiredMark
            disabled={!account.data?.canEditOrganization}
            {...register("customerType")}
            error={msg(errors.customerType)}
          >
            <option value="INDIVIDUAL">{t("individual")}</option>
            <option value="BUSINESS">{t("business")}</option>
          </SelectField>
          <FormField
            label={t("billingEmail")}
            type="email"
            requiredMark
            disabled={!account.data?.canEditOrganization}
            {...register("billingEmail")}
            error={msg(errors.billingEmail)}
          />
          {customerType === "BUSINESS" && (
            <>
              <FormField
                label={t("companyName")}
                requiredMark
                disabled={!account.data?.canEditOrganization}
                {...register("companyName")}
                error={msg(errors.companyName)}
              />
              <FormField
                label={t("taxId")}
                disabled={!account.data?.canEditOrganization}
                {...register("taxId")}
                error={msg(errors.taxId)}
              />
              <FormField
                label={t("vatId")}
                disabled={!account.data?.canEditOrganization}
                {...register("vatId")}
                error={msg(errors.vatId)}
              />
            </>
          )}
          <FormField
            label={t("countryCode")}
            requiredMark
            disabled={!account.data?.canEditOrganization}
            {...register("countryCode")}
            error={msg(errors.countryCode)}
          />
          <FormField
            label={t("street")}
            requiredMark
            disabled={!account.data?.canEditOrganization}
            {...register("street")}
            error={msg(errors.street)}
          />
          <FormField
            label={t("buildingNumber")}
            requiredMark
            disabled={!account.data?.canEditOrganization}
            {...register("buildingNumber")}
            error={msg(errors.buildingNumber)}
          />
          <FormField
            label={t("apartmentNumber")}
            disabled={!account.data?.canEditOrganization}
            {...register("apartmentNumber")}
            error={msg(errors.apartmentNumber)}
          />
          <FormField
            label={t("postalCode")}
            requiredMark
            disabled={!account.data?.canEditOrganization}
            {...register("postalCode")}
            error={msg(errors.postalCode)}
          />
          <FormField
            label={t("city")}
            requiredMark
            disabled={!account.data?.canEditOrganization}
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
