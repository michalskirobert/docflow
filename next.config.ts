import createNextIntlPlugin from "next-intl/plugin";
import type { NextConfig } from "next";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  poweredByHeader: false,
  serverExternalPackages: ["@sparticuz/chromium"],
outputFileTracingIncludes: {
    "/api/documents/[id]/pdf": [
      "./node_modules/@sparticuz/chromium/bin/**",
    ],
  },
};

export default withNextIntl(nextConfig);
