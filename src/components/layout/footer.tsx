import { DocFlowLogo } from "@/components/brand/docflow-logo";
import { version } from "../../../package.json";

export function Footer() {
  const companyName = process.env.NEXT_PUBLIC_COMPANY_NAME ?? "NurByte Software Lab";
  const companyUrl = process.env.NEXT_PUBLIC_COMPANY_URL ?? "https://nurbyte.com";
  const year = new Date().getFullYear();

  return (
    <footer className="app-footer" aria-label="DocFlow application information">
      <div className="app-footer-brand">
        <DocFlowLogo compact />
        <span className="app-footer-separator" aria-hidden="true">·</span>
        <span className="app-footer-version">v{version}</span>
        <span className="app-footer-separator" aria-hidden="true">·</span>
        <a href={companyUrl} target="_blank" rel="noreferrer">
          by {companyName}
        </a>
      </div>
      <span className="app-footer-copyright">© {year}</span>
    </footer>
  );
}
