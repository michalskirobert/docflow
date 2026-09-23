import "@/styles/globals.scss";

import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";

import { Providers } from "@/components/layout/providers";
import { routing } from "@/i18n/navigation";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export const metadata: Metadata = {
  title: {
    default: "DocFlow by NurByte",
    template: "%s | DocFlow",
  },
  description: "Document workflow automation by NurByte",
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
