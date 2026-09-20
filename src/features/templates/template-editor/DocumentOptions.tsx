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
      <label>
        <input
          type="checkbox"
          checked={header}
          onChange={(e) => setHeader(e.target.checked)}
        />
        {t("header")}
      </label>
      <label>
        <input
          type="checkbox"
          checked={footer}
          onChange={(e) => setFooter(e.target.checked)}
        />
        {t("footer")}
      </label>
      <label>
        <input
          type="checkbox"
          checked={pageNumbers}
          onChange={(e) => setPageNumbers(e.target.checked)}
        />
        {t("pageNumbers")}
      </label>
    </div>
  );
}
