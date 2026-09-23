"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useTranslations } from "next-intl";
import LanguageSwitcher from "@/features/language/language-switcher";
import { Section } from "@/components/shared/layout";
import EmailSettingsCard from "./email-settings";
import {
  type ThemePreference,
  useTheme,
} from "@/components/layout/theme-provider";

export default function PreferencesSettings() {
  const t = useTranslations("settings");
  const { theme, setTheme } = useTheme();
  const options: Array<{
    value: ThemePreference;
    icon: typeof Sun;
    label: string;
    help: string;
  }> = [
    {
      value: "system",
      icon: Monitor,
      label: t("themeSystem"),
      help: t("themeSystemHelp"),
    },
    {
      value: "light",
      icon: Sun,
      label: t("themeLight"),
      help: t("themeLightHelp"),
    },
    {
      value: "dark",
      icon: Moon,
      label: t("themeDark"),
      help: t("themeDarkHelp"),
    },
  ];
  return (
    <div className="settings-grid preferences-grid">
      <div className="settings-column">
        <Section className="settings-card">
          <h2>{t("language")}</h2>
          <p className="muted">{t("languageHelp")}</p>
          <LanguageSwitcher />
        </Section>
        <Section className="settings-card">
          <h2>{t("appearance")}</h2>
          <p className="muted">{t("appearanceHelp")}</p>
          <div
            className="theme-options"
            role="radiogroup"
            aria-label={t("appearance")}
          >
            {options.map(({ value, icon: Icon, label, help }) => (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={theme === value}
                className={`theme-option ${theme === value ? "selected" : ""}`}
                onClick={() => setTheme(value)}
              >
                <Icon size={20} />
                <span>
                  <strong>{label}</strong>
                  <small>{help}</small>
                </span>
                <span className="theme-radio" aria-hidden="true" />
              </button>
            ))}
          </div>
        </Section>
      </div>
      <div className="settings-column">
        <EmailSettingsCard />
      </div>
    </div>
  );
}
