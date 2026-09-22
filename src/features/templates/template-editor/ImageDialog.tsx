import { InputControl, SelectControl } from "@/components/shared/form";
import type { ChangeEvent, DragEvent, RefObject } from "react";
import { ImagePlus, LoaderCircle, Upload } from "lucide-react";
import type { ImageAlign, ImageFit } from "./utils";
import { TEMPLATE_IMAGE_ACCEPT } from "@/lib/image-file";
type Props = {
  t: (key: string) => string;
  fileRef: RefObject<HTMLInputElement | null>;
  url: string;
  error: string;
  dragging: boolean;
  validating: boolean;
  processing: boolean;
  width: string;
  height: string;
  fit: ImageFit;
  align: ImageAlign;
  setUrl: (v: string) => void;
  setDragging: (v: boolean) => void;
  setWidth: (v: string) => void;
  setHeight: (v: string) => void;
  setFit: (v: ImageFit) => void;
  setAlign: (v: ImageAlign) => void;
  chooseFile: (e: ChangeEvent<HTMLInputElement>) => void;
  dropFile: (e: DragEvent) => void;
  validateRemote: () => void;
  onClose: () => void;
};
export function ImageDialog({
  t,
  fileRef,
  url,
  error,
  dragging,
  validating,
  processing,
  width,
  height,
  fit,
  align,
  setUrl,
  setDragging,
  setWidth,
  setHeight,
  setFit,
  setAlign,
  chooseFile,
  dropFile,
  validateRemote,
  onClose,
}: Props) {
  return (
    <div className="dialog-backdrop">
      <div className="dialog image-dialog">
        <span className="eyebrow">
          <ImagePlus size={14} /> {t("image")}
        </span>
        <h3>{t("addImage")}</h3>
        <p>{t("imageHelp")}</p>
        <div className="image-source-grid">
          <div
            className={`image-source ${dragging ? "dragging" : ""} ${processing ? "is-processing" : ""}`}
            role="button"
            tabIndex={0}
            onClick={() => !processing && fileRef.current?.click()}
            onKeyDown={(e) =>
              !processing &&
              (e.key === "Enter" || e.key === " ") &&
              fileRef.current?.click()
            }
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              if (!processing) dropFile(e);
              else e.preventDefault();
            }}
            aria-busy={processing}
            aria-disabled={processing}
          >
            {processing ? (
              <div
                className="image-processing-state"
                role="status"
                aria-live="polite"
              >
                <LoaderCircle className="spinner" />
                <strong>{t("processingImage")}</strong>
              </div>
            ) : (
              <>
                <Upload />
                <strong>{t("dropImage")}</strong>
                <small>{t("imageTypes")}</small>
              </>
            )}
          </div>
          <div className="image-url-box">
            <strong>{t("imageUrl")}</strong>
            <InputControl
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com/logo.png"
            />
            <button
              className="btn secondary"
              onClick={validateRemote}
              disabled={!url.trim() || validating}
            >
              {validating ? t("validating") : t("useImageUrl")}
            </button>
          </div>
        </div>
        <div className="image-options">
          <label>
            {t("widthPx")}
            <InputControl
              type="number"
              min="32"
              max="1200"
              value={width}
              onChange={(e) => setWidth(e.target.value)}
            />
          </label>
          <label>
            {t("heightPx")}
            <InputControl
              type="number"
              min="32"
              max="1600"
              value={height}
              placeholder="auto"
              onChange={(e) => setHeight(e.target.value)}
            />
          </label>
          <label>
            {t("imageFit")}
            <SelectControl
              value={fit}
              onChange={(e) => setFit(e.target.value as ImageFit)}
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
              onChange={(e) => setAlign(e.target.value as ImageAlign)}
            >
              <option value="inline">{t("inline")}</option>
              <option value="left">{t("leftWrap")}</option>
              <option value="center">{t("center")}</option>
              <option value="right">{t("rightWrap")}</option>
            </SelectControl>
          </label>
        </div>
        {error && <p className="form-error">{error}</p>}
        <InputControl
          ref={fileRef}
          hidden
          type="file"
          accept={TEMPLATE_IMAGE_ACCEPT}
          onChange={chooseFile}
        />
        <div className="dialog-actions">
          <button className="btn secondary" onClick={onClose}>
            {t("cancel")}
          </button>
        </div>
      </div>
    </div>
  );
}
