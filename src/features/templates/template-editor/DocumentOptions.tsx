type Props = {
  t: (key: string) => string;
  pageNumbers: boolean;
  setPageNumbers: (value: boolean) => void;
};

export function DocumentOptions({ t, pageNumbers, setPageNumbers }: Props) {
  return (
    <label className="page-numbers-toggle">
      <input
        type="checkbox"
        checked={pageNumbers}
        onChange={(event) => setPageNumbers(event.target.checked)}
      />
      <span>{t("pageNumbers")}</span>
    </label>
  );
}
