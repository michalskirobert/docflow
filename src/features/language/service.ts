"use client";
import { usePatch } from "@/hooks/use-api";
import type { Locale } from "@/i18n/config";
export function useUpdateLocale() {
  return usePatch<{ locale: Locale }, { ok: boolean }>("/api/users/me/locale");
}
