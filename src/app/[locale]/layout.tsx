import "@/styles/globals.scss";

import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";

import { Providers } from "@/components/layout/providers";
import { routing } from "@/i18n/navigation";
import { siteConfig } from "@/lib/site";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: "DocFlow – dokumenty, szablony i fakturowanie | NurByte",
    template: "%s | DocFlow",
  },
  description: siteConfig.description,
  applicationName: siteConfig.name,
  authors: [{ name: siteConfig.company, url: "https://nurbyte.dev" }],
  creator: siteConfig.company,
  publisher: siteConfig.company,
  category: "business software",
  keywords: [
    "DocFlow",
    "obieg dokumentów",
    "generator dokumentów",
    "szablony dokumentów",
    "szablony e-mail",
    "fakturowanie",
    "automatyzacja dokumentów",
    "NurByte",
  ],
  alternates: {
    canonical: "/",
    languages: {
      "pl-PL": "/",
      "en-US": "/en",
      "id-ID": "/id",
      "x-default": "/",
    },
  },
  openGraph: {
    type: "website",
    url: "/",
    siteName: siteConfig.name,
    title: "DocFlow – dokumenty, szablony i fakturowanie",
    description: siteConfig.description,
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "DocFlow by NurByte Software Lab",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "DocFlow – dokumenty, szablony i fakturowanie",
    description: siteConfig.description,
    images: ["/opengraph-image"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  setRequestLocale(locale);
  const messages = await getMessages();

  return (
    <html lang={locale} suppressHydrationWarning>
      <body>
        <script
          suppressHydrationWarning
          dangerouslySetInnerHTML={{
            __html:
              '(function(){try{var t=localStorage.getItem("docflow-theme")||"system";var r=t==="system"?(matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"):t;document.documentElement.dataset.theme=r;document.documentElement.dataset.themePreference=t;document.documentElement.style.colorScheme=r}catch(e){}})();',
          }}
        />
        <NextIntlClientProvider messages={messages}>
          <Providers>{children}</Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
