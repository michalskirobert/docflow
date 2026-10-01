import type { Metadata } from "next";
import type { Locale } from "@/i18n/config";

export const seoCopy = {
  en: {
    title: "DocFlow – Online document generator and reusable templates",
    description:
      "Create documents online from reusable templates, variables, tables and calculations. Generate PDFs and prepare formatted emails in one DocFlow workspace.",
    ogTitle: "Create documents. Build templates. Generate PDFs.",
    ogDescription:
      "Reusable document templates, calculated variables, PDF generation and email preparation in one workspace.",
  },
  pl: {
    title: "DocFlow – generator dokumentów i szablonów online",
    description:
      "Twórz dokumenty online z szablonów wielokrotnego użytku, zmiennych, tabel i obliczeń. Generuj PDF i przygotowuj sformatowane wiadomości e-mail w DocFlow.",
    ogTitle: "Twórz dokumenty. Buduj szablony. Generuj PDF.",
    ogDescription:
      "Szablony dokumentów, zmienne obliczeniowe, generowanie PDF i przygotowanie e-maili w jednym miejscu.",
  },
  id: {
    title: "DocFlow – pembuat dokumen online dan template dokumen",
    description:
      "Buat dokumen online dari template yang dapat digunakan kembali, variabel, tabel, dan perhitungan. Hasilkan PDF dan siapkan email terformat dengan DocFlow.",
    ogTitle: "Buat dokumen. Susun template. Hasilkan PDF.",
    ogDescription:
      "Template dokumen, variabel perhitungan, pembuatan PDF, dan persiapan email dalam satu workspace.",
  },
} satisfies Record<
  Locale,
  { title: string; description: string; ogTitle: string; ogDescription: string }
>;

export function localePrefix(locale: Locale) {
  return locale === "en" ? "" : `/${locale}`;
}

export function localizedPath(locale: Locale, path: string) {
  return `${localePrefix(locale)}${path}` || "/";
}

export function languageAlternates(
  path: string,
): NonNullable<Metadata["alternates"]>["languages"] {
  return {
    en: localizedPath("en", path),
    pl: localizedPath("pl", path),
    id: localizedPath("id", path),
    "x-default": localizedPath("en", path),
  };
}

export function publicPageMetadata(
  locale: Locale,
  path: "/login" | "/register",
): Metadata {
  const copy = seoCopy[locale];
  const canonical = localizedPath(locale, path);
  const isRegister = path === "/register";
  const title = isRegister
    ? locale === "pl"
      ? "Załóż konto – generator dokumentów online"
      : locale === "id"
        ? "Buat akun – pembuat dokumen online"
        : "Create an account – online document generator"
    : copy.title;

  return {
    title,
    description: copy.description,
    alternates: {
      canonical,
      languages: languageAlternates(path),
    },
    openGraph: {
      type: "website",
      url: canonical,
      siteName: "DocFlow",
      locale: locale === "pl" ? "pl_PL" : locale === "id" ? "id_ID" : "en_US",
      title: copy.ogTitle,
      description: copy.ogDescription,
      images: [
        {
          url: "/social/docflow-social-preview.png",
          width: 1200,
          height: 630,
          alt: "DocFlow by NurByte – document creation, templates, PDF and email workflow",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: copy.ogTitle,
      description: copy.ogDescription,
      images: ["/social/docflow-social-preview.png"],
    },
  };
}
