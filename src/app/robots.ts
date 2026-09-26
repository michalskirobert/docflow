import type { MetadataRoute } from "next";
import { siteConfig } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: [
        "/",
        "/login",
        "/register",
        "/en/login",
        "/en/register",
        "/id/login",
        "/id/register",
      ],
      disallow: [
        "/api/",
        "/admin",
        "/dashboard",
        "/documents",
        "/templates",
        "/settings",
        "/account",
        "/*/admin",
        "/*/dashboard",
        "/*/documents",
        "/*/templates",
        "/*/settings",
        "/*/account",
      ],
    },
    sitemap: `${siteConfig.url}/sitemap.xml`,
    host: siteConfig.url,
  };
}
