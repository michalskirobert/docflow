import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";

import { Providers } from "@/components/layout/providers";
import { routing } from "@/i18n/navigation";
import { siteConfig } from "@/lib/site";
import { isLocale, type Locale } from "@/i18n/config";
import { seoCopy } from "@/lib/seo";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  const locale: Locale = isLocale(rawLocale) ? rawLocale : "en";
  const copy = seoCopy[locale];

  return {
    metadataBase: new URL(siteConfig.url),
    title: { default: copy.title, template: "%s | DocFlow" },
    description: copy.description,
    applicationName: siteConfig.name,
    authors: [{ name: siteConfig.company, url: "https://nurbyte.dev" }],
    creator: siteConfig.company,
    publisher: siteConfig.company,
    category: "business software",
    referrer: "origin-when-cross-origin",
    formatDetection: { email: false, address: false, telephone: false },
    icons: {
      icon: [
        { url: "/favicon.ico", sizes: "48x48" },
        {
          url: "/brand/docflow-icon-192.png",
          type: "image/png",
          sizes: "192x192",
        },
        {
          url: "/brand/docflow-icon-512.png",
          type: "image/png",
          sizes: "512x512",
        },
      ],
      apple: [
        {
          url: "/brand/docflow-icon-180.png",
          sizes: "180x180",
          type: "image/png",
        },
      ],
    },
    openGraph: {
      type: "website",
      siteName: siteConfig.name,
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
}

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
    <NextIntlClientProvider messages={messages}>
      <Providers enableVercelInsights={process.env.VERCEL === "1"}>
        {children}
      </Providers>
    </NextIntlClientProvider>
  );
}
