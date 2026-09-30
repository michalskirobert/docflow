import type { MetadataRoute } from "next";
import { siteConfig } from "@/lib/site";
import { localizedPath } from "@/lib/seo";
import type { Locale } from "@/i18n/config";

export default function sitemap(): MetadataRoute.Sitemap {
  const locales: Locale[] = ["en", "pl", "id"];
  const routes = [
    { path: "/login" as const, priority: 1 },
    { path: "/register" as const, priority: 0.8 },
  ];

  return locales.flatMap((locale) =>
    routes.map(({ path, priority }) => ({
      url: `${siteConfig.url}${localizedPath(locale, path)}`,
      changeFrequency: "weekly" as const,
      priority,
      alternates: {
        languages: {
          en: `${siteConfig.url}${localizedPath("en", path)}`,
          pl: `${siteConfig.url}${localizedPath("pl", path)}`,
          id: `${siteConfig.url}${localizedPath("id", path)}`,
        },
      },
    })),
  );
}
