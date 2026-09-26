"use client";

import { InputControl } from "@/components/shared/form";
import {
  type ChangeEvent,
  type CSSProperties,
  type DragEvent,
  type MouseEvent as ReactMouseEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { useTranslations } from "next-intl";
import { createPortal } from "react-dom";
import { useFeedback } from "@/components/ui/feedback-provider";
import { useUnsavedChanges } from "@/hooks/use-unsaved-changes";
import {
  ArrowLeft,
  Check,
  LoaderCircle,
  GripVertical,
  Pencil,
  Save,
  Trash2,
  X,
} from "lucide-react";
import type { Template, TemplateVariable } from "../types";
import { parseTemplateVariables } from "../types";
import { useCreateTemplateService, useUpdateTemplateService } from "../service";
import { A4_WIDTH_PX } from "@/utils/constants";
import { VariableModal } from "./VariableModal";
import { DataTableModal } from "./DataTableModal";
import { dataTableHtml } from "../data-table";
import { EditorToolbar, type ToolbarState } from "./EditorToolbar";
import { VariableShelf } from "./VariableShelf";
import { ImageContextBar } from "./ImageContextBar";
import { DocumentOptions } from "./DocumentOptions";
import { ZoomBar } from "./ZoomBar";
import { LinkDialog } from "./LinkDialog";
import { ImageDialog } from "./ImageDialog";
import {
  normalizedImageType,
  optimizeTemplateImage,
  SUPPORTED_TEMPLATE_IMAGE_TYPES,
} from "@/lib/image-file";
import {
  createImageVariablePlaceholder,
  getImageAlign,
  getImageFit,
  imageStyle,
  normalizeEditorVariableImages,
  removePlacedImage,
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
  "image/heic": (b) => {
    if (String.fromCharCode(...b.slice(4, 8)) !== "ftyp") return false;
    const brand = String.fromCharCode(...b.slice(8, 12));
    return ["heic", "heix", "hevc", "hevx", "mif1", "msf1"].includes(brand);
  },
  "image/heif": (b) => {
    if (String.fromCharCode(...b.slice(4, 8)) !== "ftyp") return false;
    const brand = String.fromCharCode(...b.slice(8, 12));
    return ["heic", "heix", "hevc", "hevx", "mif1", "msf1"].includes(brand);
  },
  "image/jxl": (b) =>
    (b[0] === 0xff && b[1] === 0x0a) ||
    (b[0] === 0x00 &&
      b[1] === 0x00 &&
      b[2] === 0x00 &&
      b[3] === 0x0c &&
      String.fromCharCode(...b.slice(4, 8)) === "JXL " &&
      b[8] === 0x0d &&
      b[9] === 0x0a &&
      b[10] === 0x87 &&
      b[11] === 0x0a),
};

type Props = {
  template?: Template;
  onClose: () => void;
};

export function TemplateEditor({ template, onClose }: Props) {
  const t = useTranslations("templateEditor");

  const { notify, confirm } = useFeedback();
  const nameRef = useRef<HTMLInputElement>(null);
  const editor = useRef<HTMLDivElement>(null);
  const headerEditor = useRef<HTMLDivElement>(null);
  const footerEditor = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const savedRange = useRef<Range | null>(null);

  const resizing = useRef<{
    x: number;
    y: number;
    width: number;
    height: number;
    mode: "width" | "height" | "both";
  } | null>(null);

  const activeEditor = useRef<HTMLDivElement | null>(null);
  const draggedImage = useRef<HTMLImageElement | null>(null);

  const [name, setName] = useState(template?.name ?? t("defaultTemplateName"));
  const [description, setDescription] = useState(template?.description ?? "");
  const [emailSubject, setEmailSubject] = useState(
    template?.emailSubject ?? "",
  );
  const [editingName, setEditingName] = useState(false);
  const [mobileMetadataSheet, setMobileMetadataSheet] = useState(false);
  const metadataSnapshot = useRef({
    name: template?.name ?? t("defaultTemplateName"),
    description: template?.description ?? "",
    emailSubject: template?.emailSubject ?? "",
  });

  const openMetadataEditor = () => {
    metadataSnapshot.current = { name, description, emailSubject };
    setEditingName(true);
    requestAnimationFrame(() => nameRef.current?.focus());
  };

  const cancelMetadataEditor = () => {
    setName(metadataSnapshot.current.name);
    setDescription(metadataSnapshot.current.description);
    setEmailSubject(metadataSnapshot.current.emailSubject);
    setEditingName(false);
  };

  useEffect(() => {
    const media = window.matchMedia("(max-width: 760px)");
    const sync = () => setMobileMetadataSheet(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  const [selectedVariableElement, setSelectedVariableElement] =
    useState<HTMLElement | null>(null);
  const [selectedVariableBox, setSelectedVariableBox] =
    useState<DOMRect | null>(null);
  const draggedVariableElement = useRef<HTMLElement | null>(null);
  const [selectedTableCell, setSelectedTableCell] =
    useState<HTMLTableCellElement | null>(null);
  const [variables, setVariables] = useState<TemplateVariable[]>(() =>
    parseTemplateVariables(template?.variablesJson ?? "[]"),
  );

  const [variableOpen, setVariableOpen] = useState(false);
  const [dataTableOpen, setDataTableOpen] = useState(false);
  const [editingDataTable, setEditingDataTable] = useState<
    TemplateVariable | undefined
  >();
  const dataTableCreatedVariableHandler = useRef<
    ((variable: TemplateVariable) => void) | null
  >(null);

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
    justifyBetween: false,
    unorderedList: false,
    orderedList: false,
    block: "p",
    fontSize: "",
    lineHeight: "",
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

  const [imageOpen, setImageOpen] = useState(false);
  const [imageUrl, setImageUrl] = useState("");
  const [imageError, setImageError] = useState("");
  const [dragging, setDragging] = useState(false);
  const [validatingImage, setValidatingImage] = useState(false);
  const [processingImage, setProcessingImage] = useState(false);

  const [imageWidth, setImageWidth] = useState("240");
  const [imageHeight, setImageHeight] = useState("");
  const [imageFit, setImageFit] = useState<ImageFit>("contain");
  const [imageAlign, setImageAlign] = useState<ImageAlign>("center");

  const [linkOpen, setLinkOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [linkText, setLinkText] = useState("");
  const [linkError, setLinkError] = useState("");

  const [selectedImage, setSelectedImage] = useState<HTMLImageElement | null>(
    null,
  );

  const [resizeBox, setResizeBox] = useState<DOMRect | null>(null);
  const [zoom, setZoom] = useState(100);
  const [dirty, setDirty] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  const create = useCreateTemplateService();
  const update = useUpdateTemplateService(template?.id ?? "");

  const confirmLeave = useCallback(
    () =>
      confirm({
        title: t("unsavedChangesTitle"),
        message: t("unsavedChangesWarning"),
        confirmLabel: t("unsavedChangesLeave"),
        cancelLabel: t("unsavedChangesStay"),
        kind: "danger",
      }),
    [confirm, t],
  );
  useUnsavedChanges(dirty && !isClosing, confirmLeave);
  const closeEditor = async () => {
    if (dirty && !(await confirmLeave())) return;
    setIsClosing(true);
    onClose();
  };

  useEffect(() => {
    if (editor.current) {
      editor.current.innerHTML =
        template?.content ??
        `<h1>${t("documentTitle")}</h1><p>${t("startWriting")}</p>`;

      normalizeEditorVariableImages(editor.current);
    }

    if (headerEditor.current) {
      headerEditor.current.innerHTML = template?.headerContent ?? "";
      normalizeEditorVariableImages(headerEditor.current);
    }

    if (footerEditor.current) {
      footerEditor.current.innerHTML = template?.footerContent ?? "";
      normalizeEditorVariableImages(footerEditor.current);
    }
  }, [template, t]);

  useEffect(() => {
    if (!window.matchMedia("(max-width: 760px)").matches) return;
    const initialFit = Math.max(
      25,
      Math.floor((((window.innerWidth - 24) / A4_WIDTH_PX) * 100) / 25) * 25,
    );
    setZoom(initialFit);
    // Deliberately do not recompute on resize: mobile keyboards and browser chrome
    // change the viewport and must not reset a zoom explicitly chosen by the user.
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
      if (!resizing.current || !selectedImage) {
        return;
      }

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

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (
        !selectedImage ||
        (event.key !== "Backspace" && event.key !== "Delete")
      ) {
        return;
      }

      const target = event.target as HTMLElement | null;

      if (
        target?.matches("input, textarea, select") ||
        (target?.isContentEditable && window.getSelection()?.toString())
      ) {
        return;
      }

      event.preventDefault();

      removePlacedImage(selectedImage);

      setSelectedImage(null);
      setResizeBox(null);
    };

    window.addEventListener("keydown", onKeyDown);

    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selectedImage]);

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
        justifyBetween: (() => {
          const selection = window.getSelection();
          const anchor = selection?.anchorNode;
          const element =
            anchor instanceof Element ? anchor : anchor?.parentElement;
          const block = element?.closest<HTMLElement>(
            "p, div, h1, h2, h3, h4, h5, blockquote",
          );
          return Boolean(
            block &&
            block.style.display === "flex" &&
            block.style.justifyContent === "space-between",
          );
        })(),
        unorderedList: document.queryCommandState("insertUnorderedList"),
        orderedList: document.queryCommandState("insertOrderedList"),
        block: (() => {
          const value = String(document.queryCommandValue("formatBlock") || "p")
            .toLowerCase()
            .replace(/[<>]/g, "");
          return ["p", "h1", "h2", "h3", "h4", "h5", "blockquote"].includes(
            value,
          )
            ? value
            : "p";
        })(),
        fontSize: (() => {
          const selection = window.getSelection();
          const element =
            selection?.anchorNode instanceof Element
              ? selection.anchorNode
              : selection?.anchorNode?.parentElement;
          const px = element
            ? Math.round(parseFloat(getComputedStyle(element).fontSize))
            : 0;
          return px ? String(px) : "";
        })(),
        lineHeight: (() => {
          const selection = window.getSelection();
          const element =
            selection?.anchorNode instanceof Element
              ? selection.anchorNode
              : selection?.anchorNode?.parentElement;
          if (!element) return "";
          const style = getComputedStyle(element);
          const font = parseFloat(style.fontSize);
          const line = parseFloat(style.lineHeight);
          return font && line
            ? String(Math.round((line / font) * 100) / 100)
            : "";
        })(),
      });
    } catch {}
  };

  const rememberSelection = () => {
    const selection = window.getSelection();

    if (!selection?.rangeCount) {
      return;
    }

    const node = selection.anchorNode;

    const region = [
      editor.current,
      headerEditor.current,
      footerEditor.current,
    ].find((element) => element?.contains(node));

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

    const region = activeEditor.current ?? editor.current;
    const selectedToken =
      selectedVariableElement && region?.contains(selectedVariableElement)
        ? selectedVariableElement
        : null;

    if (
      selectedToken &&
      ["bold", "italic", "underline", "foreColor"].includes(command)
    ) {
      if (command === "bold")
        selectedToken.style.fontWeight =
          selectedToken.style.fontWeight === "700" ? "" : "700";
      if (command === "italic")
        selectedToken.style.fontStyle =
          selectedToken.style.fontStyle === "italic" ? "" : "italic";
      if (command === "underline")
        selectedToken.style.textDecoration =
          selectedToken.style.textDecoration.includes("underline")
            ? ""
            : "underline";
      if (command === "foreColor" && value) selectedToken.style.color = value;
      setDirty(true);
      setSelectedVariableBox(selectedToken.getBoundingClientRect());
    } else if (command === "justifyBetween") {
      const selection = window.getSelection();
      const anchor = selection?.anchorNode;
      const element =
        anchor instanceof Element ? anchor : anchor?.parentElement;
      const region = activeEditor.current ?? editor.current;
      const block = element?.closest<HTMLElement>(
        "p, div, h1, h2, h3, h4, h5, blockquote",
      );

      if (block && region?.contains(block)) {
        const enabled = block.dataset.layout === "between";
        if (enabled) {
          block.style.display = "";
          block.style.justifyContent = "";
          block.style.alignItems = "";
          block.style.width = "";
          delete block.dataset.layout;
        } else {
          block.style.display = "flex";
          block.style.justifyContent = "space-between";
          block.style.alignItems = "center";
          block.style.width = "100%";
          block.dataset.layout = "between";
        }
        setDirty(true);
      }
    } else {
      document.execCommand(command, false, value);
    }

    rememberSelection();
    syncToolbarState();
  };

  const normalizePlainVariableTokens = useCallback(() => {
    const knownVariables = new Map(
      variables.map((variable) => [variable.name, variable]),
    );

    [editor.current, headerEditor.current, footerEditor.current].forEach(
      (region) => {
        if (!region) return;

        const walker = document.createTreeWalker(region, NodeFilter.SHOW_TEXT);
        const textNodes: Text[] = [];
        let current = walker.nextNode();

        while (current) {
          const parent = current.parentElement;
          if (
            parent &&
            !parent.closest("[data-variable-name]") &&
            /\{\{[^{}]+\}\}/.test(current.textContent ?? "")
          ) {
            textNodes.push(current as Text);
          }
          current = walker.nextNode();
        }

        textNodes.forEach((textNode) => {
          const text = textNode.textContent ?? "";
          const pattern = /\{\{([^{}]+)\}\}/g;
          let match: RegExpExecArray | null;
          let cursor = 0;
          const fragment = document.createDocumentFragment();
          let changed = false;

          while ((match = pattern.exec(text))) {
            const variableName = match[1];
            const variable = knownVariables.get(variableName);
            if (!variable || variable.type === "image") continue;

            changed = true;
            fragment.append(
              document.createTextNode(text.slice(cursor, match.index)),
            );
            const token = document.createElement("span");
            token.dataset.variableName = variableName;
            token.dataset.variableType = "value";
            token.contentEditable = "false";
            token.textContent = match[0];
            fragment.append(token);
            cursor = match.index + match[0].length;
          }

          if (changed) {
            fragment.append(document.createTextNode(text.slice(cursor)));
            textNode.replaceWith(fragment);
          }
        });
      },
    );
  }, [variables]);

  useEffect(() => {
    normalizePlainVariableTokens();
  }, [normalizePlainVariableTokens, headerEnabled, footerEnabled, template]);

  const selectVariableElement = (target: HTMLElement) => {
    const element = target.closest<HTMLElement>("[data-variable-name]");
    const variableName = element?.dataset.variableName;
    const expectedToken = variableName ? `{{${variableName}}}` : null;

    if (
      !element ||
      element.tagName === "IMG" ||
      !expectedToken ||
      element.textContent?.trim() !== expectedToken
    ) {
      setSelectedVariableElement(null);
      setSelectedVariableBox(null);
      return false;
    }

    setSelectedVariableElement(element);
    setSelectedVariableBox(element.getBoundingClientRect());
    setSelectedImage(null);
    setResizeBox(null);
    return true;
  };

  useEffect(() => {
    if (!selectedVariableElement) {
      setSelectedVariableBox(null);
      return;
    }

    const sync = () => {
      if (!selectedVariableElement.isConnected) {
        setSelectedVariableElement(null);
        setSelectedVariableBox(null);
        return;
      }
      setSelectedVariableBox(selectedVariableElement.getBoundingClientRect());
    };

    sync();
    window.addEventListener("resize", sync);
    window.addEventListener("scroll", sync, true);

    return () => {
      window.removeEventListener("resize", sync);
      window.removeEventListener("scroll", sync, true);
    };
  }, [selectedVariableElement, zoom]);

  const selectTableCell = (target: HTMLElement) => {
    const cell = target.closest<HTMLTableCellElement>("td,th");
    const region = activeEditor.current ?? editor.current;
    if (cell && region?.contains(cell)) {
      setSelectedTableCell(cell);
      return true;
    }
    setSelectedTableCell(null);
    return false;
  };

  const mutateTable = (
    action:
      | "rowBefore"
      | "rowAfter"
      | "rowDelete"
      | "colBefore"
      | "colAfter"
      | "colDelete"
      | "tableDelete",
  ) => {
    const cell = selectedTableCell;
    const row = cell?.parentElement as HTMLTableRowElement | null;
    const table = cell?.closest("table");
    if (!cell || !row || !table) return;
    const columnIndex = Array.from(row.cells).indexOf(cell);
    if (action === "tableDelete") {
      table.remove();
      setSelectedTableCell(null);
      setDirty(true);
      return;
    }
    if (action === "rowBefore" || action === "rowAfter") {
      const newRow = row.cloneNode(false) as HTMLTableRowElement;
      for (let i = 0; i < row.cells.length; i += 1) {
        const td = document.createElement("td");
        td.innerHTML = "<br>";
        newRow.appendChild(td);
      }
      row.parentElement?.insertBefore(
        newRow,
        action === "rowBefore" ? row : row.nextSibling,
      );
    } else if (action === "rowDelete") {
      const parent = row.parentElement;
      row.remove();
      if (!parent?.querySelector("tr")) table.remove();
      setSelectedTableCell(null);
    } else if (action === "colBefore" || action === "colAfter") {
      Array.from(table.rows).forEach((tableRow) => {
        const td = document.createElement("td");
        td.innerHTML = "<br>";
        const reference =
          tableRow.cells[columnIndex + (action === "colAfter" ? 1 : 0)] ?? null;
        tableRow.insertBefore(td, reference);
      });
    } else if (action === "colDelete") {
      Array.from(table.rows).forEach((tableRow) =>
        tableRow.cells[columnIndex]?.remove(),
      );
      if (!table.rows[0]?.cells.length) table.remove();
      setSelectedTableCell(null);
    }
    setDirty(true);
    rememberSelection();
  };

  const insertVariable = (variable: TemplateVariable) => {
    restoreSelection();

    document.execCommand("insertHTML", false, variableHtml(variable));

    setVariables((current) => upsertVariable(current, variable));

    setVariableOpen(false);

    rememberSelection();

    const region = activeEditor.current ?? editor.current;

    if (variable.type === "image" && region) {
      normalizeEditorVariableImages(region);
    }
  };

  const saveVariableDefinition = (
    variable: TemplateVariable,
    insertIntoWorkspace = true,
  ) => {
    setDirty(true);
    if (!editingVariable) {
      if (insertIntoWorkspace) insertVariable(variable);
      else {
        setVariables((current) => upsertVariable(current, variable));
        setVariableOpen(false);
        rememberSelection();
      }
      return;
    }

    const oldName = editingVariable.name;

    setVariables((current) =>
      upsertVariable(
        current.map((item) =>
          oldName !== variable.name && item.formula
            ? {
                ...item,
                formula: item.formula
                  .split(`{{${oldName}}}`)
                  .join(`{{${variable.name}}}`),
              }
            : item,
        ),
        variable,
        oldName,
      ),
    );

    [editor.current, headerEditor.current, footerEditor.current].forEach(
      (region) => {
        if (!region) {
          return;
        }

        if (variable.type === "image") {
          region
            .querySelectorAll<HTMLImageElement>(
              `img[data-variable-name="${CSS.escape(oldName)}"]`,
            )
            .forEach((img) => {
              img.dataset.variableName = variable.name;
              img.dataset.variableType = "image";
              // The variable definition provides defaults for newly inserted images.
              // Existing placements keep their own size/fit/alignment.
              img.dataset.imageFit =
                img.dataset.imageFit ?? variable.imageFit ?? "contain";

              img.alt = "";
              img.title = `{{${variable.name}}}`;
              img.src = createImageVariablePlaceholder(variable.name);
            });

          /*
           * Cleanup kompatybilności ze starszym formatem.
           *
           * IMAGE variable nie jest tokenem tekstowym i dlatego nie
           * przebudowujemy całego region.innerHTML.
           */
          region
            .querySelectorAll<HTMLElement>(
              `[data-variable-label="${CSS.escape(oldName)}"]`,
            )
            .forEach((label) => label.remove());

          normalizeEditorVariableImages(region);

          return;
        }

        if (oldName === variable.name) {
          return;
        }

        /*
         * Zwykłe text/date/select variables nadal istnieją jako token:
         *
         * {{variableName}}
         */
        region.innerHTML = region.innerHTML
          .split(`{{${oldName}}}`)
          .join(`{{${variable.name}}}`);
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
          `<img draggable="true" src="${src.replace(
            /"/g,
            "&quot;",
          )}" alt="" data-image-fit="${imageFit}" style="${imageStyle(
            imageWidth,
            imageAlign,
            imageHeight || undefined,
            imageFit,
          )}" />&nbsp;`,
        )
      ) {
        throw new Error();
      }

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
      setProcessingImage(true);

      const type = normalizedImageType(file);

      if (!SUPPORTED_TEMPLATE_IMAGE_TYPES.has(type)) {
        setImageError(t("imageInvalidType"));
        return;
      }

      const bytes = new Uint8Array(await file.slice(0, 16).arrayBuffer());

      if (!MAGIC[type]?.(bytes)) {
        setImageError(t("imageSignatureInvalid"));
        return;
      }

      const optimized = await optimizeTemplateImage(file);
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(reader.error);

        reader.readAsDataURL(optimized);
      });

      insertImage(dataUrl);
    } catch (error) {
      const code = error instanceof Error ? error.message : "";
      setImageError(
        code === "IMAGE_SOURCE_TOO_LARGE" || code === "IMAGE_OUTPUT_TOO_LARGE"
          ? t("imageTooLarge")
          : t("imageReadError"),
      );
    } finally {
      setProcessingImage(false);
    }
  };

  const chooseFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (file) {
      void validateFile(file);
    }

    event.target.value = "";
  };

  const dropFile = (event: DragEvent) => {
    event.preventDefault();

    setDragging(false);

    const file = event.dataTransfer.files?.[0];

    if (file) {
      void validateFile(file);
    }
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
          (c) =>
            ({
              "<": "&lt;",
              ">": "&gt;",
              "&": "&amp;",
            })[c]!,
        );

        if (
          !document.execCommand(
            "insertHTML",
            false,
            `<a href="${url.replace(
              /"/g,
              "&quot;",
            )}" target="_blank" rel="noopener noreferrer">${text}</a>`,
          )
        ) {
          throw new Error();
        }
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
    if (!px) {
      return;
    }

    restoreSelection();

    const region = activeEditor.current ?? editor.current;
    const selection = window.getSelection();
    const range = selection?.rangeCount ? selection.getRangeAt(0) : null;
    const selectedToken =
      selectedVariableElement && region?.contains(selectedVariableElement)
        ? selectedVariableElement
        : null;

    const tokensInSelection =
      region && range
        ? Array.from(
            region.querySelectorAll<HTMLElement>(
              '[data-variable-name][data-variable-type="value"]',
            ),
          ).filter((token) => {
            try {
              return range.intersectsNode(token);
            } catch {
              return false;
            }
          })
        : [];

    document.execCommand("fontSize", false, "7");

    region?.querySelectorAll('font[size="7"]').forEach((element) => {
      const html = element as HTMLElement;
      html.removeAttribute("size");
      html.style.fontSize = `${px}px`;
    });

    const variableTokens = new Set(tokensInSelection);
    if (selectedToken) {
      variableTokens.add(selectedToken);
    }

    variableTokens.forEach((token) => {
      token.style.fontSize = `${px}px`;
    });

    region?.focus();
    rememberSelection();
    syncToolbarState();
    setDirty(true);
  };

  const setLineHeight = (value: string) => {
    if (!value) return;
    restoreSelection();
    const selection = window.getSelection();
    if (!selection?.rangeCount) return;
    const range = selection.getRangeAt(0);
    const node = range.commonAncestorContainer;
    const element = (
      node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement
    ) as HTMLElement | null;
    const block = element?.closest(
      "p,h1,h2,h3,h4,h5,blockquote,li,div",
    ) as HTMLElement | null;
    if (block && (activeEditor.current ?? editor.current)?.contains(block))
      block.style.lineHeight = value;
    rememberSelection();
    syncToolbarState();
  };

  const updateSelectedImage = (
    width = imageWidth,
    height = imageHeight,
    fit: ImageFit = imageFit,
    align: ImageAlign = imageAlign,
  ) => {
    if (!selectedImage) {
      return;
    }

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
    if (selectedImage === image) {
      setResizeBox(image.getBoundingClientRect());
      return;
    }

    setSelectedVariableElement(null);
    setSelectedVariableBox(null);
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
    if (!selectedImage) {
      return;
    }

    const sibling =
      direction < 0 ? selectedImage.previousSibling : selectedImage.nextSibling;

    if (!sibling) {
      return;
    }

    direction < 0
      ? sibling.before(selectedImage)
      : sibling.after(selectedImage);

    selectedImage.scrollIntoView({
      block: "nearest",
    });

    if (selectedImage.dataset.variableType === "image") {
      const region = selectedImage.closest(
        ".a4-paper, .page-header-editor, .page-footer-editor",
      ) as HTMLDivElement | null;

      normalizeEditorVariableImages(region);
    }

    requestAnimationFrame(() =>
      setResizeBox(selectedImage.getBoundingClientRect()),
    );
  };

  const rangeAtPoint = (x: number, y: number) => {
    const doc = document as Document & {
      caretRangeFromPoint?: (x: number, y: number) => Range | null;

      caretPositionFromPoint?: (
        x: number,
        y: number,
      ) => {
        offsetNode: Node;
        offset: number;
      } | null;
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

  const dropVariableAtPoint = (
    variable: TemplateVariable,
    x: number,
    y: number,
  ): boolean => {
    const range = rangeAtPoint(x, y);
    if (!range) return false;

    const region = [
      headerEditor.current,
      editor.current,
      footerEditor.current,
    ].find((candidate) => candidate?.contains(range.startContainer));
    if (!region) return false;

    activeEditor.current = region;
    savedRange.current = range;
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
    document.execCommand("insertHTML", false, variableHtml(variable));
    if (variable.type === "image") normalizeEditorVariableImages(region);
    rememberSelection();
    return true;
  };

  const dropIntoRegion = (
    event: DragEvent<HTMLDivElement>,
    region: HTMLDivElement | null,
  ) => {
    const range = rangeAtPoint(event.clientX, event.clientY);
    const draggedVariable = draggedVariableElement.current;

    if (draggedVariable && range && region?.contains(range.startContainer)) {
      event.preventDefault();

      if (draggedVariable.contains(range.startContainer)) {
        draggedVariableElement.current = null;
        return;
      }

      range.insertNode(draggedVariable);
      draggedVariableElement.current = null;
      setSelectedVariableElement(draggedVariable);
      setSelectedVariableBox(draggedVariable.getBoundingClientRect());
      setDirty(true);
      rememberSelection();
      return;
    }

    const variableName = event.dataTransfer.getData("text/docflow-variable");

    const variable = variables.find((item) => item.name === variableName);

    if (variable && range && region?.contains(range.startContainer)) {
      event.preventDefault();

      activeEditor.current = region;
      savedRange.current = range;

      insertVariable(variable);

      return;
    }

    if (
      !draggedImage.current ||
      !range ||
      !region?.contains(range.startContainer)
    ) {
      return;
    }

    event.preventDefault();

    /*
     * Przenosimy dokładnie ten sam <img>.
     *
     * Dzięki temu zachowujemy:
     * - width,
     * - height,
     * - object-fit,
     * - alignment,
     * - data-variable-*,
     * - pozostałe style.
     */
    const img = draggedImage.current;

    range.insertNode(img);

    /*
     * IMAGE variable musi dostać poprawny placeholder natychmiast
     * po dropie.
     *
     * Nie czekamy na blur/click/ponowne zaznaczenie.
     */
    if (img.dataset.variableType === "image") {
      const name = img.dataset.variableName ?? "image";

      img.src = createImageVariablePlaceholder(name);
      img.alt = "";
      img.title = `{{${name}}}`;

      normalizeEditorVariableImages(region);
    }

    selectImage(img);

    requestAnimationFrame(() => {
      setResizeBox(img.getBoundingClientRect());
    });

    draggedImage.current = null;
  };

  const dropIntoEditor = (event: DragEvent<HTMLDivElement>) =>
    dropIntoRegion(event, editor.current);

  const startResize = (
    event: ReactMouseEvent,
    mode: "width" | "height" | "both" = "both",
  ) => {
    if (!selectedImage) {
      return;
    }

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

  const serializeRegion = (region: HTMLElement | null) => {
    if (!region) return "";
    const clone = region.cloneNode(true) as HTMLElement;
    clone
      .querySelectorAll("[data-variable-actions]")
      .forEach((node) => node.remove());
    clone
      .querySelectorAll<HTMLElement>("[data-variable-editor-wrapper]")
      .forEach((wrapper) => {
        const token = wrapper.querySelector<HTMLElement>(
          ":scope > [data-variable-name]",
        );
        if (token) wrapper.replaceWith(token);
        else wrapper.remove();
      });
    return clone.innerHTML;
  };

  const save = async () => {
    [editor.current, headerEditor.current, footerEditor.current].forEach(
      normalizeEditorVariableImages,
    );

    const payload = {
      name: name.trim(),
      description: description.trim(),
      emailSubject: emailSubject.trim(),

      content: serializeRegion(editor.current),

      headerContent: headerEnabled ? serializeRegion(headerEditor.current) : "",

      footerContent: footerEnabled ? serializeRegion(footerEditor.current) : "",

      pageNumbers,
      variables,
    };

    if (!payload.name) {
      notify(t("nameRequired"), "error");
      setEditingName(true);
      requestAnimationFrame(() => nameRef.current?.focus());
      return;
    }

    if (!payload.content) {
      notify(t("contentRequired"), "error");
      editor.current?.focus();
      return;
    }

    try {
      template
        ? await update.mutateAsync(payload)
        : await create.mutateAsync(payload);
      notify(t(template ? "updateSuccess" : "createSuccess"), "success");
      setDirty(false);
      setIsClosing(true);
      onClose();
    } catch {
      notify(t("saveError"), "error");
    }
  };

  const pending = create.isPending || update.isPending;

  return (
    <div className="editor-overlay">
      <div
        className="editor-shell"
        onInputCapture={(event) => {
          const target = event.target as Element;
          if (!target.closest(".variable-dialog")) setDirty(true);
        }}
        onChangeCapture={(event) => {
          const target = event.target as Element;
          if (!target.closest(".variable-dialog")) setDirty(true);
        }}
      >
        <header className="editor-header">
          <button
            className="mobile-editor-back"
            type="button"
            onClick={() => void closeEditor()}
            aria-label={t("back")}
          >
            <ArrowLeft size={18} />

            <span className="mobile-editor-back-label">{t("back")}</span>
          </button>

          <div className="editor-header-title">
            <button
              type="button"
              className="editor-header-name-button"
              onClick={() =>
                editingName ? cancelMetadataEditor() : openMetadataEditor()
              }
              title={name.trim() || t("templateName")}
              aria-expanded={editingName}
            >
              <span>{name.trim() || t("templateName")}</span>
              <Pencil aria-hidden="true" />
            </button>
          </div>

          {editingName &&
            (mobileMetadataSheet && typeof document !== "undefined" ? (
              createPortal(
                <>
                  <button
                    type="button"
                    className="editor-header-meta-backdrop"
                    aria-label={t("cancel")}
                    onClick={cancelMetadataEditor}
                  />
                  <div
                    className="editor-header-meta-popover"
                    role="dialog"
                    aria-modal="true"
                    aria-label={t("templateName")}
                  >
                    <label className="field">
                      <span>
                        {t("templateName")}{" "}
                        <strong className="required-mark">*</strong>
                      </span>
                      <InputControl
                        ref={nameRef}
                        className="editor-header-name-input"
                        maxLength={250}
                        value={name}
                        onChange={(event) => setName(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            event.preventDefault();
                            setEditingName(false);
                          }
                          if (event.key === "Escape") {
                            event.preventDefault();
                            cancelMetadataEditor();
                          }
                        }}
                      />
                    </label>

                    <label className="field">
                      <span>{t("description")}</span>
                      <textarea
                        className="input-control editor-header-description-input"
                        maxLength={400}
                        rows={3}
                        value={description}
                        onChange={(event) => setDescription(event.target.value)}
                        placeholder={t("description")}
                      />
                    </label>

                    <label className="field">
                      <span>{t("emailSubject")}</span>
                      <InputControl
                        maxLength={250}
                        value={emailSubject}
                        onChange={(event) =>
                          setEmailSubject(event.target.value)
                        }
                        placeholder={t("emailSubjectPlaceholder")}
                      />
                      <small>{t("emailSubjectHelp")}</small>
                    </label>

                    <div className="editor-header-meta-actions">
                      <button
                        type="button"
                        className="btn secondary compact"
                        onClick={cancelMetadataEditor}
                      >
                        <X size={16} /> {t("cancel")}
                      </button>
                      <button
                        type="button"
                        className="btn compact editor-header-meta-done"
                        onClick={() => setEditingName(false)}
                      >
                        <Check size={16} /> {t("done")}
                      </button>
                    </div>
                  </div>
                </>,
                document.body,
              )
            ) : (
              <>
                <button
                  type="button"
                  className="editor-header-meta-backdrop"
                  aria-label={t("cancel")}
                  onClick={cancelMetadataEditor}
                />
                <div
                  className="editor-header-meta-popover"
                  role="dialog"
                  aria-modal="true"
                  aria-label={t("templateName")}
                >
                  <label className="field">
                    <span>
                      {t("templateName")}{" "}
                      <strong className="required-mark">*</strong>
                    </span>
                    <InputControl
                      ref={nameRef}
                      className="editor-header-name-input"
                      maxLength={250}
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          setEditingName(false);
                        }
                        if (event.key === "Escape") {
                          event.preventDefault();
                          cancelMetadataEditor();
                        }
                      }}
                    />
                  </label>

                  <label className="field">
                    <span>{t("description")}</span>
                    <textarea
                      className="input-control editor-header-description-input"
                      maxLength={400}
                      rows={3}
                      value={description}
                      onChange={(event) => setDescription(event.target.value)}
                      placeholder={t("description")}
                    />
                  </label>

                  <label className="field">
                    <span>{t("emailSubject")}</span>
                    <InputControl
                      maxLength={250}
                      value={emailSubject}
                      onChange={(event) => setEmailSubject(event.target.value)}
                      placeholder={t("emailSubjectPlaceholder")}
                    />
                    <small>{t("emailSubjectHelp")}</small>
                  </label>

                  <div className="editor-header-meta-actions">
                    <button
                      type="button"
                      className="btn secondary compact"
                      onClick={cancelMetadataEditor}
                    >
                      <X size={16} /> {t("cancel")}
                    </button>
                    <button
                      type="button"
                      className="btn compact editor-header-meta-done"
                      onClick={() => setEditingName(false)}
                    >
                      <Check size={16} /> {t("done")}
                    </button>
                  </div>
                </div>
              </>
            ))}

          <div className="editor-actions">
            <button
              className="btn secondary"
              onClick={() => void closeEditor()}
            >
              <X size={17} />
              {t("close")}
            </button>

            <button className="btn" disabled={pending} onClick={save}>
              {pending ? (
                <>
                  <LoaderCircle className="spinner" size={17} />

                  {t("saving")}
                </>
              ) : (
                <>
                  <Save size={17} />
                  {t("save")}
                </>
              )}
            </button>
          </div>
        </header>

        <div className="editor-sticky-controls">
          <EditorToolbar
            t={t}
            cmd={cmd}
            setPx={setPx}
            setLineHeight={setLineHeight}
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
            openDataTable={() => {
              rememberSelection();
              setEditingDataTable(undefined);
              setDataTableOpen(true);
            }}
            state={toolbarState}
          />

          {selectedTableCell &&
            (() => {
              const dataTableElement = selectedTableCell.closest<HTMLElement>(
                "[data-data-table-name]",
              );
              const dataTableDefinition = dataTableElement
                ? variables.find(
                    (item) =>
                      item.type === "dataTable" &&
                      item.name === dataTableElement.dataset.dataTableName,
                  )
                : undefined;
              return (
                <div
                  className="table-context-bar"
                  role="toolbar"
                  aria-label="Table actions"
                >
                  {dataTableDefinition ? (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingDataTable(dataTableDefinition);
                          setDataTableOpen(true);
                        }}
                      >
                        <Pencil size={15} /> Edit table
                      </button>
                      <button
                        type="button"
                        className="danger"
                        onClick={() => mutateTable("tableDelete")}
                      >
                        <Trash2 size={15} /> Delete table
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => mutateTable("rowBefore")}
                      >
                        + Row ↑
                      </button>
                      <button
                        type="button"
                        onClick={() => mutateTable("rowAfter")}
                      >
                        + Row ↓
                      </button>
                      <button
                        type="button"
                        onClick={() => mutateTable("rowDelete")}
                      >
                        − Row
                      </button>
                      <button
                        type="button"
                        onClick={() => mutateTable("colBefore")}
                      >
                        + Col ←
                      </button>
                      <button
                        type="button"
                        onClick={() => mutateTable("colAfter")}
                      >
                        + Col →
                      </button>
                      <button
                        type="button"
                        onClick={() => mutateTable("colDelete")}
                      >
                        − Col
                      </button>
                      <button
                        type="button"
                        className="danger"
                        onClick={() => mutateTable("tableDelete")}
                      >
                        Delete table
                      </button>
                    </>
                  )}
                </div>
              );
            })()}

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
                removePlacedImage(selectedImage);

                setSelectedImage(null);
                setResizeBox(null);
              }}
            />
          )}

          <VariableShelf
            t={t}
            variables={variables}
            rememberSelection={rememberSelection}
            insertVariable={(variable) => {
              if (variable.type === "dataTable") {
                restoreSelection();
                document.execCommand(
                  "insertHTML",
                  false,
                  dataTableHtml(variable, variables),
                );
                setDirty(true);
                rememberSelection();
                return;
              }
              insertVariable(variable);
            }}
            editVariable={(variable) => {
              if (variable.type === "dataTable") {
                setEditingDataTable(variable);
                setDataTableOpen(true);
                return;
              }
              setEditingVariable(variable);
              setVariableOpen(true);
            }}
            removeVariable={(variableName) =>
              setVariables((current) =>
                current.filter((variable) => variable.name !== variableName),
              )
            }
            dropVariableAtPoint={dropVariableAtPoint}
            reorderVariable={(from, to) =>
              setVariables((current) => {
                if (
                  from < 0 ||
                  to < 0 ||
                  from >= current.length ||
                  to > current.length
                ) {
                  return current;
                }

                const next = [...current];
                const [moved] = next.splice(from, 1);

                const insertAt = from < to ? to - 1 : to;

                if (insertAt === from) {
                  return current;
                }

                next.splice(insertAt, 0, moved);

                return next;
              })
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

          <ZoomBar t={t} zoom={zoom} setZoom={setZoom} />
        </div>

        <div className="paper-stage">
          <div
            className="paper-zoom"
            style={
              {
                "--editor-zoom": zoom / 100,
                "--scaled-a4-width": `${A4_WIDTH_PX * (zoom / 100)}px`,
                "--scaled-a4-height": `${Math.round(A4_WIDTH_PX * (297 / 210) * (zoom / 100))}px`,
              } as CSSProperties
            }
          >
            <div
              className="a4-page-shell"
              data-header-enabled={headerEnabled}
              data-footer-enabled={footerEnabled}
            >
              {headerEnabled && (
                <div
                  ref={headerEditor}
                  className="page-header-editor"
                  contentEditable
                  onDoubleClick={(event) => {
                    const table = (
                      event.target as HTMLElement
                    ).closest<HTMLElement>("[data-data-table-name]");
                    if (!table) return;
                    const definition = variables.find(
                      (item) =>
                        item.type === "dataTable" &&
                        item.name === table.dataset.dataTableName,
                    );
                    if (definition) {
                      setEditingDataTable(definition);
                      setDataTableOpen(true);
                    }
                  }}
                  suppressContentEditableWarning
                  onFocus={() => {
                    activeEditor.current = headerEditor.current;
                  }}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={(event) =>
                    dropIntoRegion(event, headerEditor.current)
                  }
                  onDragStart={(event) => {
                    const target = event.target as HTMLElement;

                    if (target.tagName === "IMG") {
                      draggedImage.current = target as HTMLImageElement;

                      event.dataTransfer.effectAllowed = "move";
                    }
                  }}
                  onClick={(event) => {
                    const target = event.target as HTMLElement;
                    selectTableCell(target);
                    if (selectVariableElement(target)) return;

                    if (target.tagName === "IMG") {
                      selectImage(target as HTMLImageElement);
                    }
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
                onDoubleClick={(event) => {
                  const table = (
                    event.target as HTMLElement
                  ).closest<HTMLElement>("[data-data-table-name]");
                  if (!table) return;
                  const definition = variables.find(
                    (item) =>
                      item.type === "dataTable" &&
                      item.name === table.dataset.dataTableName,
                  );
                  if (definition) {
                    setEditingDataTable(definition);
                    setDataTableOpen(true);
                  }
                }}
                onDragOver={(event) => event.preventDefault()}
                onDragStart={(event) => {
                  const target = event.target as HTMLElement;

                  if (target.tagName === "IMG") {
                    draggedImage.current = target as HTMLImageElement;

                    event.dataTransfer.effectAllowed = "move";
                  }
                }}
                onDrop={dropIntoEditor}
                onFocus={() => {
                  activeEditor.current = editor.current;
                }}
                onKeyUp={rememberSelection}
                onMouseUp={rememberSelection}
                onClick={(event) => {
                  const target = event.target as HTMLElement;
                  selectTableCell(target);
                  if (selectVariableElement(target)) return;

                  if (target.tagName === "IMG") {
                    selectImage(target as HTMLImageElement);

                    return;
                  }

                  editor.current
                    ?.querySelectorAll("img[data-selected=true]")
                    .forEach((node) => node.removeAttribute("data-selected"));

                  setSelectedImage(null);
                }}
              />

              {footerEnabled && (
                <div
                  ref={footerEditor}
                  className="page-footer-editor"
                  contentEditable
                  onDoubleClick={(event) => {
                    const table = (
                      event.target as HTMLElement
                    ).closest<HTMLElement>("[data-data-table-name]");
                    if (!table) return;
                    const definition = variables.find(
                      (item) =>
                        item.type === "dataTable" &&
                        item.name === table.dataset.dataTableName,
                    );
                    if (definition) {
                      setEditingDataTable(definition);
                      setDataTableOpen(true);
                    }
                  }}
                  suppressContentEditableWarning
                  onFocus={() => {
                    activeEditor.current = footerEditor.current;
                  }}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={(event) =>
                    dropIntoRegion(event, footerEditor.current)
                  }
                  onDragStart={(event) => {
                    const target = event.target as HTMLElement;

                    if (target.tagName === "IMG") {
                      draggedImage.current = target as HTMLImageElement;

                      event.dataTransfer.effectAllowed = "move";
                    }
                  }}
                  onClick={(event) => {
                    const target = event.target as HTMLElement;
                    selectTableCell(target);
                    if (selectVariableElement(target)) return;

                    if (target.tagName === "IMG") {
                      selectImage(target as HTMLImageElement);
                    }
                  }}
                  onKeyUp={rememberSelection}
                  onMouseUp={rememberSelection}
                  data-placeholder={t("footerPlaceholder")}
                />
              )}

              {pageNumbers && <div className="page-number-preview">1 / 1</div>}
            </div>
          </div>

          {selectedVariableElement &&
            selectedVariableBox &&
            (() => {
              const variableName = selectedVariableElement.dataset.variableName;
              const variable = variables.find(
                (item) => item.name === variableName,
              );
              if (!variable) return null;

              const actionsWidth = 74;
              const actionsHeight = 30;
              const gap = 6;
              const viewportPadding = 8;
              const canPlaceRight =
                selectedVariableBox.right + gap + actionsWidth <=
                window.innerWidth - viewportPadding;
              const left = canPlaceRight
                ? selectedVariableBox.right + gap
                : Math.max(
                    viewportPadding,
                    selectedVariableBox.left - actionsWidth - gap,
                  );
              const top = Math.min(
                window.innerHeight - actionsHeight - viewportPadding,
                Math.max(
                  viewportPadding,
                  selectedVariableBox.top +
                    selectedVariableBox.height / 2 -
                    actionsHeight / 2,
                ),
              );

              return (
                <div
                  className="selected-variable-actions"
                  style={{ left, top }}
                  onMouseDown={(event) => event.preventDefault()}
                >
                  <button
                    type="button"
                    className="selected-variable-edit"
                    aria-label={t("editVariable")}
                    title={t("editVariable")}
                    onClick={() => {
                      setEditingVariable(variable);
                      setVariableOpen(true);
                    }}
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    type="button"
                    className="selected-variable-delete"
                    aria-label={t("removeVariable")}
                    title={t("removeVariable")}
                    onClick={() => {
                      selectedVariableElement.remove();
                      setSelectedVariableElement(null);
                      setSelectedVariableBox(null);
                      setDirty(true);
                    }}
                  >
                    <Trash2 size={14} />
                  </button>
                  <button
                    type="button"
                    draggable
                    className="selected-variable-drag"
                    aria-label="Move variable"
                    title="Move variable"
                    onMouseDown={(event) => event.stopPropagation()}
                    onDragStart={(event) => {
                      draggedVariableElement.current = selectedVariableElement;
                      event.dataTransfer.effectAllowed = "move";
                      event.dataTransfer.setData(
                        "text/docflow-variable-instance",
                        variable.name,
                      );
                    }}
                    onDragEnd={() => {
                      draggedVariableElement.current = null;
                    }}
                  >
                    <GripVertical size={14} />
                  </button>
                </div>
              );
            })()}

          {selectedImage && resizeBox && (
            <>
              <button
                type="button"
                className="image-resize-handle"
                aria-label={t("resizeImage")}
                title={t("resizeImage")}
                onMouseDown={(event) => startResize(event, "both")}
                style={{
                  left: resizeBox.right - 10,
                  top: resizeBox.bottom - 10,
                }}
              />

              <button
                type="button"
                className="image-resize-handle image-resize-width"
                aria-label={t("resizeImageWidth")}
                onMouseDown={(event) => startResize(event, "width")}
                style={{
                  left: resizeBox.right - 10,
                  top: resizeBox.top + resizeBox.height / 2 - 10,
                }}
              />

              <button
                type="button"
                className="image-resize-handle image-resize-height"
                aria-label={t("resizeImageHeight")}
                onMouseDown={(event) => startResize(event, "height")}
                style={{
                  left: resizeBox.left + resizeBox.width / 2 - 10,
                  top: resizeBox.bottom - 10,
                }}
              />

              {selectedImage.dataset.variableType === "image" &&
                selectedImage.dataset.variableName && (
                  <button
                    type="button"
                    className="selected-image-edit"
                    aria-label={t("edit")}
                    title={t("edit")}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => {
                      const variable = variables.find(
                        (item) =>
                          item.name === selectedImage.dataset.variableName,
                      );
                      if (!variable) return;
                      setEditingVariable(variable);
                      setVariableOpen(true);
                    }}
                    style={{
                      left: resizeBox.right - 52,
                      top: resizeBox.top - 16,
                    }}
                  >
                    <Pencil size={15} />
                  </button>
                )}

              <button
                type="button"
                className="selected-image-delete"
                aria-label={t("remove")}
                title={t("remove")}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => {
                  removePlacedImage(selectedImage);

                  setSelectedImage(null);
                  setResizeBox(null);
                }}
                style={{
                  left: resizeBox.right - 16,
                  top: resizeBox.top - 16,
                }}
              >
                <Trash2 size={15} />
              </button>
            </>
          )}
        </div>

        {dataTableOpen && (
          <DataTableModal
            variables={variables}
            initial={editingDataTable}
            onClose={() => {
              setDataTableOpen(false);
              setEditingDataTable(undefined);
            }}
            onCreateVariable={(onCreated) => {
              dataTableCreatedVariableHandler.current = onCreated;
              setEditingVariable(undefined);
              setVariableOpen(true);
            }}
            onEditVariable={(variable) => {
              setEditingVariable(variable);
              setVariableOpen(true);
            }}
            onDeleteVariable={(variable) => {
              setVariables((current) =>
                current.filter((item) => item.name !== variable.name),
              );
              setDirty(true);
            }}
            onSave={(table) => {
              const previousName = editingDataTable?.name;
              setVariables((current) =>
                upsertVariable(current, table, previousName ?? table.name),
              );
              if (editingDataTable) {
                const region = activeEditor.current ?? editor.current;
                const existing = region?.querySelector<HTMLElement>(
                  `[data-data-table-name="${CSS.escape(previousName ?? table.name)}"]`,
                );
                if (existing) {
                  const holder = document.createElement("div");
                  holder.innerHTML = dataTableHtml(table, variables);
                  existing.replaceWith(holder.firstElementChild!);
                }
              } else {
                restoreSelection();
                document.execCommand(
                  "insertHTML",
                  false,
                  dataTableHtml(table, variables),
                );
              }
              setDirty(true);
              setDataTableOpen(false);
              setEditingDataTable(undefined);
              rememberSelection();
            }}
          />
        )}

        {variableOpen && (
          <VariableModal
            onClose={() => {
              setVariableOpen(false);
              setEditingVariable(undefined);
              dataTableCreatedVariableHandler.current = null;
            }}
            onInsert={(variable, insertIntoWorkspace) => {
              if (dataTableCreatedVariableHandler.current && dataTableOpen) {
                setVariables((current) => upsertVariable(current, variable));
                dataTableCreatedVariableHandler.current(variable);
                dataTableCreatedVariableHandler.current = null;
                setVariableOpen(false);
                setEditingVariable(undefined);
                setDirty(true);
                return;
              }
              saveVariableDefinition(variable, insertIntoWorkspace);
            }}
            initial={editingVariable}
            existingVariables={variables}
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
            processing={processingImage}
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
