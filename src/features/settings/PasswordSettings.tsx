"use client";
import { zodResolver } from "@hookform/resolvers/zod";
import axios from "axios";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { Button } from "@/components/shared/button";
import { FormField } from "@/components/shared/form";
import { useFeedback } from "@/components/ui/feedback-provider";
import { passwordSchema, type PasswordFormValues } from "./schema";
import { useChangePassword } from "./service";
export function PasswordSettings() {
  const t = useTranslations("settings");
  const auth = useTranslations("auth");
  const { notify } = useFeedback();
  const mutation = useChangePassword();
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });
  const msg = (e: any) =>
    e?.message ? auth(`validation.${String(e.message)}`) : undefined;
  const submit = handleSubmit(async (values) => {
    try {
      await mutation.mutateAsync(values);
      reset();
      notify(t("passwordChanged"), "success");
    } catch (e) {
      const code = axios.isAxiosError(e) ? e.response?.data?.code : undefined;
      if (code === "INVALID_CURRENT_PASSWORD") {
        setError("currentPassword", {
          type: "server",
          message: "invalidCurrentPassword",
        });
        return;
      }
      notify(t("passwordChangeError"), "error");
    }
  });
  return (
    <section className="card settings-card">
      <h2>{t("changePassword")}</h2>
      <p className="muted">{t("changePasswordHelp")}</p>
      <form onSubmit={submit} className="settings-form" noValidate>
        <FormField
          label={t("currentPassword")}
          type="password"
          requiredMark
          {...register("currentPassword")}
          error={
            errors.currentPassword?.message === "invalidCurrentPassword"
              ? t("invalidCurrentPassword")
              : msg(errors.currentPassword)
          }
        />
        <FormField
          label={t("newPassword")}
          type="password"
          requiredMark
          {...register("newPassword")}
          error={msg(errors.newPassword)}
        />
        <FormField
          label={t("confirmNewPassword")}
          type="password"
          requiredMark
          {...register("confirmPassword")}
          error={msg(errors.confirmPassword)}
        />
        <Button type="submit" loading={mutation.isPending}>
          {t("changePasswordAction")}
        </Button>
      </form>
    </section>
  );
}
