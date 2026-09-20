"use client";

import {
  type ChangeEvent,
  type DragEvent,
  type MouseEvent as ReactMouseEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import { useTranslations } from "next-intl";
import { ArrowLeft, X } from "lucide-react";
import type { Template, TemplateVariable } from "../types";
import { parseTemplateVariables } from "../types";
import { useCreateTemplateService, useUpdateTemplateService } from "../service";
import {
  A4_WIDTH_PX,
  MAX_TEMPLATE_IMAGE_BYTES,
  SAFE_TEMPLATE_IMAGE_TYPES,
} from "@/utils/constants";
import { VariableModal } from "./VariableModal";
import { EditorToolbar, type ToolbarState } from "./EditorToolbar";
import { VariableShelf } from "./VariableShelf";
import { ImageContextBar } from "./ImageContextBar";
import { DocumentOptions } from "./DocumentOptions";
import { ZoomBar } from "./ZoomBar";
import { LinkDialog } from "./LinkDialog";
import { ImageDialog } from "./ImageDialog";
import {
  getImageAlign,
  getImageFit,
  imageStyle,
  safeHttpUrl,
  safeRasterImageUrl,
  type ImageAlign,
  type ImageFit,
  upsertVariable,
  variableHtml,
} from "./utils";

const MAGIC: Record<string, (bytes: Uint8Array) => boolean> = {
  "image/png": (b) =>
    b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47,
  "image/jpeg": (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  "image/gif": (b) =>
    ["GIF87a", "GIF89a"].includes(String.fromCharCode(...b.slice(0, 6))),
  "image/webp": (b) =>
    String.fromCharCode(...b.slice(0, 4)) === "RIFF" &&
    String.fromCharCode(...b.slice(8, 12)) === "WEBP",
};

type Props = { template?: Template; onClose: () => void };
export function TemplateEditor({ template, onClose }: Props) {
  const t = useTranslations("templateEditor");
  const editor = useRef<HTMLDivElement>(null),
    headerEditor = useRef<HTMLDivElement>(null),
    footerEditor = useRef<HTMLDivElement>(null),
    fileRef = useRef<HTMLInputElement>(null),
    savedRange = useRef<Range | null>(null);
  const resizing = useRef<{
    x: number;
    y: number;
    width: number;
    height: number;
    mode: "width" | "height" | "both";
  } | null>(null);
  const activeEditor = useRef<HTMLDivElement | null>(null),
    draggedImage = useRef<HTMLImageElement | null>(null);
  const [name, setName] = useState(template?.name ?? "");
  const [description, setDescription] = useState(template?.description ?? "");
  const [variables, setVariables] = useState<TemplateVariable[]>(() =>
    parseTemplateVariables(template?.variablesJson ?? "[]"),
  );
  const [variableOpen, setVariableOpen] = useState(false);
  const [editingVariable, setEditingVariable] = useState<
    TemplateVariable | undefined
  >();
  const [toolbarState, setToolbarState] = useState<ToolbarState>({
    bold: false,
    italic: false,
    underline: false,
    justifyLeft: false,
    justifyCenter: false,
    justifyRight: false,
    justifyFull: false,
    unorderedList: false,
    orderedList: false,
  });
  const [headerEnabled, setHeaderEnabled] = useState(
    Boolean(template?.headerContent),
  );
  const [footerEnabled, setFooterEnabled] = useState(
    Boolean(template?.footerContent),
  );
  const [pageNumbers, setPageNumbers] = useState(
    Boolean(template?.pageNumbers),
  );
  const [imageOpen, setImageOpen] = useState(false),
    [imageUrl, setImageUrl] = useState(""),
    [imageError, setImageError] = useState(""),
    [dragging, setDragging] = useState(false),
    [validatingImage, setValidatingImage] = useState(false);
  const [imageWidth, setImageWidth] = useState("240"),
    [imageHeight, setImageHeight] = useState(""),
    [imageFit, setImageFit] = useState<ImageFit>("contain"),
    [imageAlign, setImageAlign] = useState<ImageAlign>("center");
  const [linkOpen, setLinkOpen] = useState(false),
    [linkUrl, setLinkUrl] = useState(""),
    [linkText, setLinkText] = useState(""),
    [linkError, setLinkError] = useState("");
  const [selectedImage, setSelectedImage] = useState<HTMLImageElement | null>(
      null,
    ),
    [resizeBox, setResizeBox] = useState<DOMRect | null>(null),
    [zoom, setZoom] = useState(100);
  const create = useCreateTemplateService(),
    update = useUpdateTemplateService(template?.id ?? "");

  useEffect(() => {
    if (editor.current)
      editor.current.innerHTML =
        template?.content ??
        `<h1>${t("documentTitle")}</h1><p>${t("startWriting")}</p>`;
    if (headerEditor.current)
      headerEditor.current.innerHTML = template?.headerContent ?? "";
    if (footerEditor.current)
      footerEditor.current.innerHTML = template?.footerContent ?? "";
  }, [template, t]);
  useEffect(() => {
    const fit = () =>
      setZoom(
        window.matchMedia("(max-width: 760px)").matches
          ? Math.max(
              25,
              Math.floor(
                (((window.innerWidth - 24) / A4_WIDTH_PX) * 100) / 25,
              ) * 25,
            )
          : 100,
      );
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
    const move = (event: MouseEvent) => {
      if (!resizing.current || !selectedImage) return;
      const scale = zoom / 100;
      const w = Math.max(
        32,
        Math.min(
          1200,
          resizing.current.width + (event.clientX - resizing.current.x) / scale,
        ),
      );
      const h = Math.max(
        32,
        Math.min(
          1600,
          resizing.current.height +
            (event.clientY - resizing.current.y) / scale,
        ),
      );
      if (resizing.current.mode !== "height") {
        selectedImage.style.width = `${Math.round(w)}px`;
        setImageWidth(String(Math.round(w)));
      }
      if (resizing.current.mode !== "width") {
        selectedImage.style.height = `${Math.round(h)}px`;
        setImageHeight(String(Math.round(h)));
      }
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

  const syncToolbarState = () => {
    try {
      setToolbarState({
        bold: document.queryCommandState("bold"),
        italic: document.queryCommandState("italic"),
        underline: document.queryCommandState("underline"),
        justifyLeft: document.queryCommandState("justifyLeft"),
        justifyCenter: document.queryCommandState("justifyCenter"),
        justifyRight: document.queryCommandState("justifyRight"),
        justifyFull: document.queryCommandState("justifyFull"),
        unorderedList: document.queryCommandState("insertUnorderedList"),
        orderedList: document.queryCommandState("insertOrderedList"),
      });
    } catch {}
  };
  const rememberSelection = () => {
    const selection = window.getSelection();
    if (!selection?.rangeCount) return;
    const node = selection.anchorNode;
    const region = [
      editor.current,
      headerEditor.current,
      footerEditor.current,
    ].find((el) => el?.contains(node));
    if (region) {
      activeEditor.current = region;
      savedRange.current = selection.getRangeAt(0).cloneRange();
      syncToolbarState();
    }
  };
  const restoreSelection = () => {
    (activeEditor.current ?? editor.current)?.focus();
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
    syncToolbarState();
  };
  const insertVariable = (variable: TemplateVariable) => {
    restoreSelection();
    document.execCommand("insertHTML", false, variableHtml(variable));
    setVariables((current) => upsertVariable(current, variable));
    setVariableOpen(false);
    rememberSelection();
  };
  const saveVariableDefinition = (variable: TemplateVariable) => {
    if (!editingVariable) {
      insertVariable(variable);
      return;
    }
    const oldName = editingVariable.name;
    setVariables((current) =>
      upsertVariable(
        current.filter((v) => v.name !== oldName),
        variable,
      ),
    );
    [editor.current, headerEditor.current, footerEditor.current].forEach(
      (region) => {
        if (!region) return;
        region
          .querySelectorAll<HTMLImageElement>(
            `img[data-variable-name="${CSS.escape(oldName)}"]`,
          )
          .forEach((img) => {
            if (variable.type === "image") {
              img.dataset.imageFit = variable.imageFit ?? "contain";
              img.setAttribute(
                "style",
                imageStyle(
                  variable.imageWidth ?? 180,
                  variable.imageAlign ?? "center",
                  variable.imageHeight,
                  variable.imageFit ?? "contain",
                ),
              );
            }
          });
        if (oldName === variable.name) return;
        region.innerHTML = region.innerHTML
          .split(`{{${oldName}}}`)
          .join(`{{${variable.name}}}`);
        region
          .querySelectorAll<HTMLImageElement>(
            `img[data-variable-name="${CSS.escape(oldName)}"]`,
          )
          .forEach((img) => {
            img.dataset.variableName = variable.name;
            img.alt = `{{${variable.name}}}`;
            img.title = `{{${variable.name}}}`;
          });
        region
          .querySelectorAll<HTMLElement>(
            `[data-variable-label="${CSS.escape(oldName)}"]`,
          )
          .forEach((label) => {
            label.dataset.variableLabel = variable.name;
            label.textContent = `{{${variable.name}}}`;
          });
      },
    );
    setEditingVariable(undefined);
    setVariableOpen(false);
  };
  const insertImage = (src: string) => {
    try {
      restoreSelection();
      if (
        !document.execCommand(
          "insertHTML",
          false,
          `<img draggable="true" src="${src.replace(/"/g, "&quot;")}" alt="" data-image-fit="${imageFit}" style="${imageStyle(imageWidth, imageAlign, imageHeight || undefined, imageFit)}" />&nbsp;`,
        )
      )
        throw new Error();
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
      if (!SAFE_TEMPLATE_IMAGE_TYPES.some((type) => type === file.type)) {
        setImageError(t("imageInvalidType"));
        return;
      }
      if (file.size > MAX_TEMPLATE_IMAGE_BYTES) {
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
  const chooseFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) void validateFile(file);
    event.target.value = "";
  };
  const dropFile = (event: DragEvent) => {
    event.preventDefault();
    setDragging(false);
    const file = event.dataTransfer.files?.[0];
    if (file) void validateFile(file);
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
      const selection = window.getSelection(),
        selected = selection?.toString() ?? "";
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
        if (
          !document.execCommand(
            "insertHTML",
            false,
            `<a href="${url.replace(/"/g, "&quot;")}" target="_blank" rel="noopener noreferrer">${text}</a>`,
          )
        )
          throw new Error();
      }
      rememberSelection();
      setLinkOpen(false);
      setLinkUrl("");
      setLinkText("");
    } catch {
      setLinkError(t("linkInsertError"));
    }
  };
  const setPx = (px: string) => {
    if (!px) return;
    restoreSelection();
    document.execCommand("fontSize", false, "7");
    (activeEditor.current ?? editor.current)
      ?.querySelectorAll('font[size="7"]')
      .forEach((element) => {
        const html = element as HTMLElement;
        html.removeAttribute("size");
        html.style.fontSize = `${px}px`;
      });
    (activeEditor.current ?? editor.current)?.focus();
  };
  const updateSelectedImage = (
    width = imageWidth,
    height = imageHeight,
    fit: ImageFit = imageFit,
    align: ImageAlign = imageAlign,
  ) => {
    if (!selectedImage) return;
    selectedImage.dataset.imageFit = fit;
    selectedImage.setAttribute(
      "style",
      imageStyle(width, align, height || undefined, fit),
    );
    setImageWidth(width);
    setImageHeight(height);
    setImageFit(fit);
    setImageAlign(align);
    requestAnimationFrame(() =>
      setResizeBox(selectedImage.getBoundingClientRect()),
    );
  };
  const selectImage = (image: HTMLImageElement) => {
    [editor.current, headerEditor.current, footerEditor.current].forEach(
      (region) =>
        region
          ?.querySelectorAll("img[data-selected=true]")
          .forEach((node) => node.removeAttribute("data-selected")),
    );
    image.dataset.selected = "true";
    image.draggable = true;
    setSelectedImage(image);
    setImageWidth(String(parseInt(image.style.width) || image.width || 240));
    setImageHeight(
      image.style.height && image.style.height !== "auto"
        ? String(parseInt(image.style.height))
        : "",
    );
    setImageFit(getImageFit(image));
    setImageAlign(getImageAlign(image));
  };
  const moveImage = (direction: -1 | 1) => {
    if (!selectedImage) return;
    const sibling =
      direction < 0 ? selectedImage.previousSibling : selectedImage.nextSibling;
    if (!sibling) return;
    direction < 0
      ? sibling.before(selectedImage)
      : sibling.after(selectedImage);
    selectedImage.scrollIntoView({ block: "nearest" });
  };
  const rangeAtPoint = (x: number, y: number) => {
    const doc = document as Document & {
      caretRangeFromPoint?: (x: number, y: number) => Range | null;
      caretPositionFromPoint?: (
        x: number,
        y: number,
      ) => { offsetNode: Node; offset: number } | null;
    };
    let range = doc.caretRangeFromPoint?.(x, y) ?? null;
    if (!range) {
      const pos = doc.caretPositionFromPoint?.(x, y);
      if (pos) {
        range = document.createRange();
        range.setStart(pos.offsetNode, pos.offset);
        range.collapse(true);
      }
    }
    return range;
  };
  const dropIntoRegion = (
    e: DragEvent<HTMLDivElement>,
    region: HTMLDivElement | null,
  ) => {
    const variableName = e.dataTransfer.getData("text/docflow-variable"),
      variable = variables.find((item) => item.name === variableName),
      range = rangeAtPoint(e.clientX, e.clientY);
    if (variable && range && region?.contains(range.startContainer)) {
      e.preventDefault();
      activeEditor.current = region;
      savedRange.current = range;
      insertVariable(variable);
      return;
    }
    if (
      !draggedImage.current ||
      !range ||
      !region?.contains(range.startContainer)
    )
      return;
    e.preventDefault();
    const img = draggedImage.current;
    range.insertNode(img);
    img.after(document.createTextNode("\u00a0"));
    selectImage(img);
    draggedImage.current = null;
  };
  const dropIntoEditor = (e: DragEvent<HTMLDivElement>) =>
    dropIntoRegion(e, editor.current);
  const startResize = (
    event: ReactMouseEvent,
    mode: "width" | "height" | "both" = "both",
  ) => {
    if (!selectedImage) return;
    event.preventDefault();
    event.stopPropagation();
    const rect = selectedImage.getBoundingClientRect();
    resizing.current = {
      x: event.clientX,
      y: event.clientY,
      width: parseInt(selectedImage.style.width) || selectedImage.width || 240,
      height:
        parseInt(selectedImage.style.height) ||
        selectedImage.height ||
        Math.max(32, rect.height / (zoom / 100)),
      mode,
    };
  };
  const save = async () => {
    const payload = {
      name: name.trim(),
      description: description.trim(),
      content: editor.current?.innerHTML ?? "",
      headerContent: headerEnabled
        ? (headerEditor.current?.innerHTML ?? "")
        : "",
      footerContent: footerEnabled
        ? (footerEditor.current?.innerHTML ?? "")
        : "",
      pageNumbers,
      variables,
    };
    if (!payload.name || !payload.content) return;
    template
      ? await update.mutateAsync(payload)
      : await create.mutateAsync(payload);
    onClose();
  };
  const pending = create.isPending || update.isPending;

  return (
    <div className="editor-overlay">
      <div className="editor-shell">
        <header className="editor-header">
          <button
            className="mobile-editor-back"
            type="button"
            onClick={onClose}
            aria-label={t("back")}
          >
            <ArrowLeft />
          </button>
          <div>
            <span className="eyebrow">
              {template ? t("editTemplate") : t("newTemplate")}
            </span>
            <input
              className="editor-title"
              maxLength={250}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("templateName")}
            />
          </div>
          <div className="editor-actions">
            <button className="btn secondary" onClick={onClose}>
              <X size={17} />
              {t("close")}
            </button>
            <button className="btn" disabled={pending} onClick={save}>
              {pending ? t("saving") : t("save")}
            </button>
          </div>
        </header>
        <input
          className="editor-description"
          maxLength={400}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={t("description")}
        />
        <EditorToolbar
          t={t}
          cmd={cmd}
          setPx={setPx}
          insertTable={() =>
            cmd(
              "insertHTML",
              "<table><tbody><tr><td>Cell</td><td>Cell</td></tr><tr><td>Cell</td><td>Cell</td></tr></tbody></table><p><br></p>",
            )
          }
          rememberSelection={rememberSelection}
          openImage={() => setImageOpen(true)}
          openLink={() => setLinkOpen(true)}
          openVariable={() => {
            setEditingVariable(undefined);
            setVariableOpen(true);
          }}
          state={toolbarState}
        />
        {selectedImage && (
          <ImageContextBar
            t={t}
            width={imageWidth}
            height={imageHeight}
            fit={imageFit}
            align={imageAlign}
            onChange={updateSelectedImage}
            onMoveBefore={() => moveImage(-1)}
            onMoveAfter={() => moveImage(1)}
            onRemove={() => {
              selectedImage.remove();
              setSelectedImage(null);
            }}
          />
        )}
        <VariableShelf
          t={t}
          variables={variables}
          rememberSelection={rememberSelection}
          insertVariable={insertVariable}
          editVariable={(variable) => {
            setEditingVariable(variable);
            setVariableOpen(true);
          }}
          removeVariable={(variableName) =>
            setVariables((current) =>
              current.filter((variable) => variable.name !== variableName),
            )
          }
        />
        <DocumentOptions
          t={t}
          header={headerEnabled}
          footer={footerEnabled}
          pageNumbers={pageNumbers}
          setHeader={setHeaderEnabled}
          setFooter={setFooterEnabled}
          setPageNumbers={setPageNumbers}
        />
        <div className="editor-mobile-hint">{t("mobileHint")}</div>
        <ZoomBar t={t} zoom={zoom} setZoom={setZoom} />
        <div className="paper-stage">
          <div className="paper-zoom" style={{ zoom: zoom / 100 }}>
            <div className="a4-page-shell">
              {headerEnabled && (
                <div
                  ref={headerEditor}
                  className="page-header-editor"
                  contentEditable
                  suppressContentEditableWarning
                  onFocus={() => {
                    activeEditor.current = headerEditor.current;
                  }}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => dropIntoRegion(e, headerEditor.current)}
                  onDragStart={(e) => {
                    const target = e.target as HTMLElement;
                    if (target.tagName === "IMG") {
                      draggedImage.current = target as HTMLImageElement;
                      e.dataTransfer.effectAllowed = "move";
                    }
                  }}
                  onClick={(e) => {
                    const target = e.target as HTMLElement;
                    if (target.tagName === "IMG")
                      selectImage(target as HTMLImageElement);
                  }}
                  onKeyUp={rememberSelection}
                  onMouseUp={rememberSelection}
                  data-placeholder={t("headerPlaceholder")}
                />
              )}
              <div
                ref={editor}
                className="a4-paper"
                contentEditable
                suppressContentEditableWarning
                onDragOver={(e) => e.preventDefault()}
                onDragStart={(e) => {
                  const target = e.target as HTMLElement;
                  if (target.tagName === "IMG") {
                    draggedImage.current = target as HTMLImageElement;
                    e.dataTransfer.effectAllowed = "move";
                  }
                }}
                onDrop={dropIntoEditor}
                onFocus={() => {
                  activeEditor.current = editor.current;
                }}
                onKeyUp={rememberSelection}
                onMouseUp={rememberSelection}
                onClick={(e) => {
                  const target = e.target as HTMLElement;
                  if (target.tagName === "IMG")
                    selectImage(target as HTMLImageElement);
                  else {
                    editor.current
                      ?.querySelectorAll("img[data-selected=true]")
                      .forEach((node) => node.removeAttribute("data-selected"));
                    setSelectedImage(null);
                  }
                }}
              />
              {footerEnabled && (
                <div
                  ref={footerEditor}
                  className="page-footer-editor"
                  contentEditable
                  suppressContentEditableWarning
                  onFocus={() => {
                    activeEditor.current = footerEditor.current;
                  }}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => dropIntoRegion(e, footerEditor.current)}
                  onDragStart={(e) => {
                    const target = e.target as HTMLElement;
                    if (target.tagName === "IMG") {
                      draggedImage.current = target as HTMLImageElement;
                      e.dataTransfer.effectAllowed = "move";
                    }
                  }}
                  onClick={(e) => {
                    const target = e.target as HTMLElement;
                    if (target.tagName === "IMG")
                      selectImage(target as HTMLImageElement);
                  }}
                  onKeyUp={rememberSelection}
                  onMouseUp={rememberSelection}
                  data-placeholder={t("footerPlaceholder")}
                />
              )}{" "}
              {pageNumbers && <div className="page-number-preview">1 / 1</div>}
            </div>
          </div>
          {selectedImage && resizeBox && (
            <>
              <button
                type="button"
                className="image-resize-handle"
                aria-label={t("resizeImage")}
                title={t("resizeImage")}
                onMouseDown={(e) => startResize(e, "both")}
                style={{
                  left: resizeBox.right - 10,
                  top: resizeBox.bottom - 10,
                }}
              />
              <button
                type="button"
                className="image-resize-handle image-resize-width"
                aria-label="Resize image width"
                onMouseDown={(e) => startResize(e, "width")}
                style={{
                  left: resizeBox.right - 10,
                  top: resizeBox.top + resizeBox.height / 2 - 10,
                }}
              />
              <button
                type="button"
                className="image-resize-handle image-resize-height"
                aria-label="Resize image height"
                onMouseDown={(e) => startResize(e, "height")}
                style={{
                  left: resizeBox.left + resizeBox.width / 2 - 10,
                  top: resizeBox.bottom - 10,
                }}
              />
            </>
          )}
        </div>
        {variableOpen && (
          <VariableModal
            onClose={() => {
              setVariableOpen(false);
              setEditingVariable(undefined);
            }}
            onInsert={saveVariableDefinition}
            initial={editingVariable}
            t={t}
          />
        )}
        {linkOpen && (
          <LinkDialog
            t={t}
            url={linkUrl}
            text={linkText}
            error={linkError}
            setUrl={(value) => {
              setLinkUrl(value);
              setLinkError("");
            }}
            setText={setLinkText}
            onClose={() => setLinkOpen(false)}
            onInsert={insertLink}
          />
        )}
        {imageOpen && (
          <ImageDialog
            t={t}
            fileRef={fileRef}
            url={imageUrl}
            error={imageError}
            dragging={dragging}
            validating={validatingImage}
            width={imageWidth}
            height={imageHeight}
            fit={imageFit}
            align={imageAlign}
            setUrl={(value) => {
              setImageUrl(value);
              setImageError("");
            }}
            setDragging={setDragging}
            setWidth={setImageWidth}
            setHeight={setImageHeight}
            setFit={setImageFit}
            setAlign={setImageAlign}
            chooseFile={chooseFile}
            dropFile={dropFile}
            validateRemote={validateRemoteImage}
            onClose={() => {
              setImageOpen(false);
              setImageError("");
            }}
          />
        )}
      </div>
    </div>
  );
}
