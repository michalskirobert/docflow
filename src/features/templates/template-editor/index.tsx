"use client";
import {
  ChangeEvent,
  DragEvent,
  MouseEvent as ReactMouseEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import { useTranslations } from "next-intl";
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  ImagePlus,
  Italic,
  Link2,
  List,
  ListOrdered,
  Minus,
  Plus,
  Redo2,
  Table2,
  Trash2,
  Underline,
  Undo2,
  Upload,
  Variable,
  X,
} from "lucide-react";
import type { Template, TemplateVariable } from "../types";
import { parseTemplateVariables } from "../types";
import { VariableModal } from "./VariableModal";
import { upsertVariable, variableHtml } from "./utils";
import {
  A4_WIDTH_PX,
  FONT_SIZES_PX,
  MAX_TEMPLATE_IMAGE_BYTES,
  SAFE_TEMPLATE_IMAGE_TYPES,
} from "@/utils/constants";
import { useCreateTemplateService, useUpdateTemplateService } from "../service";

const sizes = FONT_SIZES_PX.map(String);
const MAX_IMAGE_BYTES = MAX_TEMPLATE_IMAGE_BYTES;
const SAFE_IMAGE_TYPES: readonly string[] = SAFE_TEMPLATE_IMAGE_TYPES;
const MAGIC: Record<string, (b: Uint8Array) => boolean> = {
  "image/png": (b) =>
    b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47,
  "image/jpeg": (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  "image/gif": (b) =>
    String.fromCharCode(...b.slice(0, 6)) === "GIF87a" ||
    String.fromCharCode(...b.slice(0, 6)) === "GIF89a",
  "image/webp": (b) =>
    String.fromCharCode(...b.slice(0, 4)) === "RIFF" &&
    String.fromCharCode(...b.slice(8, 12)) === "WEBP",
};
function safeHttpUrl(raw: string) {
  try {
    const u = new URL(raw);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}
function safeRasterImageUrl(raw: string) {
  try {
    const u = new URL(raw);
    return (
      (u.protocol === "http:" || u.protocol === "https:") &&
      /\.(png|jpe?g|webp|gif)$/i.test(u.pathname)
    );
  } catch {
    return false;
  }
}

export function TemplateEditor({
  template,
  onClose,
}: {
  template?: Template;
  onClose: () => void;
}) {
  const t = useTranslations("templateEditor");
  const editor = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const savedRange = useRef<Range | null>(null);
  const [name, setName] = useState(template?.name ?? "");
  const [description, setDescription] = useState(template?.description ?? "");
  const [variableOpen, setVariableOpen] = useState(false);
  const [variables, setVariables] = useState<TemplateVariable[]>(() =>
    parseTemplateVariables(template?.variablesJson ?? "[]"),
  );
  const [imageOpen, setImageOpen] = useState(false);
  const [imageUrl, setImageUrl] = useState("");
  const [imageError, setImageError] = useState("");
  const [dragging, setDragging] = useState(false);
  const [imageWidth, setImageWidth] = useState("240");
  const [imageAlign, setImageAlign] = useState("center");
  const [validatingImage, setValidatingImage] = useState(false);
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [linkText, setLinkText] = useState("");
  const [linkError, setLinkError] = useState("");
  const [selectedImage, setSelectedImage] = useState<HTMLImageElement | null>(
    null,
  );
  const [zoom, setZoom] = useState(100);
  const [resizeBox, setResizeBox] = useState<DOMRect | null>(null);
  const resizing = useRef<{ x: number; width: number } | null>(null);
  const create = useCreateTemplateService();
  const update = useUpdateTemplateService(template?.id ?? "");
  useEffect(() => {
    if (editor.current)
      editor.current.innerHTML =
        template?.content ??
        `<h1>${t("documentTitle")}</h1><p>${t("startWriting")}</p>`;
  }, [template, t]);
  useEffect(() => {
    const fit = () => {
      if (window.matchMedia("(max-width: 760px)").matches)
        setZoom(
          Math.max(
            25,
            Math.floor((((window.innerWidth - 24) / A4_WIDTH_PX) * 100) / 25) *
              25,
          ),
        );
      else setZoom(100);
    };
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, []);
  useEffect(() => {
    const sync = () =>
      setResizeBox(selectedImage?.getBoundingClientRect() ?? null);
    sync();
    window.addEventListener("resize", sync);
    window.addEventListener("scroll", sync, true);
    return () => {
      window.removeEventListener("resize", sync);
      window.removeEventListener("scroll", sync, true);
    };
  }, [selectedImage, zoom]);
  useEffect(() => {
    const move = (e: MouseEvent) => {
      if (!resizing.current || !selectedImage) return;
      const scale = zoom / 100;
      const next = Math.max(
        32,
        Math.min(
          1200,
          resizing.current.width + (e.clientX - resizing.current.x) / scale,
        ),
      );
      selectedImage.style.width = `${Math.round(next)}px`;
      setImageWidth(String(Math.round(next)));
      setResizeBox(selectedImage.getBoundingClientRect());
    };
    const up = () => {
      resizing.current = null;
    };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
    return () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
    };
  }, [selectedImage, zoom]);
  const rememberSelection = () => {
    const selection = window.getSelection();
    if (
      selection?.rangeCount &&
      editor.current?.contains(selection.anchorNode)
    ) {
      savedRange.current = selection.getRangeAt(0).cloneRange();
    }
  };
  const restoreSelection = () => {
    editor.current?.focus();
    const selection = window.getSelection();
    if (savedRange.current && selection) {
      selection.removeAllRanges();
      selection.addRange(savedRange.current);
    }
  };
  const cmd = (command: string, value?: string) => {
    restoreSelection();
    document.execCommand(command, false, value);
    rememberSelection();
  };
  const insertVariable = (v: TemplateVariable) => {
    restoreSelection();
    document.execCommand("insertHTML", false, variableHtml(v));
    setVariables((list) => upsertVariable(list, v));
    setVariableOpen(false);
    rememberSelection();
  };
  const imageStyle = (width: string, align: string) => {
    const w = Math.max(32, Math.min(1200, Number(width) || 240));
    if (align === "left")
      return `width:${w}px;max-width:100%;height:auto;float:left;margin:0 16px 10px 0`;
    if (align === "right")
      return `width:${w}px;max-width:100%;height:auto;float:right;margin:0 0 10px 16px`;
    if (align === "inline")
      return `width:${w}px;max-width:100%;height:auto;display:inline-block;vertical-align:middle;margin:4px 8px`;
    return `width:${w}px;max-width:100%;height:auto;display:block;margin:8px auto`;
  };
  const insertImage = (src: string) => {
    try {
      restoreSelection();
      const html = `<img src="${src.replace(/"/g, "&quot;")}" alt="" style="${imageStyle(imageWidth, imageAlign)}" />&nbsp;`;
      const ok = document.execCommand("insertHTML", false, html);
      if (!ok) throw new Error("insertHTML failed");
      rememberSelection();
      setImageOpen(false);
      setImageUrl("");
      setImageError("");
    } catch {
      setImageError(t("imageInsertError"));
    }
  };
  const validateFile = async (file: File) => {
    try {
      setImageError("");
      if (!SAFE_IMAGE_TYPES.some((type) => type === file.type)) {
        setImageError(t("imageInvalidType"));
        return;
      }
      if (file.size > MAX_IMAGE_BYTES) {
        setImageError(t("imageTooLarge"));
        return;
      }
      const bytes = new Uint8Array(await file.slice(0, 16).arrayBuffer());
      if (!MAGIC[file.type]?.(bytes)) {
        setImageError(t("imageSignatureInvalid"));
        return;
      }
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(file);
      });
      insertImage(dataUrl);
    } catch {
      setImageError(t("imageReadError"));
    }
  };
  const chooseFile = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) void validateFile(f);
    e.target.value = "";
  };
  const dropFile = (e: DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files?.[0];
    if (f) void validateFile(f);
  };
  const validateRemoteImage = () => {
    const url = imageUrl.trim();
    setImageError("");
    if (!safeRasterImageUrl(url)) {
      setImageError(t("imageUrlFormatInvalid"));
      return;
    }
    setValidatingImage(true);
    const probe = new Image();
    probe.onload = () => {
      setValidatingImage(false);
      insertImage(url);
    };
    probe.onerror = () => {
      setValidatingImage(false);
      setImageError(t("imageUrlInvalid"));
    };
    probe.src = url;
  };
  const insertLink = () => {
    const url = linkUrl.trim();
    setLinkError("");
    if (!safeHttpUrl(url)) {
      setLinkError(t("urlInvalid"));
      return;
    }
    try {
      restoreSelection();
      const selection = window.getSelection();
      const selected = selection?.toString() ?? "";
      if (selected) {
        document.execCommand("createLink", false, url);
        const anchor = selection?.anchorNode?.parentElement?.closest("a");
        if (anchor) {
          anchor.target = "_blank";
          anchor.rel = "noopener noreferrer";
        }
      } else {
        const text = (linkText.trim() || url).replace(
          /[<>&]/g,
          (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" })[c]!,
        );
        const safeUrl = url.replace(/"/g, "&quot;");
        if (
          !document.execCommand(
            "insertHTML",
            false,
            `<a href="${safeUrl}" target="_blank" rel="noopener noreferrer">${text}</a>`,
          )
        )
          throw new Error("insertHTML failed");
      }
      rememberSelection();
      setLinkOpen(false);
      setLinkUrl("");
      setLinkText("");
    } catch {
      setLinkError(t("linkInsertError"));
    }
  };
  const insertTable = () =>
    cmd(
      "insertHTML",
      "<table><tbody><tr><td>Cell</td><td>Cell</td></tr><tr><td>Cell</td><td>Cell</td></tr></tbody></table><p><br></p>",
    );
  const setPx = (px: string) => {
    if (!px) return;
    document.execCommand("fontSize", false, "7");
    editor.current?.querySelectorAll('font[size="7"]').forEach((el) => {
      (el as HTMLElement).removeAttribute("size");
      (el as HTMLElement).style.fontSize = `${px}px`;
    });
    editor.current?.focus();
  };
  const save = async () => {
    const payload = {
      name: name.trim(),
      description: description.trim(),
      content: editor.current?.innerHTML ?? "",
      variables,
    };
    if (!payload.name || !payload.content) return;
    template
      ? await update.mutateAsync(payload)
      : await create.mutateAsync(payload);
    onClose();
  };
  const pending = create.isPending || update.isPending;
  const updateSelectedImage = (width = imageWidth, align = imageAlign) => {
    if (!selectedImage) return;
    selectedImage.setAttribute("style", imageStyle(width, align));
    setImageWidth(width);
    setImageAlign(align);
    requestAnimationFrame(() =>
      setResizeBox(selectedImage.getBoundingClientRect()),
    );
  };
  const startResize = (e: ReactMouseEvent) => {
    if (!selectedImage) return;
    e.preventDefault();
    e.stopPropagation();
    resizing.current = {
      x: e.clientX,
      width: parseInt(selectedImage.style.width) || selectedImage.width || 240,
    };
  };
  return (
    <div className="editor-overlay">
      <div className="editor-shell">
        <header className="editor-header">
          <div>
            <span className="eyebrow">
              {template ? t("editTemplate") : t("newTemplate")}
            </span>
            <input
              className="editor-title"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("templateName")}
            />
          </div>
          <div className="editor-actions">
            <button className="btn secondary" onClick={onClose}>
              <X size={17} /> {t("close")}
            </button>
            <button className="btn" disabled={pending} onClick={save}>
              {pending ? t("saving") : t("save")}
            </button>
          </div>
        </header>
        <input
          className="editor-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={t("description")}
        />
        <div className="editor-toolbar">
          <button onClick={() => cmd("undo")} title={t("undo")}>
            <Undo2 />
          </button>
          <button onClick={() => cmd("redo")} title={t("redo")}>
            <Redo2 />
          </button>
          <span />
          <select
            onChange={(e) => cmd("formatBlock", e.target.value)}
            defaultValue="p"
            aria-label={t("paragraphStyle")}
          >
            <option value="p">{t("paragraph")}</option>
            <option value="h1">{t("heading1")}</option>
            <option value="h2">{t("heading2")}</option>
            <option value="h3">{t("heading3")}</option>
            <option value="h4">{t("heading4")}</option>
            <option value="h5">{t("subtitle")}</option>
            <option value="blockquote">{t("quote")}</option>
          </select>
          <select
            defaultValue=""
            onChange={(e) => setPx(e.target.value)}
            aria-label={t("fontSize")}
          >
            <option value="" disabled>
              {t("size")}
            </option>
            {sizes.map((s) => (
              <option key={s} value={s}>
                {s}px
              </option>
            ))}
          </select>
          <button
            className="toolbar-bold"
            onClick={() => cmd("bold")}
            title={t("bold")}
          >
            <Bold strokeWidth={3} />
          </button>
          <button onClick={() => cmd("italic")} title={t("italic")}>
            <Italic />
          </button>
          <button onClick={() => cmd("underline")} title={t("underline")}>
            <Underline />
          </button>
          <span />
          <button onClick={() => cmd("justifyLeft")} title={t("alignLeft")}>
            <AlignLeft />
          </button>
          <button onClick={() => cmd("justifyCenter")} title={t("alignCenter")}>
            <AlignCenter />
          </button>
          <button onClick={() => cmd("justifyRight")} title={t("alignRight")}>
            <AlignRight />
          </button>
          <button onClick={() => cmd("justifyFull")} title={t("justify")}>
            <AlignJustify />
          </button>
          <span />
          <button
            onClick={() => cmd("insertUnorderedList")}
            title={t("bulletList")}
          >
            <List />
          </button>
          <button
            onClick={() => cmd("insertOrderedList")}
            title={t("numberedList")}
          >
            <ListOrdered />
          </button>
          <button onClick={insertTable} title={t("table")}>
            <Table2 />
          </button>
          <button
            onMouseDown={rememberSelection}
            onClick={() => setImageOpen(true)}
            title={t("image")}
          >
            <ImagePlus />
          </button>
          <button
            onMouseDown={rememberSelection}
            onClick={() => setLinkOpen(true)}
            title={t("link")}
          >
            <Link2 />
          </button>
          <button
            className="variable-btn"
            onMouseDown={rememberSelection}
            onClick={() => setVariableOpen(true)}
          >
            <Variable /> {t("variable")}
          </button>
        </div>
        {selectedImage && (
          <div className="image-context-bar">
            <strong>{t("selectedImage")}</strong>
            <label>
              {t("width")}{" "}
              <input
                type="number"
                min="32"
                max="1200"
                value={imageWidth}
                onChange={(e) =>
                  updateSelectedImage(e.target.value, imageAlign)
                }
              />{" "}
              px
            </label>
            <select
              value={imageAlign}
              onChange={(e) => updateSelectedImage(imageWidth, e.target.value)}
            >
              <option value="inline">{t("inline")}</option>
              <option value="left">{t("leftWrap")}</option>
              <option value="center">{t("center")}</option>
              <option value="right">{t("rightWrap")}</option>
            </select>
            <button
              onClick={() => {
                selectedImage.remove();
                setSelectedImage(null);
              }}
            >
              <Trash2 size={15} /> {t("remove")}
            </button>
          </div>
        )}
        <div className="editor-mobile-hint">{t("mobileHint")}</div>
        <div className="zoom-bar">
          <button
            type="button"
            onClick={() => setZoom((z) => Math.max(25, z - 25))}
            aria-label={t("zoomOut")}
          >
            <Minus />
          </button>
          <strong>{zoom}%</strong>
          <button
            type="button"
            onClick={() => setZoom((z) => Math.min(200, z + 25))}
            aria-label={t("zoomIn")}
          >
            <Plus />
          </button>
          <button
            type="button"
            onClick={() =>
              setZoom(
                Math.max(
                  25,
                  Math.floor(
                    (((window.innerWidth - 24) / A4_WIDTH_PX) * 100) / 25,
                  ) * 25,
                ),
              )
            }
          >
            {t("fitPage")}
          </button>
        </div>
        <div className="paper-stage">
          <div className="paper-zoom" style={{ zoom: zoom / 100 }}>
            <div
              ref={editor}
              className="a4-paper"
              contentEditable
              suppressContentEditableWarning
              onKeyUp={rememberSelection}
              onMouseUp={rememberSelection}
              onClick={(e) => {
                const target = e.target as HTMLElement;
                if (target.tagName === "IMG") {
                  editor.current
                    ?.querySelectorAll("img[data-selected=true]")
                    .forEach((node) => node.removeAttribute("data-selected"));
                  const img = target as HTMLImageElement;
                  img.dataset.selected = "true";
                  setSelectedImage(img);
                  const w = parseInt(img.style.width) || img.width || 240;
                  setImageWidth(String(w));
                  setImageAlign(
                    img.style.float === "left"
                      ? "left"
                      : img.style.float === "right"
                        ? "right"
                        : img.style.display === "inline-block"
                          ? "inline"
                          : "center",
                  );
                } else {
                  editor.current
                    ?.querySelectorAll("img[data-selected=true]")
                    .forEach((node) => node.removeAttribute("data-selected"));
                  setSelectedImage(null);
                }
              }}
            />
          </div>
        </div>
        {selectedImage && resizeBox && (
          <button
            type="button"
            className="image-resize-handle"
            aria-label={t("resizeImage")}
            title={t("resizeImage")}
            onMouseDown={startResize}
            style={{ left: resizeBox.right - 10, top: resizeBox.bottom - 10 }}
          />
        )}
        {variableOpen && (
          <VariableModal
            onClose={() => setVariableOpen(false)}
            onInsert={insertVariable}
            t={t}
          />
        )}
        {linkOpen && (
          <div className="dialog-backdrop">
            <div className="dialog">
              <span className="eyebrow">
                <Link2 size={14} /> {t("link")}
              </span>
              <h3>{t("addLink")}</h3>
              <p>{t("linkHelp")}</p>
              <label className="field">
                URL
                <input
                  autoFocus
                  value={linkUrl}
                  onChange={(e) => {
                    setLinkUrl(e.target.value);
                    setLinkError("");
                  }}
                  placeholder="https://example.com"
                />
              </label>
              <label className="field">
                {t("linkText")}
                <input
                  value={linkText}
                  onChange={(e) => setLinkText(e.target.value)}
                  placeholder={t("linkTextPlaceholder")}
                />
              </label>
              {linkError && <p className="form-error">{linkError}</p>}
              <div className="dialog-actions">
                <button
                  className="btn secondary"
                  onClick={() => setLinkOpen(false)}
                >
                  {t("cancel")}
                </button>
                <button
                  className="btn"
                  onClick={insertLink}
                  disabled={!linkUrl.trim()}
                >
                  {t("insertLink")}
                </button>
              </div>
            </div>
          </div>
        )}
        {imageOpen && (
          <div className="dialog-backdrop">
            <div className="dialog image-dialog">
              <span className="eyebrow">
                <ImagePlus size={14} /> {t("image")}
              </span>
              <h3>{t("addImage")}</h3>
              <p>{t("imageHelp")}</p>
              <div className="image-source-grid">
                <div
                  className={`image-source ${dragging ? "dragging" : ""}`}
                  role="button"
                  tabIndex={0}
                  onClick={() => fileRef.current?.click()}
                  onKeyDown={(e) =>
                    (e.key === "Enter" || e.key === " ") &&
                    fileRef.current?.click()
                  }
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragging(true);
                  }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={dropFile}
                >
                  <Upload />
                  <strong>{t("dropImage")}</strong>
                  <small>{t("imageTypes")}</small>
                </div>
                <div className="image-url-box">
                  <strong>{t("imageUrl")}</strong>
                  <input
                    value={imageUrl}
                    onChange={(e) => {
                      setImageUrl(e.target.value);
                      setImageError("");
                    }}
                    placeholder="https://example.com/logo.png"
                  />
                  <button
                    className="btn secondary"
                    onClick={validateRemoteImage}
                    disabled={!imageUrl.trim() || validatingImage}
                  >
                    {validatingImage ? t("validating") : t("useImageUrl")}
                  </button>
                </div>
              </div>
              <div className="image-options">
                <label>
                  {t("widthPx")}
                  <input
                    type="number"
                    min="32"
                    max="1200"
                    value={imageWidth}
                    onChange={(e) => setImageWidth(e.target.value)}
                  />
                </label>
                <label>
                  {t("placement")}
                  <select
                    value={imageAlign}
                    onChange={(e) => setImageAlign(e.target.value)}
                  >
                    <option value="inline">{t("inline")}</option>
                    <option value="left">{t("leftWrap")}</option>
                    <option value="center">{t("center")}</option>
                    <option value="right">{t("rightWrap")}</option>
                  </select>
                </label>
              </div>
              {imageError && <p className="form-error">{imageError}</p>}
              <input
                ref={fileRef}
                hidden
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                onChange={chooseFile}
              />
              <div className="dialog-actions">
                <button
                  className="btn secondary"
                  onClick={() => {
                    setImageOpen(false);
                    setImageError("");
                  }}
                >
                  {t("cancel")}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
