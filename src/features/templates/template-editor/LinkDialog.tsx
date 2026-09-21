import { InputControl } from "@/components/shared/form";
import { Link2 } from "lucide-react";
type Props = {
  t: (key: string) => string;
  url: string;
  text: string;
  error: string;
  setUrl: (v: string) => void;
  setText: (v: string) => void;
  onClose: () => void;
  onInsert: () => void;
};
export function LinkDialog({
  t,
  url,
  text,
  error,
  setUrl,
  setText,
  onClose,
  onInsert,
}: Props) {
  return (
    <div className="dialog-backdrop">
      <div className="dialog">
        <span className="eyebrow">
          <Link2 size={14} /> {t("link")}
        </span>
        <h3>{t("addLink")}</h3>
        <p>{t("linkHelp")}</p>
        <label className="field">
          URL
          <InputControl
            autoFocus
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com"
          />
        </label>
        <label className="field">
          {t("linkText")}
          <InputControl
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={t("linkTextPlaceholder")}
          />
        </label>
        {error && <p className="form-error">{error}</p>}
        <div className="dialog-actions">
          <button className="btn secondary" onClick={onClose}>
            {t("cancel")}
          </button>
          <button className="btn" onClick={onInsert} disabled={!url.trim()}>
            {t("insertLink")}
          </button>
        </div>
      </div>
    </div>
  );
}
