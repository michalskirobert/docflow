"use client";
import { usePatch } from "@/hooks/use-api";
import type { Locale } from "@/i18n/config";
export function useUpdateLocale() {
  return usePatch<{ ok: boolean }, { locale: Locale }>("/api/users/me/locale");
}
