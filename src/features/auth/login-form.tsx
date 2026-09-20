"use client";
import { zodResolver } from "@hookform/resolvers/zod";
import axios from "axios";
import { useLocale, useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { Link, useRouter } from "@/i18n/navigation";
import { useFeedback } from "@/components/ui/feedback-provider";
import { PendingOverlay } from "@/components/ui/pending-overlay";
import { LoaderCircle } from "lucide-react";
import type { ApiError } from "@/types/api";
import type { AppLocale } from "@/types/auth";
import { FormField } from "./form-field";
import { loginSchema, type LoginFormValues } from "./schema";
import { useLogin } from "./service";
export default function LoginForm() {
  const t = useTranslations("auth");
  const router = useRouter();
  const locale = useLocale() as AppLocale;
  const mutation = useLogin();
  const { notify } = useFeedback();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "", rememberMe: false },
  });
  const tr = (k?: string) => (k ? t(`validation.${k}`) : "");
  const submit = handleSubmit(async (values) => {
    try {
      const user = await mutation.mutateAsync(values);
      notify(t("loginSuccess"), "success");
      router.replace("/dashboard", { locale: user.locale ?? locale });
      router.refresh();
    } catch (error) {
      const code = axios.isAxiosError<ApiError & { code?: string }>(error)
        ? error.response?.data?.code
        : undefined;
      const msg =
        code === "EMAIL_NOT_VERIFIED"
          ? t("emailNotVerified")
          : t("invalidCredentials");
      setError("root", { message: msg });
      notify(msg, code === "EMAIL_NOT_VERIFIED" ? "warning" : "error");
    }
  });
  return (
    <form
      onSubmit={submit}
      className="auth-form pending-form"
      noValidate
      aria-busy={mutation.isPending}
    >
      <PendingOverlay active={mutation.isPending} label={t("signingIn")} />
      <fieldset disabled={mutation.isPending} className="pending-fieldset">
        <FormField
          label={t("email")}
          type="email"
          requiredMark
          {...register("email")}
          error={
            errors.email
              ? { ...errors.email, message: tr(String(errors.email.message)) }
              : undefined
          }
        />
        <FormField
          label={t("password")}
          type="password"
          requiredMark
          {...register("password")}
          error={
            errors.password
              ? {
                  ...errors.password,
                  message: tr(String(errors.password.message)),
                }
              : undefined
          }
        />
        <label className="checkbox">
          <input type="checkbox" {...register("rememberMe")} />
          {t("rememberMe")}
        </label>
        {errors.root && <p className="form-error">{errors.root.message}</p>}
        <button className="btn full" disabled={mutation.isPending}>
          {mutation.isPending && (
            <LoaderCircle className="spinner" aria-hidden="true" />
          )}
          {mutation.isPending ? t("signingIn") : t("signIn")}
        </button>
        <p className="auth-switch">
          {t("noAccount")} <Link href="/register">{t("createAccount")}</Link>
        </p>
      </fieldset>
    </form>
  );
}
