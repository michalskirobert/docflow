import { ChoiceField } from "@/components/shared/form";

type Props = {
  t: (key: string) => string;
  header: boolean;
  footer: boolean;
  pageNumbers: boolean;
  setHeader: (v: boolean) => void;
  setFooter: (v: boolean) => void;
  setPageNumbers: (v: boolean) => void;
};
export function DocumentOptions({
  t,
  header,
  footer,
  pageNumbers,
  setHeader,
  setFooter,
  setPageNumbers,
}: Props) {
  return (
    <div className="document-regions">
      <ChoiceField
        type="checkbox"
        checked={header}
        onChange={(e) => setHeader(e.target.checked)}
        label={t("header")}
      />
      <ChoiceField
        type="checkbox"
        checked={footer}
        onChange={(e) => setFooter(e.target.checked)}
        label={t("footer")}
      />
      <ChoiceField
        type="checkbox"
        checked={pageNumbers}
        onChange={(e) => setPageNumbers(e.target.checked)}
        label={t("pageNumbers")}
      />
    </div>
  );
}
