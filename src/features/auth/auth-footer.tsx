"use client";

import { version } from "../../../package.json";
import LanguageSwitcher from "@/features/language/language-switcher";

export function AuthFooter() {
  return (
    <footer className="auth-footer" aria-label="Authentication preferences">
      <span className="auth-footer-brand">
        © NurByte 2026 <span aria-hidden="true">·</span> DocFlow v{version}
      </span>
      <LanguageSwitcher compact />
    </footer>
  );
}
