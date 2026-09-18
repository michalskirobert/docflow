import { getTranslations } from "next-intl/server";

export async function Footer() {
  const t = await getTranslations("common");
  const companyName = process.env.NEXT_PUBLIC_COMPANY_NAME ?? "NurByte";
  const companyUrl =
    process.env.NEXT_PUBLIC_COMPANY_URL ?? "https://nurbyte.com";

  return (
    <footer className="app-footer">
      <span>
        © {new Date().getFullYear()} {companyName}
      </span>
      <span aria-hidden="true">·</span>
      <a href={companyUrl} target="_blank" rel="noreferrer">
        {t("companyTagline")}
      </a>
    </footer>
  );
}
