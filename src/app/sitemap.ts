import type { MetadataRoute } from "next";
import { siteConfig } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const locales = ["", "/en", "/id"];
  const publicRoutes = ["/login", "/register"];

  return locales.flatMap((locale) =>
    publicRoutes.map((route) => ({
      url: `${siteConfig.url}${locale}${route}`,
      lastModified: new Date(),
      changeFrequency: "monthly" as const,
      priority: route === "/login" ? 0.8 : 0.7,
    })),
  );
}
