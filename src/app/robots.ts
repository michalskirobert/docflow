import type { MetadataRoute } from "next";
import { siteConfig } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: [
        "/favicon.ico",
        "/icon.png",
        "/apple-icon.png",
        "/brand/",
        "/social/",
        "/login",
        "/register",
        "/pl/login",
        "/pl/register",
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
        "/payment/",
        "/*/admin",
        "/*/dashboard",
        "/*/documents",
        "/*/templates",
        "/*/settings",
        "/*/account",
        "/*/payment/",
      ],
    },
    sitemap: `${siteConfig.url}/sitemap.xml`,
    host: siteConfig.url,
  };
}
