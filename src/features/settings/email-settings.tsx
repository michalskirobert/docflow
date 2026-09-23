"use client";

import { useEffect, useState } from "react";
import { Mail, Save, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { InputControl } from "@/components/shared/form";
import { Section } from "@/components/shared/layout";
import { useFeedback } from "@/components/ui/feedback-provider";
import { useDelete, useGet, usePut } from "@/hooks/use-api";

type EmailSettings = {
  configured: boolean;
  host?: string;
  port?: number;
  secure?: boolean;
  username?: string;
  fromEmail?: string;
  fromName?: string;
};

type EmailSettingsInput = {
  host: string;
  port: number;
  secure: boolean;
  username: string;
  password?: string;
  fromEmail: string;
  fromName?: string;
};

export default function EmailSettingsCard() {
  const t = useTranslations("settings");
  const { notify, confirm } = useFeedback();
  const query = useGet<EmailSettings>(["email-settings"], "/settings/email");
  const save = usePut<{ configured: boolean }, EmailSettingsInput>(
    "/settings/email",
    [["email-settings"]],
  );
  const remove = useDelete<{ ok: boolean }>("/settings/email", [
    ["email-settings"],
  ]);
  const [host, setHost] = useState("");
  const [port, setPort] = useState("587");
  const [secure, setSecure] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [fromEmail, setFromEmail] = useState("");
  const [fromName, setFromName] = useState("");

  useEffect(() => {
    if (!query.data?.configured) return;
    setHost(query.data.host ?? "");
    setPort(String(query.data.port ?? 587));
    setSecure(Boolean(query.data.secure));
    setUsername(query.data.username ?? "");
    setFromEmail(query.data.fromEmail ?? "");
    setFromName(query.data.fromName ?? "");
  }, [query.data]);

  const submit = async () => {
    const parsedPort = Number(port);
    if (
      !host.trim() ||
      !username.trim() ||
      !fromEmail.trim() ||
      !Number.isInteger(parsedPort)
    ) {
      notify(t("emailSettingsInvalid"), "error");
      return;
    }
    if (!query.data?.configured && !password) {
      notify(t("emailPasswordRequired"), "error");
      return;
    }
    try {
      await save.mutateAsync({
        host: host.trim(),
        port: parsedPort,
        secure,
        username: username.trim(),
        ...(password ? { password } : {}),
        fromEmail: fromEmail.trim(),
        fromName: fromName.trim() || undefined,
      });
      setPassword("");
      notify(t("emailSettingsSaved"), "success");
    } catch {
      notify(t("emailSettingsSaveError"), "error");
    }
  };

  const disconnect = async () => {
    if (
      !(await confirm({
        title: t("emailSettingsDisconnectTitle"),
        message: t("emailSettingsDisconnectMessage"),
        confirmLabel: t("emailSettingsDisconnect"),
        kind: "danger",
      }))
    )
      return;
    try {
      await remove.mutateAsync(undefined);
      setHost("");
      setPort("587");
      setSecure(false);
      setUsername("");
      setPassword("");
      setFromEmail("");
      setFromName("");
      notify(t("emailSettingsDisconnected"), "success");
    } catch {
      notify(t("emailSettingsSaveError"), "error");
    }
  };

  return (
    <Section className="settings-card email-settings-card">
      <div className="section-heading">
        <Mail size={20} />
        <div>
          <h2>{t("emailSending")}</h2>
          <p className="muted">{t("emailSendingHelp")}</p>
        </div>
      </div>
      <div className="email-settings-guide">
        <strong>{t("emailSetupGuideTitle")}</strong>
        <ol>
          <li>{t("emailSetupGuideServer")}</li>
          <li>{t("emailSetupGuideCredentials")}</li>
          <li>{t("emailSetupGuideSender")}</li>
        </ol>
        <p>{t("emailSetupGuideProvider")}</p>
      </div>
      <div className="email-settings-grid">
        <label className="field">
          <span>{t("smtpHost")}</span>
          <InputControl
            value={host}
            onChange={(e) => setHost(e.target.value)}
            placeholder="smtp.example.com"
          />
        </label>
        <label className="field">
          <span>{t("smtpPort")}</span>
          <InputControl
            type="number"
            min={1}
            max={65535}
            value={port}
            onChange={(e) => setPort(e.target.value)}
          />
        </label>
        <label className="field">
          <span>{t("smtpUsername")}</span>
          <InputControl
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
          />
        </label>
        <label className="field">
          <span>{t("smtpPassword")}</span>
          <InputControl
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            placeholder={query.data?.configured ? t("smtpPasswordKeep") : ""}
          />
        </label>
        <label className="field">
          <span>{t("senderEmail")}</span>
          <InputControl
            type="email"
            value={fromEmail}
            onChange={(e) => setFromEmail(e.target.value)}
          />
        </label>
        <label className="field">
          <span>{t("senderName")}</span>
          <InputControl
            value={fromName}
            onChange={(e) => setFromName(e.target.value)}
          />
        </label>
      </div>
      <label className="email-secure-toggle">
        <input
          type="checkbox"
          checked={secure}
          onChange={(e) => setSecure(e.target.checked)}
        />
        <span>{t("smtpSecure")}</span>
      </label>
      <p className="muted email-settings-warning">
        {t("emailSendingResponsibility")}
      </p>
      <div className="form-actions">
        {query.data?.configured && (
          <button
            className="btn secondary"
            type="button"
            disabled={remove.isPending || save.isPending}
            onClick={() => void disconnect()}
          >
            <Trash2 size={17} />
            {t("emailSettingsDisconnect")}
          </button>
        )}
        <button
          className="btn"
          type="button"
          disabled={save.isPending || remove.isPending || query.isLoading}
          onClick={() => void submit()}
        >
          <Save size={17} />
          {t("saveEmailSettings")}
        </button>
      </div>
    </Section>
  );
}
