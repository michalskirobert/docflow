import { InputControl, SelectControl } from "@/components/shared/form";
import { ArrowLeft, ArrowRight, X } from "lucide-react";
import type { ImageAlign, ImageFit } from "./utils";

type Props = {
  t: (key: string) => string;
  width: string;
  height: string;
  fit: ImageFit;
  align: ImageAlign;
  onChange: (
    width: string,
    height: string,
    fit: ImageFit,
    align: ImageAlign,
  ) => void;
  onRemove: () => void;
  onMoveBefore: () => void;
  onMoveAfter: () => void;
};

export function ImageContextBar({
  t,
  width,
  height,
  fit,
  align,
  onChange,
  onRemove,
  onMoveBefore,
  onMoveAfter,
}: Props) {
  return (
    <div className="image-context-bar">
      <strong>{t("selectedImage")}</strong>
      <label>
        {t("width")}
        <InputControl
          type="number"
          min="32"
          max="1200"
          value={width}
          onChange={(e) => onChange(e.target.value, height, fit, align)}
        />
        px
      </label>
      <label>
        {t("heightPx")}
        <InputControl
          type="number"
          min="32"
          max="1600"
          value={height}
          placeholder="auto"
          onChange={(e) => onChange(width, e.target.value, fit, align)}
        />
      </label>
      <label>
        {t("imageFit")}
        <SelectControl
          value={fit}
          onChange={(e) =>
            onChange(width, height, e.target.value as ImageFit, align)
          }
        >
          <option value="contain">contain</option>
          <option value="cover">cover</option>
          <option value="fill">fill</option>
        </SelectControl>
      </label>
      <label>
        {t("placement")}
        <SelectControl
          value={align}
          onChange={(e) =>
            onChange(width, height, fit, e.target.value as ImageAlign)
          }
        >
          <option value="inline">{t("inline")}</option>
          <option value="left">{t("leftWrap")}</option>
          <option value="center">{t("center")}</option>
          <option value="right">{t("rightWrap")}</option>
        </SelectControl>
      </label>
      <button type="button" onClick={onMoveBefore} title={t("moveImageBefore")}>
        <ArrowLeft size={15} />
      </button>
      <button type="button" onClick={onMoveAfter} title={t("moveImageAfter")}>
        <ArrowRight size={15} />
      </button>
      <button type="button" onClick={onRemove}>
        <X size={15} />
        {t("remove")}
      </button>
    </div>
  );
}
