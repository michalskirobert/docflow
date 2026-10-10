"use client";
import { normalizeDocumentFontHtml } from "@/lib/document-fonts";
import { CategoryField } from "@/features/categories/CategoryField";
import { DEFAULT_CATEGORY } from "@/features/categories/definitions";

import { InputControl } from "@/components/shared/form";
import {
  type ChangeEvent,
  type CSSProperties,
  type DragEvent,
  type MouseEvent as ReactMouseEvent,
  type WheelEvent as ReactWheelEvent,
  type MutableRefObject,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { useTranslations } from "next-intl";
import { createPortal } from "react-dom";
import { useFeedback } from "@/components/ui/feedback-provider";
import { useUnsavedChanges } from "@/hooks/use-unsaved-changes";
import { useScrollLock } from "@/hooks/use-scroll-lock";
import {
  MOBILE_EDITOR_NAV_BACK,
  MOBILE_EDITOR_NAV_SAVE,
  MOBILE_EDITOR_NAV_EDIT_META,
  publishMobileEditorNav,
} from "@/lib/mobile-editor-nav";
import {
  ArrowLeft,
  Check,
  CopyPlus,
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
import {
  A4_WIDTH_PX,
  normalizeTemplateEditorFontFamily,
} from "@/utils/constants";
import { useSharedDocumentRegions } from "./useSharedDocumentRegions";
import { VariableModal } from "./VariableModal";
import { DataTableModal } from "./DataTableModal";
import { dataTableHtml, ensureDataTableCaretHosts } from "../data-table";
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
  useScrollLock();

  const { notify, confirm } = useFeedback();
  const nameRef = useRef<HTMLInputElement>(null);
  const editor = useRef<HTMLDivElement>(null);
  const headerEditor = useRef<HTMLDivElement>(null);
  const footerEditor = useRef<HTMLDivElement>(null);
  const sharedRegions = useSharedDocumentRegions(
    editor,
    headerEditor,
    footerEditor,
  );
  const lastValidHeaderHtml = useRef("");
  const lastValidFooterHtml = useRef("");
  const fileRef = useRef<HTMLInputElement>(null);
  const savedRange = useRef<Range | null>(null);
  const formattingTransaction = useRef(false);
  const lastBodyInputType = useRef<string>("");
  const revealBodyCaret = useRef(false);

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
  const [category, setCategory] = useState(
    template?.category ?? DEFAULT_CATEGORY,
  );
  const [emailSubject, setEmailSubject] = useState(
    template?.emailSubject ?? "",
  );
  const [editingName, setEditingName] = useState(false);
  const [mobileMetadataSheet, setMobileMetadataSheet] = useState(false);
  const metadataSnapshot = useRef({
    name: template?.name ?? t("defaultTemplateName"),
    description: template?.description ?? "",
    emailSubject: template?.emailSubject ?? "",
    category: template?.category ?? DEFAULT_CATEGORY,
  });

  const openMetadataEditor = () => {
    metadataSnapshot.current = { name, description, emailSubject, category };
    setEditingName(true);
    requestAnimationFrame(() => nameRef.current?.focus());
  };

  const cancelMetadataEditor = () => {
    setName(metadataSnapshot.current.name);
    setDescription(metadataSnapshot.current.description);
    setEmailSubject(metadataSnapshot.current.emailSubject);
    setCategory(metadataSnapshot.current.category);
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
  const [variableRemoval, setVariableRemoval] = useState<{
    element: HTMLElement;
    variable: TemplateVariable;
  } | null>(null);
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
    fontFamily: "",
    lineHeight: "",
  });

  const [headerEnabled, setHeaderEnabled] = useState(
    template?.headerEnabled ?? Boolean(template?.headerContent),
  );

  const [footerEnabled, setFooterEnabled] = useState(
    template?.footerEnabled ?? Boolean(template?.footerContent),
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
  useEffect(() => {
    if (window.matchMedia("(max-width: 760px)").matches) setZoom(50);
  }, []);
  const [dirty, setDirty] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [editorPageCount, setEditorPageCount] = useState(1);

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
      const initialContent =
        template?.content ??
        `<h1>${t("documentTitle")}</h1><p>${t("startWriting")}</p>`;
      editor.current.innerHTML = "";
      const page = document.createElement("section");
      page.className = "editor-a4-page";
      page.contentEditable = "false";
      const body = document.createElement("div");
      body.className = "editor-a4-page-body";
      body.contentEditable = "true";
      body.innerHTML = normalizeDocumentFontHtml(initialContent);
      page.appendChild(body);
      editor.current.appendChild(page);

      normalizeEditorVariableImages(editor.current);
      ensureDataTableCaretHosts(editor.current);
    }

    if (headerEditor.current) {
      headerEditor.current.innerHTML = normalizeDocumentFontHtml(
        template?.headerContent ?? "",
      );
      lastValidHeaderHtml.current = headerEditor.current.innerHTML;
      normalizeEditorVariableImages(headerEditor.current);
      ensureDataTableCaretHosts(headerEditor.current);
    }

    if (footerEditor.current) {
      footerEditor.current.innerHTML = normalizeDocumentFontHtml(
        template?.footerContent ?? "",
      );
      lastValidFooterHtml.current = footerEditor.current.innerHTML;
      normalizeEditorVariableImages(footerEditor.current);
      ensureDataTableCaretHosts(footerEditor.current);
    }

    sharedRegions.reset();

    // Build repeated page chrome only after both shared sources are hydrated.
    // Previously the first pagination pass could race the hidden footer/header
    // source and only a later UI toggle forced the correct content to appear.
    const reflowAfterFonts = () => requestAnimationFrame(paginateEditor);
    document.fonts.addEventListener("loadingdone", reflowAfterFonts);
    document.fonts.ready.then(() =>
      requestAnimationFrame(() => requestAnimationFrame(paginateEditor)),
    );
    return () =>
      document.fonts.removeEventListener("loadingdone", reflowAfterFonts);
  }, [template, t]);

  const keepRegionWithinA4 = (
    region: HTMLDivElement | null,
    lastValid: MutableRefObject<string>,
  ) => {
    if (!region) return;

    // Keep every supported font size. The shared print CSS clips oversized
    // chrome at the same physical boundary in the editor and exported PDF.
    lastValid.current = region.innerHTML;
    region.scrollTop = 0;
  };

  const commitActiveBoundedRegion = (region = activeEditor.current) => {
    if (!region) return;

    const isHeader = region.classList.contains("editor-a4-page-header");
    const isFooter = region.classList.contains("editor-a4-page-footer");
    if (!isHeader && !isFooter) return;

    const lastValid = isHeader ? lastValidHeaderHtml : lastValidFooterHtml;
    keepRegionWithinA4(region as HTMLDivElement, lastValid);

    sharedRegions.commit(region);
  };

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

  const syncToolbarState = (explicitToken?: HTMLElement | null) => {
    try {
      const token = explicitToken ?? selectedVariableElement;
      const tokenStyle = token ? getComputedStyle(token) : null;
      const selection = window.getSelection();
      const selectionNode = selection?.anchorNode ?? null;
      const region =
        [editor.current, headerEditor.current, footerEditor.current].find(
          (candidate) =>
            candidate && selectionNode && candidate.contains(selectionNode),
        ) ??
        activeEditor.current ??
        editor.current;
      setToolbarState({
        bold: tokenStyle
          ? Number(tokenStyle.fontWeight) >= 600 ||
            tokenStyle.fontWeight === "bold"
          : document.queryCommandState("bold"),
        italic: tokenStyle
          ? tokenStyle.fontStyle === "italic"
          : document.queryCommandState("italic"),
        underline: tokenStyle
          ? tokenStyle.textDecorationLine.includes("underline")
          : document.queryCommandState("underline"),
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
          if (tokenStyle) {
            const px = Math.round(parseFloat(tokenStyle.fontSize));
            return px ? String(px) : "";
          }
          const selection = window.getSelection();
          const range = selection?.rangeCount ? selection.getRangeAt(0) : null;
          let element: Element | null = null;

          if (range) {
            const start = range.startContainer;
            if (start.nodeType === Node.TEXT_NODE) {
              element = start.parentElement;
            } else if (start instanceof Element) {
              const child = start.childNodes.item(
                Math.min(
                  range.startOffset,
                  Math.max(0, start.childNodes.length - 1),
                ),
              );
              element =
                child?.nodeType === Node.TEXT_NODE
                  ? child.parentElement
                  : child instanceof Element
                    ? child
                    : start;
            }

            // A selection that starts on the editor/block boundary can report the
            // inherited 16px instead of the actual formatted text. Prefer the first
            // text node inside the selected range in that case.
            if (element === region || !range.collapsed) {
              const walkerRoot = range.commonAncestorContainer;
              const walker = document.createTreeWalker(
                walkerRoot,
                NodeFilter.SHOW_TEXT,
                {
                  acceptNode(node) {
                    if (!node.textContent?.trim())
                      return NodeFilter.FILTER_SKIP;
                    try {
                      return range.intersectsNode(node)
                        ? NodeFilter.FILTER_ACCEPT
                        : NodeFilter.FILTER_SKIP;
                    } catch {
                      return NodeFilter.FILTER_SKIP;
                    }
                  },
                },
              );
              const textNode = walker.nextNode();
              if (textNode?.parentElement) element = textNode.parentElement;
            }
          }

          const px = element
            ? Math.round(parseFloat(getComputedStyle(element).fontSize))
            : 0;
          return px ? String(px) : "";
        })(),
        fontFamily: (() => {
          if (tokenStyle) {
            return normalizeTemplateEditorFontFamily(tokenStyle.fontFamily);
          }

          const selection = window.getSelection();
          const range = selection?.rangeCount ? selection.getRangeAt(0) : null;
          let element: Element | null = null;

          if (range) {
            const start = range.startContainer;
            if (start.nodeType === Node.TEXT_NODE) {
              element = start.parentElement;
            } else if (start instanceof Element) {
              const child = start.childNodes.item(
                Math.min(
                  range.startOffset,
                  Math.max(0, start.childNodes.length - 1),
                ),
              );
              element =
                child?.nodeType === Node.TEXT_NODE
                  ? child.parentElement
                  : child instanceof Element
                    ? child
                    : start;
            }

            if (element === region || !range.collapsed) {
              const walker = document.createTreeWalker(
                range.commonAncestorContainer,
                NodeFilter.SHOW_TEXT,
                {
                  acceptNode(node) {
                    if (!node.textContent?.trim())
                      return NodeFilter.FILTER_SKIP;
                    try {
                      return range.intersectsNode(node)
                        ? NodeFilter.FILTER_ACCEPT
                        : NodeFilter.FILTER_SKIP;
                    } catch {
                      return NodeFilter.FILTER_SKIP;
                    }
                  },
                },
              );
              const textNode = walker.nextNode();
              if (textNode?.parentElement) element = textNode.parentElement;
            }
          }

          return element
            ? normalizeTemplateEditorFontFamily(
                getComputedStyle(element).fontFamily,
              )
            : "";
        })(),
        lineHeight: (() => {
          if (tokenStyle) {
            const font = parseFloat(tokenStyle.fontSize);
            const line = parseFloat(tokenStyle.lineHeight);
            return font && line
              ? String(Math.round((line / font) * 100) / 100)
              : "";
          }
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

    const selectionElement =
      node instanceof Element ? node : (node?.parentElement ?? null);
    const pageRegion = selectionElement?.closest<HTMLDivElement>(
      ".editor-a4-page-header, .editor-a4-page-body, .editor-a4-page-footer",
    );
    const region =
      pageRegion ??
      [headerEditor.current, footerEditor.current, editor.current].find(
        (element) => element?.contains(node),
      );

    if (region) {
      const range = selection.getRangeAt(0);

      // A variable click creates an explicit variable selection. As soon as the
      // user makes a normal text/range selection, do not let that stale token
      // hijack toolbar commands (font size, family, bold, etc.).
      if (selectedVariableElement) {
        const tokenText = selectedVariableElement.textContent?.trim() ?? "";
        const selectionText = selection.toString().trim();
        let intersectsSelectedToken = false;
        try {
          intersectsSelectedToken = range.intersectsNode(
            selectedVariableElement,
          );
        } catch {}

        const isVariableOnlySelection =
          intersectsSelectedToken && selectionText === tokenText;

        if (!isVariableOnlySelection) {
          selectedVariableElement.removeAttribute("data-variable-selected");
          setSelectedVariableElement(null);
          setSelectedVariableBox(null);
        }
      }

      activeEditor.current = region;
      commitActiveBoundedRegion(region);
      savedRange.current = selection.rangeCount
        ? selection.getRangeAt(0).cloneRange()
        : range.cloneRange();

      syncToolbarState();
    }
  };

  const getSavedRangeRegion = () => {
    const range = savedRange.current;
    if (!range) return null;
    const node = range.startContainer;
    const element = node instanceof Element ? node : node.parentElement;
    const pageRegion = element?.closest<HTMLDivElement>(
      ".editor-a4-page-header, .editor-a4-page-body, .editor-a4-page-footer",
    );
    if (pageRegion?.isConnected) return pageRegion;
    return null;
  };

  const restoreSelection = () => {
    // The toolbar temporarily owns focus. Resolve the editor from the saved
    // Range itself, not from activeEditor, because activeEditor can still point
    // at BODY after a mobile focus hand-off. This was the remaining header-only
    // failure: the Range belonged to HEADER while formatting was executed
    // against the stale BODY editor.
    const savedRegion = getSavedRangeRegion();
    const target = savedRegion ?? activeEditor.current ?? editor.current;
    if (savedRegion) activeEditor.current = savedRegion;
    target?.focus({ preventScroll: true });

    const selection = window.getSelection();

    if (savedRange.current && selection) {
      try {
        selection.removeAllRanges();
        selection.addRange(savedRange.current);
      } catch {
        // A repeated page may have been rebuilt. Keep focus on the resolved
        // region; the caller can create a fresh caret there.
      }
    }
  };

  const restoreSelectionAfterToolbarPopup = () => {
    restoreSelection();
    syncToolbarState();
  };

  const expandCollapsedSelectionToCurrentBlock = () => {
    const selection = window.getSelection();
    const region = activeEditor.current ?? editor.current;

    if (!selection?.rangeCount || !region) return;

    const range = selection.getRangeAt(0);
    if (!range.collapsed) return;

    const anchor = range.startContainer;
    const element = anchor instanceof Element ? anchor : anchor.parentElement;
    const block = element?.closest<HTMLElement>(
      "p,h1,h2,h3,h4,h5,blockquote,li,div",
    );

    // Header/footer often contain plain text directly in the region (for
    // example `NurByteDev<br>`), without a wrapping <p>/<div>. In that case
    // the old code left a collapsed caret and execCommand(fontSize/fontName)
    // only changed the typing state. The visible header therefore stayed at
    // 16px and the toolbar immediately read 16px back. Treat a collapsed
    // caret in a bounded page region as editing that region's current value.
    const boundedRegion =
      region.classList.contains("editor-a4-page-header") ||
      region.classList.contains("editor-a4-page-footer");

    const target =
      block && block !== region && region.contains(block)
        ? block
        : boundedRegion
          ? region
          : null;

    if (!target) return;

    const blockRange = document.createRange();
    blockRange.selectNodeContents(target);
    selection.removeAllRanges();
    selection.addRange(blockRange);
    savedRange.current = blockRange.cloneRange();
  };

  const cmd = (command: string, value?: string) => {
    restoreSelection();

    const region = activeEditor.current ?? editor.current;
    const selectedToken =
      selectedVariableElement && region?.contains(selectedVariableElement)
        ? selectedVariableElement
        : null;

    if (
      (command === "undo" || command === "redo") &&
      region &&
      sharedRegions.navigate(region, command === "undo" ? -1 : 1)
    ) {
      setSelectedImage(null);
      setSelectedVariableElement(null);
      setSelectedVariableBox(null);
      const lastValid = region.classList.contains("editor-a4-page-header")
        ? lastValidHeaderHtml
        : lastValidFooterHtml;
      lastValid.current = region.innerHTML;
      rememberSelection();
      syncToolbarState();
      setDirty(true);
      return;
    }

    if (
      selectedToken &&
      ["bold", "italic", "underline", "foreColor"].includes(command)
    ) {
      if (command === "bold") {
        const computedWeight = getComputedStyle(selectedToken).fontWeight;
        const isBold =
          computedWeight === "bold" ||
          Number.parseInt(computedWeight, 10) >= 600;

        selectedToken.style.fontWeight = isBold ? "400" : "700";
      }
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
      syncToolbarState(selectedToken);
    } else if (command === "justifyBetween") {
      const selection = window.getSelection();
      const anchor = selection?.anchorNode;
      const element =
        anchor instanceof Element ? anchor : anchor?.parentElement;
      const region = activeEditor.current ?? editor.current;
      let block = element?.closest<HTMLElement>(
        "p, div, h1, h2, h3, h4, h5, blockquote",
      );
      if (block === region && anchor?.nodeType === Node.TEXT_NODE) {
        block = document.createElement("p");
        anchor.parentNode?.insertBefore(block, anchor);
        block.appendChild(anchor);
      }

      if (block && block !== region && region?.contains(block)) {
        const enabled = block.dataset.layout === "between";
        if (enabled) {
          block.style.display = "";
          block.style.justifyContent = "";
          block.style.alignItems = "";
          block.style.width = "";
          block.style.gap = "";
          block
            .querySelectorAll<HTMLElement>("[data-between-word]")
            .forEach((word) => {
              if (word.hasAttribute("data-between-styled")) {
                word.removeAttribute("data-between-word");
                word.removeAttribute("data-between-styled");
              } else word.replaceWith(...word.childNodes);
            });
          delete block.dataset.layout;
        } else {
          // Preserve a font/bold wrapper when a whole formatted line is one
          // inline item; otherwise flex cannot separate its words.
          const onlyChild =
            block.childNodes.length === 1 ? block.firstElementChild : null;
          if (
            onlyChild &&
            /^(FONT|SPAN|B|STRONG|I|EM|U)$/.test(onlyChild.tagName) &&
            !onlyChild.hasAttribute("data-variable-name") &&
            onlyChild.childNodes.length === 1 &&
            onlyChild.firstChild?.nodeType === Node.TEXT_NODE
          ) {
            const fragment = document.createDocumentFragment();
            for (const part of (onlyChild.textContent ?? "").split(/(\s+)/)) {
              if (!part) continue;
              if (/^\s+$/.test(part))
                fragment.append(document.createTextNode(part));
              else {
                const word = onlyChild.cloneNode(false) as HTMLElement;
                word.removeAttribute("id");
                word.dataset.betweenWord = "true";
                word.dataset.betweenStyled = "true";
                word.textContent = part;
                fragment.append(word);
              }
            }
            onlyChild.replaceWith(fragment);
          }
          // Anonymous flex text becomes one item. Make plain words separate
          // items while preserving whitespace for toggling back to normal flow.
          for (const node of Array.from(block.childNodes)) {
            if (node.nodeType !== Node.TEXT_NODE) continue;
            const fragment = document.createDocumentFragment();
            for (const part of (node.textContent ?? "").split(/(\s+)/)) {
              if (!part) continue;
              if (/^\s+$/.test(part))
                fragment.append(document.createTextNode(part));
              else {
                const word = document.createElement("span");
                word.dataset.betweenWord = "true";
                word.textContent = part;
                fragment.append(word);
              }
            }
            node.replaceWith(fragment);
          }
          block.style.display = "flex";
          block.style.justifyContent = "space-between";
          block.style.alignItems = "center";
          block.style.width = "100%";
          block.style.gap = "8px";
          block.dataset.layout = "between";
        }
        setDirty(true);
      }
    } else {
      if (["bold", "italic", "underline", "foreColor"].includes(command)) {
        expandCollapsedSelectionToCurrentBlock();
      }
      formattingTransaction.current = true;
      try {
        document.execCommand(command, false, value);
      } finally {
        formattingTransaction.current = false;
      }
    }

    commitActiveBoundedRegion();
    rememberSelection();
    syncToolbarState();
    setDirty(true);
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
      [editor.current, headerEditor.current, footerEditor.current].forEach(
        (region) =>
          region
            ?.querySelectorAll<HTMLElement>("[data-variable-selected='true']")
            .forEach((token) =>
              token.removeAttribute("data-variable-selected"),
            ),
      );
      setSelectedVariableElement(null);
      setSelectedVariableBox(null);
      return false;
    }

    [editor.current, headerEditor.current, footerEditor.current].forEach(
      (region) =>
        region
          ?.querySelectorAll<HTMLElement>("[data-variable-selected='true']")
          .forEach((token) => token.removeAttribute("data-variable-selected")),
    );

    element.dataset.variableSelected = "true";
    setSelectedVariableElement(element);
    setSelectedVariableBox(element.getBoundingClientRect());
    setSelectedImage(null);
    setResizeBox(null);

    const region = [
      editor.current,
      headerEditor.current,
      footerEditor.current,
    ].find((candidate) => candidate?.contains(element));
    if (region) activeEditor.current = region;

    const range = document.createRange();
    range.selectNode(element);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
    savedRange.current = range.cloneRange();
    syncToolbarState(element);
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

    const selection = window.getSelection();
    const region = activeEditor.current ?? editor.current;
    const range =
      selection?.rangeCount &&
      region?.contains(selection.getRangeAt(0).commonAncestorContainer)
        ? selection.getRangeAt(0)
        : savedRange.current;

    if (range && region?.contains(range.commonAncestorContainer)) {
      range.deleteContents();
      const fragment = range.createContextualFragment(variableHtml(variable));
      const lastNode = fragment.lastChild;
      range.insertNode(fragment);

      if (lastNode) {
        const caret = document.createRange();
        caret.setStartAfter(lastNode);
        caret.collapse(true);
        selection?.removeAllRanges();
        selection?.addRange(caret);
        savedRange.current = caret.cloneRange();
      }
    } else {
      region?.focus({ preventScroll: true });
      document.execCommand("insertHTML", false, variableHtml(variable));
    }

    setVariables((current) => upsertVariable(current, variable));

    setVariableOpen(false);

    rememberSelection();

    if (variable.type === "image" && region) {
      normalizeEditorVariableImages(region);
    }
  };

  const nextDuplicateName = (sourceName: string) => {
    const existing = new Set(variables.map((item) => item.name));
    const base = `${sourceName}Copy`;
    if (!existing.has(base)) return base;
    let suffix = 2;
    while (existing.has(`${base}${suffix}`)) suffix += 1;
    return `${base}${suffix}`;
  };

  const duplicateVariableDefinition = (source: TemplateVariable) => {
    const copy: TemplateVariable = {
      ...structuredClone(source),
      name: nextDuplicateName(source.name),
      label: source.label ? `${source.label} (${t("copy")})` : undefined,
    };
    setVariables((current) => [...current, copy]);
    setDirty(true);
    return copy;
  };

  const duplicatePlacedVariable = (
    source: TemplateVariable,
    element: HTMLElement,
  ) => {
    const copy = duplicateVariableDefinition(source);
    if (source.type === "dataTable") {
      const nextVariables = [...variables, copy];
      element.insertAdjacentHTML(
        "afterend",
        dataTableHtml(copy, nextVariables),
      );
      const region = activeEditor.current ?? editor.current;
      if (region) ensureDataTableCaretHosts(region);
    } else {
      element.insertAdjacentHTML("afterend", variableHtml(copy));
      const region = activeEditor.current ?? editor.current;
      if (copy.type === "image" && region)
        normalizeEditorVariableImages(region);
    }
    setSelectedVariableElement(null);
    setSelectedVariableBox(null);
    rememberSelection();
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
        current.map((item) => {
          if (oldName === variable.name) return item;
          const calculation = item.calculation;
          return {
            ...item,
            formula: item.formula
              ? item.formula
                  .split(`{{${oldName}}}`)
                  .join(`{{${variable.name}}}`)
              : item.formula,
            calculation:
              calculation?.mode === "fields"
                ? {
                    ...calculation,
                    sourceVariableNames: calculation.sourceVariableNames.map(
                      (name) => (name === oldName ? variable.name : name),
                    ),
                  }
                : calculation?.mode === "repeated"
                  ? {
                      ...calculation,
                      dataTableName:
                        calculation.dataTableName === oldName
                          ? variable.name
                          : calculation.dataTableName,
                      sourceVariableName:
                        calculation.sourceVariableName === oldName
                          ? variable.name
                          : calculation.sourceVariableName,
                    }
                  : calculation,
          };
        }),
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

        region
          .querySelectorAll<HTMLElement>(
            `[data-variable-name="${CSS.escape(oldName)}"]`,
          )
          .forEach((token) => {
            token.dataset.variableName = variable.name;
            token.textContent = `{{${variable.name}}}`;
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

    const selection = window.getSelection();
    const selectionNode = selection?.rangeCount
      ? selection.getRangeAt(0).startContainer
      : null;
    const selectionElement =
      selectionNode instanceof Element
        ? selectionNode
        : (selectionNode?.parentElement ?? null);
    const region =
      selectionElement?.closest<HTMLDivElement>(
        ".editor-a4-page-header, .editor-a4-page-body, .editor-a4-page-footer",
      ) ??
      getSavedRangeRegion() ??
      activeEditor.current ??
      editor.current;
    if (region && region !== editor.current)
      activeEditor.current = region as HTMLDivElement;
    const range = selection?.rangeCount ? selection.getRangeAt(0) : null;
    const selectedToken =
      selectedVariableElement && region?.contains(selectedVariableElement)
        ? selectedVariableElement
        : null;

    if (selectedToken) {
      selectedToken.style.fontSize = `${px}px`;
      setSelectedVariableBox(selectedToken.getBoundingClientRect());
      syncToolbarState(selectedToken);
      commitActiveBoundedRegion();
      setDirty(true);
      restoreSelectionAfterToolbarPopup();
      return;
    }

    if (range?.collapsed) {
      expandCollapsedSelectionToCurrentBlock();
    }

    const activeRange = selection?.rangeCount ? selection.getRangeAt(0) : null;

    const tokensInSelection =
      region && activeRange
        ? Array.from(
            region.querySelectorAll<HTMLElement>(
              '[data-variable-name][data-variable-type="value"]',
            ),
          ).filter((token) => {
            try {
              return activeRange.intersectsNode(token);
            } catch {
              return false;
            }
          })
        : [];

    formattingTransaction.current = true;
    try {
      document.execCommand("fontSize", false, "7");

      region?.querySelectorAll('font[size="7"]').forEach((element) => {
        const html = element as HTMLElement;
        html.removeAttribute("size");
        html.style.fontSize = `${px}px`;
      });
    } finally {
      formattingTransaction.current = false;
    }

    const variableTokens = new Set(tokensInSelection);
    if (selectedToken) {
      variableTokens.add(selectedToken);
    }

    variableTokens.forEach((token) => {
      token.style.fontSize = `${px}px`;
    });

    region?.focus({ preventScroll: true });
    commitActiveBoundedRegion();
    rememberSelection();
    syncToolbarState();
    setDirty(true);
    restoreSelectionAfterToolbarPopup();
  };

  const setFontFamily = (value: string) => {
    if (!value) return;
    restoreSelection();
    const region =
      getSavedRangeRegion() ?? activeEditor.current ?? editor.current;
    if (region && region !== editor.current)
      activeEditor.current = region as HTMLDivElement;
    const selectedToken =
      selectedVariableElement && region?.contains(selectedVariableElement)
        ? selectedVariableElement
        : null;
    if (selectedToken) {
      selectedToken.style.fontFamily = value;
      commitActiveBoundedRegion(region);
      rememberSelection();
      syncToolbarState(selectedToken);
      setDirty(true);
      return;
    }
    const selection = window.getSelection();

    if (selection?.rangeCount && selection.getRangeAt(0).collapsed) {
      expandCollapsedSelectionToCurrentBlock();
    }
    formattingTransaction.current = true;
    try {
      document.execCommand("fontName", false, value);
      region?.querySelectorAll("font[face]").forEach((element) => {
        const html = element as HTMLElement;
        html.style.fontFamily = html.getAttribute("face") || value;
        html.removeAttribute("face");
      });
    } finally {
      formattingTransaction.current = false;
    }
    region?.focus({ preventScroll: true });
    commitActiveBoundedRegion();
    rememberSelection();
    syncToolbarState();
    setDirty(true);
    restoreSelectionAfterToolbarPopup();
  };

  const setLineHeight = (value: string) => {
    if (!value) return;
    restoreSelection();
    const region =
      getSavedRangeRegion() ?? activeEditor.current ?? editor.current;
    if (region && region !== editor.current)
      activeEditor.current = region as HTMLDivElement;
    const selectedToken =
      selectedVariableElement && region?.contains(selectedVariableElement)
        ? selectedVariableElement
        : null;
    if (selectedToken) {
      selectedToken.style.lineHeight = value;
      setSelectedVariableBox(selectedToken.getBoundingClientRect());
      syncToolbarState(selectedToken);
      commitActiveBoundedRegion();
      setDirty(true);
      restoreSelectionAfterToolbarPopup();
      return;
    }
    const selection = window.getSelection();
    if (!selection?.rangeCount) return;
    const range = selection.getRangeAt(0);

    const blockSelector = "p,h1,h2,h3,h4,h5,blockquote,li,div";
    const element =
      range.startContainer instanceof Element
        ? range.startContainer
        : range.startContainer.parentElement;
    const currentBlock = element?.closest<HTMLElement>(blockSelector);
    if (!currentBlock || currentBlock === region) {
      formattingTransaction.current = true;
      try {
        document.execCommand("formatBlock", false, "p");
      } finally {
        formattingTransaction.current = false;
      }
    }
    const activeRange = selection.rangeCount ? selection.getRangeAt(0) : null;
    if (region && activeRange) {
      const blocks = Array.from(
        region.querySelectorAll<HTMLElement>(blockSelector),
      ).filter((block) => {
        if (block.querySelector(blockSelector)) return false;
        return activeRange.intersectsNode(block);
      });
      blocks.forEach((block) => {
        block.style.lineHeight = value;
      });
      commitActiveBoundedRegion(region);
      setDirty(true);
    }
    rememberSelection();
    syncToolbarState();
    restoreSelectionAfterToolbarPopup();
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

    const region = selectedImage.closest<HTMLDivElement>(
      ".editor-a4-page-header, .editor-a4-page-footer",
    );
    if (region) commitActiveBoundedRegion(region);
    setDirty(true);

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
    let range = rangeAtPoint(event.clientX, event.clientY);

    // Header/footer are fixed-size regions. Depending on browser/zoom,
    // caretRangeFromPoint can return a node outside an otherwise valid
    // empty drop target. In that case, fall back to the end of the region
    // instead of rejecting the drop completely.
    if (region && (!range || !region.contains(range.startContainer))) {
      const target = event.target as Node;
      if (region === target || region.contains(target)) {
        range = document.createRange();
        range.selectNodeContents(region);
        range.collapse(false);
      }
    }

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

  const paginateEditor = useCallback(() => {
    const root = editor.current;
    if (!root) return;

    const stage = root.closest<HTMLElement>(".paper-stage");
    const scrollTopBeforeReflow = stage?.scrollTop ?? 0;

    // Keep the browser caret attached to the exact DOM node while that node is
    // moved between physical A4 bodies. Recreating a Range from coordinates or
    // focusing a wrapper after reflow is what caused focus to disappear.
    const selection = window.getSelection();

    // A collapsed native selection can be anchored on the BODY itself (for
    // example directly after an empty paragraph created by Enter). Moving that
    // paragraph to the next page then leaves the caret behind on the old page.
    // A zero-size marker makes the caret part of the DOM flow, so it travels to
    // the same physical A4 as the content around it.
    let caretMarker: HTMLSpanElement | null = null;
    let caretOwnerAfterReflow: HTMLElement | null = null;
    let caretMovedToAnotherPage = false;
    let caretRestoredFromMarker = false;
    if (selection?.rangeCount) {
      const liveRange = selection.getRangeAt(0);
      if (liveRange.collapsed && root.contains(liveRange.startContainer)) {
        try {
          caretMarker = document.createElement("span");
          caretMarker.dataset.editorCaretMarker = "true";
          caretMarker.contentEditable = "false";
          caretMarker.setAttribute("aria-hidden", "true");
          caretMarker.style.cssText =
            "display:inline-block;width:0;height:1em;overflow:hidden;line-height:inherit;vertical-align:baseline;padding:0;margin:0;border:0;opacity:0;pointer-events:none;";
          const markerRange = liveRange.cloneRange();
          markerRange.insertNode(caretMarker);
          markerRange.setStartAfter(caretMarker);
          markerRange.collapse(true);
          selection.removeAllRanges();
          selection.addRange(markerRange);
        } catch {
          caretMarker?.remove();
          caretMarker = null;
        }
      }
    }

    const selectionSnapshot = (() => {
      if (!selection?.rangeCount) return null;
      const range = selection.getRangeAt(0);
      if (
        !root.contains(range.startContainer) ||
        !root.contains(range.endContainer)
      ) {
        return null;
      }
      const anchorElement =
        range.startContainer.nodeType === Node.ELEMENT_NODE
          ? (range.startContainer as Element)
          : range.startContainer.parentElement;
      const owner = anchorElement?.closest<HTMLElement>(
        ".editor-a4-page-header, .editor-a4-page-body, .editor-a4-page-footer",
      );
      const page = owner?.closest<HTMLElement>(".editor-a4-page");
      const pageIndex = page
        ? Array.from(root.querySelectorAll(":scope > .editor-a4-page")).indexOf(
            page,
          )
        : -1;

      return {
        startContainer: range.startContainer,
        startOffset: range.startOffset,
        endContainer: range.endContainer,
        endOffset: range.endOffset,
        collapsed: range.collapsed,
        ownerKind: owner?.classList.contains("editor-a4-page-header")
          ? "header"
          : owner?.classList.contains("editor-a4-page-footer")
            ? "footer"
            : "body",
        pageIndex,
      };
    })();

    const headerHtml = headerEditor.current?.innerHTML ?? "";
    const footerHtml = footerEditor.current?.innerHTML ?? "";

    const makePage = () => {
      const page = document.createElement("section");
      page.className = "editor-a4-page";
      page.contentEditable = "false";

      const header = document.createElement("div");
      header.className = "editor-a4-page-header";
      header.contentEditable = "true";
      header.setAttribute("data-editor-header", "true");
      header.innerHTML = headerHtml;

      const body = document.createElement("div");
      body.className = "editor-a4-page-body";
      body.contentEditable = "true";
      body.setAttribute("data-editor-page-body", "true");

      const footer = document.createElement("div");
      footer.className = "editor-a4-page-footer";
      footer.contentEditable = "true";
      footer.setAttribute("data-editor-footer", "true");
      footer.innerHTML = footerHtml;

      page.append(header, body, footer);
      return page;
    };

    let pages = Array.from(
      root.querySelectorAll<HTMLElement>(":scope > .editor-a4-page"),
    );
    if (!pages.length) {
      const page = makePage();
      root.appendChild(page);
      pages = [page];
    }

    // Header and footer are shared document regions, like Pages/Word: edit
    // either one on any sheet and mirror it to every physical A4.
    pages.forEach((page) => {
      let header = page.querySelector<HTMLElement>(
        ":scope > .editor-a4-page-header",
      );
      if (!header) {
        header = document.createElement("div");
        header.className = "editor-a4-page-header";
        header.contentEditable = "true";
        header.setAttribute("data-editor-header", "true");
        page.insertBefore(header, page.firstChild);
      }
      if (
        document.activeElement !== header &&
        !header.contains(savedRange.current?.startContainer ?? null) &&
        header.innerHTML !== headerHtml
      )
        header.innerHTML = headerHtml;
    });

    // Refresh the shared footer on every physical sheet.
    pages.forEach((page) => {
      let footer = page.querySelector<HTMLElement>(
        ":scope > .editor-a4-page-footer",
      );
      if (!footer) {
        footer = document.createElement("div");
        footer.className = "editor-a4-page-footer";
        footer.contentEditable = "true";
        footer.setAttribute("data-editor-footer", "true");
        page.appendChild(footer);
      }
      if (
        document.activeElement !== footer &&
        !footer.contains(savedRange.current?.startContainer ?? null) &&
        footer.innerHTML !== footerHtml
      )
        footer.innerHTML = footerHtml;
    });

    const measureBodyIntrinsicHeight = (body: HTMLElement) => {
      // Measure in the SAME physical A4 page, not in document.body. A detached
      // clone loses selectors such as `.paper-stage .a4-paper ... >
      // .editor-a4-page-body` and descendant editor rules, so its line wrapping
      // can differ from the live page. The probe is an absolutely-positioned
      // direct child of the same page and therefore inherits the exact editor
      // CSS/width while remaining outside normal layout.
      const page = body.closest<HTMLElement>(".editor-a4-page");
      if (!page) return body.scrollHeight;

      const probe = body.cloneNode(true) as HTMLElement;
      probe.removeAttribute("id");
      probe.contentEditable = "false";
      probe.setAttribute("aria-hidden", "true");
      probe.setAttribute("data-editor-measure-probe", "true");
      probe
        .querySelectorAll("[data-editor-caret-marker]")
        .forEach((marker) => marker.remove());

      // Keep the exact direct-child selector context, but release only the
      // physical BODY height. Inline !important is required because the live
      // BODY contract itself is declared with !important.
      probe.style.setProperty("position", "absolute", "important");
      probe.style.setProperty("inset", "auto", "important");
      probe.style.setProperty("left", "20mm", "important");
      probe.style.setProperty("top", "0", "important");
      probe.style.setProperty("width", `${body.clientWidth}px`, "important");
      probe.style.setProperty("height", "auto", "important");
      probe.style.setProperty("min-height", "0", "important");
      probe.style.setProperty("max-height", "none", "important");
      probe.style.setProperty("flex", "none", "important");
      probe.style.setProperty("overflow", "visible", "important");
      probe.style.setProperty("overflow-x", "visible", "important");
      probe.style.setProperty("overflow-y", "visible", "important");
      probe.style.setProperty("visibility", "hidden", "important");
      probe.style.setProperty("pointer-events", "none", "important");
      probe.style.setProperty("z-index", "-1", "important");

      page.appendChild(probe);
      try {
        // scrollHeight on an unconstrained clone is the intrinsic content
        // height. Also inspect rendered descendants so an empty Enter block
        // (<div><br></div>) counts even when browser scrollHeight rounds it.
        let intrinsic = probe.scrollHeight;
        const probeRect = probe.getBoundingClientRect();
        const scale =
          probe.clientHeight > 0 && probeRect.height > 0
            ? probeRect.height / probe.clientHeight
            : 1;
        let renderedBottom = probeRect.top;

        try {
          const range = document.createRange();
          range.selectNodeContents(probe);
          for (const rect of Array.from(range.getClientRects())) {
            renderedBottom = Math.max(renderedBottom, rect.bottom);
          }
        } catch {
          // Atomic descendants are covered below.
        }

        for (const child of Array.from(
          probe.querySelectorAll<HTMLElement>("*"),
        )) {
          const rect = child.getBoundingClientRect();
          if (rect.height > 0)
            renderedBottom = Math.max(renderedBottom, rect.bottom);
        }

        if (renderedBottom > probeRect.top) {
          intrinsic = Math.max(
            intrinsic,
            (renderedBottom - probeRect.top) / (scale || 1),
          );
        }
        return intrinsic;
      } finally {
        probe.remove();
      }
    };

    const bodyOverflows = (body: HTMLElement) => {
      // The footer is the physical end of editable BODY content. Do not derive
      // this boundary from 249mm/clientHeight: header/footer padding, browser
      // rounding and zoom can make that logical size differ from the actual A4
      // boundary the user sees. Measure both values in the same viewport
      // coordinate system and treat footer.top as the source of truth.
      const page = body.closest<HTMLElement>(".editor-a4-page");
      const footer = page?.querySelector<HTMLElement>(
        ":scope > .editor-a4-page-footer",
      );
      if (!footer) return false;

      const bodyRect = body.getBoundingClientRect();
      const footerTop = footer.getBoundingClientRect().top;
      const zoomScale =
        body.clientHeight > 0 ? bodyRect.height / body.clientHeight : 1;
      const availableLayoutHeight = Math.max(
        0,
        (footerTop - bodyRect.top) / (zoomScale || 1),
      );
      if (availableLayoutHeight <= 0) return false;

      // contentEditable can silently scroll its own editing box to keep the
      // caret visible even when CSS uses overflow:clip/hidden. In that state
      // viewport rects look as if the last line still fits, while the logical
      // content is already below the footer. scrollHeight is the reliable
      // signal for non-empty content and scrollTop tells us that this native
      // internal scroll has happened. Never reset scrollTop here: first reflow
      // the DOM, then the browser naturally returns the BODY to its origin.
      const nativeScrollableOverflow =
        body.scrollHeight - availableLayoutHeight;
      if (nativeScrollableOverflow > 0.75) return true;

      // First use the live rendered content in the SAME viewport coordinate
      // system as footer.top. This is the most direct answer to the only
      // question pagination needs: has any rendered BODY line/node crossed into
      // the reserved footer region? Range/element rects keep their geometric
      // position even when the BODY itself clips the pixels.
      let liveContentBottom = bodyRect.top;
      try {
        const liveRange = document.createRange();
        liveRange.selectNodeContents(body);
        for (const rect of Array.from(liveRange.getClientRects())) {
          if (rect.height > 0 || rect.width > 0) {
            liveContentBottom = Math.max(liveContentBottom, rect.bottom);
          }
        }
      } catch {
        // Descendant boxes below still cover atomic content.
      }
      for (const child of Array.from(body.querySelectorAll<HTMLElement>("*"))) {
        if (child.hasAttribute("data-editor-measure-probe")) continue;
        const rect = child.getBoundingClientRect();
        if (rect.height > 0 || rect.width > 0) {
          liveContentBottom = Math.max(liveContentBottom, rect.bottom);
        }
      }
      if (liveContentBottom > footerTop + 0.25) return true;

      const intrinsicHeight = measureBodyIntrinsicHeight(body);
      return intrinsicHeight > availableLayoutHeight + 0.25;
    };

    const isSplittableTextBlock = (node: Node): node is HTMLElement => {
      if (node.nodeType !== Node.ELEMENT_NODE) return false;
      const element = node as HTMLElement;
      if (!/^(P|DIV|LI|H[1-6]|BLOCKQUOTE)$/.test(element.tagName)) return false;
      // Variables/images/tables are atomic. Never split through them.
      return !element.querySelector(
        "img, table, [data-variable-name], [contenteditable='false']:not([data-editor-caret-marker])",
      );
    };

    const textBoundaryAt = (block: HTMLElement, offset: number) => {
      const walker = document.createTreeWalker(block, NodeFilter.SHOW_TEXT);
      let remaining = Math.max(0, offset);
      let node = walker.nextNode() as Text | null;
      let last: Text | null = null;
      while (node) {
        last = node;
        const length = node.data.length;
        if (remaining <= length) return { node, offset: remaining };
        remaining -= length;
        node = walker.nextNode() as Text | null;
      }
      if (last) return { node: last, offset: last.data.length };
      return null;
    };

    const textOffsetInBlock = (
      block: HTMLElement,
      container: Node,
      offset: number,
    ) => {
      if (!block.contains(container) && block !== container) return null;
      try {
        const range = document.createRange();
        range.selectNodeContents(block);
        range.setEnd(container, offset);
        return range.toString().length;
      } catch {
        return null;
      }
    };

    const splitOverflowingTextBlock = (
      body: HTMLElement,
      block: HTMLElement,
      nextBody: HTMLElement,
    ) => {
      const textLength = block.textContent?.length ?? 0;
      if (textLength < 2) return false;
      const ownerPage = body.closest<HTMLElement>(".editor-a4-page");
      const ownerFooter = ownerPage?.querySelector<HTMLElement>(
        ":scope > .editor-a4-page-footer",
      );
      const bodyBottom =
        (ownerFooter?.getBoundingClientRect().top ??
          body.getBoundingClientRect().bottom) - 0.5;

      const fitsThrough = (offset: number) => {
        const boundary = textBoundaryAt(block, offset);
        if (!boundary) return false;
        const range = document.createRange();
        range.setStart(block, 0);
        range.setEnd(boundary.node, boundary.offset);
        const rects = Array.from(range.getClientRects());
        const bottom = rects.reduce(
          (value, rect) => Math.max(value, rect.bottom),
          -Infinity,
        );
        return Number.isFinite(bottom) && bottom <= bodyBottom;
      };

      if (fitsThrough(textLength)) return false;

      let low = 1;
      let high = textLength - 1;
      let splitOffset = 0;
      while (low <= high) {
        const mid = Math.floor((low + high) / 2);
        if (fitsThrough(mid)) {
          splitOffset = mid;
          low = mid + 1;
        } else high = mid - 1;
      }
      if (splitOffset <= 0 || splitOffset >= textLength) return false;

      // Prefer a natural whitespace boundary near the last fitting character.
      const text = block.textContent ?? "";
      const natural = text.lastIndexOf(" ", splitOffset);
      if (natural > Math.max(0, splitOffset - 80) && natural + 1 <= splitOffset)
        splitOffset = natural + 1;
      if (splitOffset <= 0 || splitOffset >= textLength) return false;

      const boundary = textBoundaryAt(block, splitOffset);
      if (!boundary) return false;

      const caretOffset = selectionSnapshot?.collapsed
        ? textOffsetInBlock(
            block,
            selectionSnapshot.startContainer,
            selectionSnapshot.startOffset,
          )
        : null;

      const tailRange = document.createRange();
      tailRange.setStart(boundary.node, boundary.offset);
      tailRange.setEnd(block, block.childNodes.length);
      const tail = tailRange.extractContents();
      const continuation = block.cloneNode(false) as HTMLElement;
      continuation.removeAttribute("id");
      continuation.appendChild(tail);
      nextBody.insertBefore(continuation, nextBody.firstChild);

      // If the caret belonged to the extracted tail, immediately move it to the
      // corresponding logical character in the continuation. This avoids the
      // transient blur/jump caused by a Range pointing at the shortened block.
      if (caretOffset !== null && caretOffset >= splitOffset) {
        const nextBoundary = textBoundaryAt(
          continuation,
          caretOffset - splitOffset,
        );
        if (nextBoundary) {
          const range = document.createRange();
          range.setStart(nextBoundary.node, nextBoundary.offset);
          range.collapse(true);
          nextBody.focus({ preventScroll: true });
          selection?.removeAllRanges();
          selection?.addRange(range);
          savedRange.current = range.cloneRange();
          activeEditor.current = nextBody as HTMLDivElement;
        }
      }
      return true;
    };

    // Word-like reflow: BODY has a hard physical boundary. Always resolve the
    // current page/body from the live DOM before moving a node. Pagination can
    // create/remove sheets during the same reflow, so cached nextBody references
    // are unsafe (and were the source of the insertBefore(null) crash).
    let pageIndex = 0;
    let guard = 0;
    while (guard++ < 500) {
      const livePages = Array.from(
        root.querySelectorAll<HTMLElement>(":scope > .editor-a4-page"),
      );
      if (pageIndex >= livePages.length) break;

      const page = livePages[pageIndex];
      const body = page?.querySelector<HTMLElement>(
        ":scope > .editor-a4-page-body",
      );
      if (!body?.isConnected) {
        pageIndex += 1;
        continue;
      }

      const getNextBody = () => {
        let currentPages = Array.from(
          root.querySelectorAll<HTMLElement>(":scope > .editor-a4-page"),
        );
        let nextPage = currentPages[pageIndex + 1];
        if (!nextPage?.isConnected) {
          nextPage = makePage();
          const currentPage = currentPages[pageIndex];
          if (currentPage?.isConnected) currentPage.after(nextPage);
          else root.appendChild(nextPage);
          currentPages = Array.from(
            root.querySelectorAll<HTMLElement>(":scope > .editor-a4-page"),
          );
          nextPage = currentPages[pageIndex + 1];
        }
        const nextBody = nextPage?.querySelector<HTMLElement>(
          ":scope > .editor-a4-page-body",
        );
        return nextBody?.isConnected ? nextBody : null;
      };

      let innerGuard = 0;
      while (
        body.isConnected &&
        bodyOverflows(body) &&
        body.lastChild &&
        innerGuard++ < 200
      ) {
        let lastNode: ChildNode = body.lastChild;
        const nextBody = getNextBody();
        if (!nextBody) break;

        // The zero-size caret marker may be a direct BODY child after a native
        // empty Enter. Moving only the marker would leave the empty line on the
        // previous page and make Enter appear to do nothing at the footer. Move
        // the logical node immediately before it together with the marker.
        if (
          lastNode.nodeType === Node.ELEMENT_NODE &&
          (lastNode as HTMLElement).hasAttribute("data-editor-caret-marker")
        ) {
          const markerNode = lastNode;
          const logicalNode = markerNode.previousSibling;
          if (logicalNode) {
            nextBody.insertBefore(markerNode, nextBody.firstChild);
            nextBody.insertBefore(logicalNode, markerNode);
            continue;
          }
          nextBody.insertBefore(markerNode, nextBody.firstChild);
          continue;
        }

        if (lastNode.nodeType === Node.TEXT_NODE) {
          nextBody.insertBefore(lastNode, nextBody.firstChild);
          continue;
        }

        if (isSplittableTextBlock(lastNode)) {
          const split = splitOverflowingTextBlock(body, lastNode, nextBody);
          if (split) continue;
        }

        // Re-resolve once more immediately before the destructive move. A focus/
        // input callback can synchronously alter the page tree in WebKit.
        const liveNextBody = getNextBody();
        if (
          !liveNextBody ||
          !lastNode.isConnected ||
          lastNode.parentNode !== body
        )
          break;
        liveNextBody.insertBefore(lastNode, liveNextBody.firstChild);
      }
      pageIndex += 1;
    }

    // Pull content back after deletions. This also removes empty trailing pages.
    pages = Array.from(
      root.querySelectorAll<HTMLElement>(":scope > .editor-a4-page"),
    );
    for (let i = 0; i < pages.length - 1; i += 1) {
      const body = pages[i].querySelector<HTMLElement>(
        ":scope > .editor-a4-page-body",
      );
      const nextBody = pages[i + 1].querySelector<HTMLElement>(
        ":scope > .editor-a4-page-body",
      );
      if (!body || !nextBody) continue;
      let attempts = 0;
      while (nextBody.firstChild && attempts++ < 100) {
        const candidate = nextBody.firstChild;
        body.appendChild(candidate);
        if (bodyOverflows(body)) {
          nextBody.insertBefore(candidate, nextBody.firstChild);
          break;
        }
      }
    }

    pages = Array.from(
      root.querySelectorAll<HTMLElement>(":scope > .editor-a4-page"),
    );
    for (let i = pages.length - 1; i > 0; i -= 1) {
      const body = pages[i].querySelector<HTMLElement>(
        ":scope > .editor-a4-page-body",
      );
      if (!body) break;

      // Pages/Word rule: page existence is geometric, never semantic. An empty
      // paragraph (<div><br></div>) is real document layout and must keep the
      // page when it cannot fit on the previous sheet. Conversely, reverse-flow
      // above already moves every node (including empty paragraphs) back when
      // it DOES fit. Therefore a trailing page is redundant only when reverse
      // flow has physically drained its BODY. Do not inspect textContent and do
      // not special-case delete/Enter here — those semantic heuristics caused
      // the create/delete/recreate ghost-page loop.
      const contentNodes = Array.from(body.childNodes).filter((node) => {
        return !(
          node.nodeType === Node.ELEMENT_NODE &&
          (node as HTMLElement).hasAttribute("data-editor-caret-marker")
        );
      });

      if (contentNodes.length === 0) {
        const marker = body.querySelector<HTMLElement>(
          "[data-editor-caret-marker]",
        );
        const previousBody = pages[i - 1]?.querySelector<HTMLElement>(
          ":scope > .editor-a4-page-body",
        );
        if (marker && previousBody) previousBody.appendChild(marker);
        pages[i].remove();
        continue;
      }
      break;
    }

    pages = Array.from(
      root.querySelectorAll<HTMLElement>(":scope > .editor-a4-page"),
    );
    const total = Math.max(1, pages.length);
    pages.forEach((page, index) => {
      page.dataset.pageNumber = String(index + 1);
      let number = page.querySelector<HTMLElement>(
        ":scope > .editor-a4-page-number",
      );
      if (pageNumbers) {
        if (!number) {
          number = document.createElement("div");
          number.className = "editor-a4-page-number";
          number.contentEditable = "false";
          page.appendChild(number);
        }
        number.textContent = `${index + 1} / ${total}`;
      } else number?.remove();
    });
    // Restore a collapsed caret from the marker after forward/backward flow.
    // This is especially important for blank Enter lines crossing the BODY /
    // footer boundary. Remove the marker immediately so it is never serialized.
    if (caretMarker?.isConnected) {
      const markerOwner = caretMarker.closest<HTMLElement>(
        ".editor-a4-page-body",
      );
      if (markerOwner) {
        const markerPage = markerOwner.closest<HTMLElement>(".editor-a4-page");
        const markerPageIndex = markerPage
          ? Array.from(
              root.querySelectorAll(":scope > .editor-a4-page"),
            ).indexOf(markerPage)
          : -1;
        caretOwnerAfterReflow = markerOwner;
        caretMovedToAnotherPage =
          selectionSnapshot?.ownerKind === "body" &&
          selectionSnapshot.pageIndex >= 0 &&
          markerPageIndex >= 0 &&
          markerPageIndex !== selectionSnapshot.pageIndex;
        try {
          const markerRange = document.createRange();
          markerRange.setStartBefore(caretMarker);
          markerRange.collapse(true);
          markerOwner.focus({ preventScroll: true });
          selection?.removeAllRanges();
          selection?.addRange(markerRange);
          activeEditor.current = markerOwner as HTMLDivElement;
          savedRange.current = markerRange.cloneRange();
          caretRestoredFromMarker = true;
        } catch {
          // The normal snapshot fallback below can still recover focus.
        }
      }
      caretMarker.remove();
    }

    // If the marker survived reflow it is the authoritative logical caret.
    // Restoring the pre-reflow snapshot afterwards would move the caret back to
    // page #1 even though its paragraph already flowed to page #2.
    if (selectionSnapshot && !caretRestoredFromMarker) {
      const {
        startContainer,
        startOffset,
        endContainer,
        endOffset,
        collapsed,
        ownerKind,
        pageIndex: originalPageIndex,
      } = selectionSnapshot;

      const restoreRange = (range: Range, owner: HTMLElement) => {
        // Focus the live contentEditable first. Safari/WebKit may otherwise
        // replace a restored Range with its own caret during focus().
        if (document.activeElement !== owner)
          owner.focus({ preventScroll: true });
        activeEditor.current = owner as HTMLDivElement;
        selection?.removeAllRanges();
        selection?.addRange(range);
        savedRange.current = range.cloneRange();
      };

      if (
        startContainer.isConnected &&
        endContainer.isConnected &&
        root.contains(startContainer) &&
        root.contains(endContainer)
      ) {
        try {
          const restored = document.createRange();
          const safeStart = Math.min(
            startOffset,
            startContainer.nodeType === Node.TEXT_NODE
              ? (startContainer.textContent?.length ?? 0)
              : startContainer.childNodes.length,
          );
          const safeEnd = Math.min(
            endOffset,
            endContainer.nodeType === Node.TEXT_NODE
              ? (endContainer.textContent?.length ?? 0)
              : endContainer.childNodes.length,
          );
          restored.setStart(startContainer, safeStart);
          if (collapsed) restored.collapse(true);
          else restored.setEnd(endContainer, safeEnd);

          const owner = (
            startContainer.nodeType === Node.ELEMENT_NODE
              ? (startContainer as Element)
              : startContainer.parentElement
          )?.closest<HTMLElement>(
            ".editor-a4-page-header, .editor-a4-page-body, .editor-a4-page-footer",
          );

          if (owner) restoreRange(restored, owner);
        } catch {
          // Fallback below handles a page/body removed during backward reflow.
        }
      } else if (ownerKind === "body") {
        // The active empty trailing page may have been removed after Backspace.
        // Never leave focus pointing at that detached contentEditable. Move the
        // caret to the end of the nearest surviving previous BODY instead.
        const livePages = Array.from(
          root.querySelectorAll<HTMLElement>(":scope > .editor-a4-page"),
        );
        const targetIndex = Math.max(
          0,
          Math.min(originalPageIndex, livePages.length - 1),
        );
        const owner = livePages[targetIndex]?.querySelector<HTMLElement>(
          ":scope > .editor-a4-page-body",
        );
        if (owner) {
          const fallback = document.createRange();
          fallback.selectNodeContents(owner);
          fallback.collapse(false);
          restoreRange(fallback, owner);
        }
      }
    }

    // Pages/Word do not jump to the next sheet. Keep the viewport stable and
    // reveal only the insertion line when it actually leaves the visible stage.
    if (stage) {
      stage.scrollTop = scrollTopBeforeReflow;

      const revealRequested = revealBodyCaret.current;
      revealBodyCaret.current = false;
      if (
        (caretMovedToAnotherPage || revealRequested) &&
        caretOwnerAfterReflow
      ) {
        requestAnimationFrame(() => {
          if (!stage.isConnected || !caretOwnerAfterReflow?.isConnected) return;
          const liveSelection = window.getSelection();
          if (!liveSelection?.rangeCount) return;
          const range = liveSelection.getRangeAt(0).cloneRange();
          let caretRect = Array.from(range.getClientRects()).at(-1) ?? null;

          // Empty paragraphs can expose no Range rect in WebKit. A temporary
          // zero-size probe gives us the insertion line without scrolling/focus.
          let probe: HTMLSpanElement | null = null;
          if (!caretRect && range.collapsed) {
            try {
              probe = document.createElement("span");
              probe.contentEditable = "false";
              probe.setAttribute("aria-hidden", "true");
              probe.style.cssText =
                "display:inline-block;width:0;height:1em;padding:0;margin:0;border:0;";
              range.insertNode(probe);
              caretRect = probe.getBoundingClientRect();
            } catch {
              caretRect = null;
            } finally {
              probe?.remove();
            }
          }
          if (!caretRect) return;

          const stageRect = stage.getBoundingClientRect();
          const margin = 24;
          const visibleTop = stageRect.top + margin;
          const visibleBottom = stageRect.bottom - margin;
          if (caretRect.bottom > visibleBottom) {
            stage.scrollTop += caretRect.bottom - visibleBottom;
          } else if (caretRect.top < visibleTop) {
            stage.scrollTop -= visibleTop - caretRect.top;
          }
        });
      }
    }

    setEditorPageCount(total);
  }, [pageNumbers]);

  // pageNumbers changes must paginate with the callback created for the NEW
  // state. Calling paginateEditor in the checkbox handler used the previous
  // render's closure, which inverted the visible behaviour (checking did
  // nothing, unchecking rendered the numbers).
  useEffect(() => {
    const frame = requestAnimationFrame(() => paginateEditor());
    return () => cancelAnimationFrame(frame);
  }, [paginateEditor]);

  useEffect(() => {
    const root = editor.current;
    if (!root) return;

    let layoutFrame = 0;
    let reflowFrame = 0;
    let running = false;
    let pending = false;

    const run = () => {
      if (running) {
        pending = true;
        return;
      }
      running = true;

      // First RAF lets contentEditable commit the input. The second runs after
      // the browser has recalculated line boxes. This removes the race where
      // pagination only happened after several Enter presses or another state
      // change such as toggling page numbers.
      cancelAnimationFrame(layoutFrame);
      cancelAnimationFrame(reflowFrame);
      layoutFrame = requestAnimationFrame(() => {
        reflowFrame = requestAnimationFrame(() => {
          paginateEditor();
          running = false;
          if (pending) {
            pending = false;
            run();
          }
        });
      });
    };

    const onInput = (event: Event) => {
      const target = event.target as HTMLElement | null;
      // Footer is a fixed shared region; editing it must not run BODY pagination.
      if (!target?.closest(".editor-a4-page-body")) return;
      lastBodyInputType.current =
        event instanceof InputEvent ? event.inputType : "";
      // Deleting within the first page can also move the caret above the stage
      // after a reverse-flow. Keep the insertion line visible on every delete.
      if (lastBodyInputType.current.startsWith("delete"))
        revealBodyCaret.current = true;
      run();
    };

    const handleBoundaryAction = (event: {
      key: string;
      defaultPrevented: boolean;
      isComposing?: boolean;
      altKey?: boolean;
      ctrlKey?: boolean;
      metaKey?: boolean;
      shiftKey?: boolean;
      preventDefault: () => void;
    }) => {
      if (
        event.defaultPrevented ||
        event.isComposing ||
        event.altKey ||
        event.ctrlKey ||
        event.metaKey ||
        event.shiftKey
      )
        return;
      if (!["Backspace", "ArrowUp", "ArrowDown"].includes(event.key)) return;
      const selection = window.getSelection();
      if (!selection?.rangeCount || !selection.isCollapsed) return;
      const range = selection.getRangeAt(0);
      const caretElement =
        range.startContainer.nodeType === Node.ELEMENT_NODE
          ? (range.startContainer as Element)
          : range.startContainer.parentElement;
      const caretBody = caretElement?.closest<HTMLElement>(
        ".editor-a4-page-body",
      );
      if (!caretBody) return;
      const liveBodies = Array.from(
        root.querySelectorAll<HTMLElement>(
          ":scope > .editor-a4-page > .editor-a4-page-body",
        ),
      );
      const bodyIndex = liveBodies.indexOf(caretBody);
      const moveCaret = (owner: HTMLElement, node: Node, atEnd: boolean) => {
        const destination = document.createRange();
        destination.selectNodeContents(node);
        destination.collapse(!atEnd);
        owner.focus({ preventScroll: true });
        selection.removeAllRanges();
        selection.addRange(destination);
        activeEditor.current = owner as HTMLDivElement;
        savedRange.current = destination.cloneRange();
        caretBody.scrollTop = 0;
        owner.scrollTop = 0;
        if (owner !== caretBody) {
          revealBodyCaret.current = true;
          run();
        }
      };
      const cell = caretElement?.closest<HTMLTableCellElement>("td, th");
      const table = cell?.closest<HTMLTableElement>("table");
      if (cell && table && caretBody.contains(table)) {
        const cellPart = document.createRange();
        cellPart.selectNodeContents(cell);
        const backwards = event.key !== "ArrowDown";
        if (backwards) cellPart.setEnd(range.startContainer, range.startOffset);
        else cellPart.setStart(range.startContainer, range.startOffset);
        const cells = Array.from(table.querySelectorAll("td, th")).filter(
          (item) => item.closest("table") === table,
        );
        const row = cell.closest("tr");
        const atTableEdge =
          event.key === "Backspace"
            ? cell === cells[0]
            : backwards
              ? row === cells[0]?.closest("tr")
              : row === cells[cells.length - 1]?.closest("tr");
        // Native contentEditable keeps Backspace/arrow keys trapped in the first
        // or last cell. Exit at that edge without deleting or splitting the table.
        if (
          atTableEdge &&
          !cellPart.toString().length &&
          !cellPart
            .cloneContents()
            .querySelector("img, table, [data-variable-name]")
        ) {
          event.preventDefault();
          const block =
            table.closest<HTMLElement>("[data-data-table-name]") ?? table;
          let neighbour = backwards ? block.previousSibling : block.nextSibling;
          if (!neighbour) {
            const adjacentBody = liveBodies[bodyIndex + (backwards ? -1 : 1)];
            if (adjacentBody?.childNodes.length) {
              moveCaret(adjacentBody, adjacentBody, backwards);
              return;
            }
            const paragraph = document.createElement("p");
            paragraph.innerHTML = "<br>";
            if (backwards) block.before(paragraph);
            else block.after(paragraph);
            neighbour = paragraph;
            setDirty(true);
          }
          moveCaret(caretBody, neighbour, backwards);
          run();
          return;
        }
        return;
      }
      if (event.key === "ArrowUp" || event.key === "ArrowDown") {
        const backwards = event.key === "ArrowUp";
        const remaining = document.createRange();
        remaining.selectNodeContents(caretBody);
        if (backwards)
          remaining.setEnd(range.startContainer, range.startOffset);
        else remaining.setStart(range.startContainer, range.startOffset);
        const adjacentBody = liveBodies[bodyIndex + (backwards ? -1 : 1)];
        if (
          adjacentBody &&
          !remaining.toString().length &&
          !remaining
            .cloneContents()
            .querySelector(
              "img, table, [data-variable-name], [data-data-table-name]",
            )
        ) {
          event.preventDefault();
          moveCaret(adjacentBody, adjacentBody, backwards);
        }
        return;
      }
      const body = caretBody;
      const page = body.closest<HTMLElement>(".editor-a4-page");
      if (!page) return;
      const pages = Array.from(
        root.querySelectorAll<HTMLElement>(":scope > .editor-a4-page"),
      );
      const pageIndex = pages.indexOf(page);
      if (pageIndex <= 0) return;

      if (!body.contains(range.startContainer)) return;

      // Separate contentEditable BODYs do not let the browser Backspace across
      // an automatic page boundary. Detect the logical beginning of this BODY
      // and bridge it to the previous physical A4 ourselves.
      const prefix = document.createRange();
      prefix.selectNodeContents(body);
      try {
        prefix.setEnd(range.startContainer, range.startOffset);
      } catch {
        return;
      }
      const beforeCaret = prefix.cloneContents();
      // Indentation between HTML blocks is not a preceding editable character.
      // Whitespace inside a paragraph still counts, so typed spaces delete normally.
      const prefixText = document.createTreeWalker(
        beforeCaret,
        NodeFilter.SHOW_TEXT,
      );
      while (prefixText.nextNode()) {
        const node = prefixText.currentNode;
        if (!node.textContent?.length) continue;
        if (
          !node.textContent.trim() &&
          /[\r\n\t]/.test(node.textContent) &&
          node.parentNode === beforeCaret
        )
          continue;
        if (node.textContent.replace(/[\u200B\uFEFF]/g, "").length) return;
      }

      const beforeCaretHasStructure = Boolean(
        beforeCaret.querySelector(
          "img, table, [data-variable-name], [data-data-table-name]",
        ),
      );
      if (beforeCaretHasStructure) return;

      event.preventDefault();

      // If this sheet starts with the empty paragraph that automatic Enter
      // pushed here, Backspace removes that paragraph just like Pages/Word.
      const block = caretElement?.closest<HTMLElement>(
        "p, div, li, blockquote, h1, h2, h3, h4, h5, h6",
      );
      if (
        block &&
        body.contains(block) &&
        !block.textContent?.trim() &&
        !block.querySelector("img, table, [data-variable-name]")
      ) {
        block.remove();
      }

      const previousBody = pages[pageIndex - 1].querySelector<HTMLElement>(
        ":scope > .editor-a4-page-body",
      );
      if (!previousBody) return;

      // This Backspace is the explicit cross-page merge operation. Do not leave
      // an empty contentEditable sheet around and hope that the later generic
      // cleanup recognises Chrome's placeholder DOM. That was the ghost-page
      // cycle: #2 stayed mounted, then #1 internally scrolled under the footer.
      // If the current BODY contains no real document content after removing
      // its leading empty paragraph, remove the physical page synchronously.
      const hasRealBodyContent = Array.from(body.childNodes).some((node) => {
        if (node.nodeType === Node.TEXT_NODE)
          return Boolean(node.textContent?.trim());
        if (node.nodeType !== Node.ELEMENT_NODE) return false;
        const element = node as HTMLElement;
        if (element.hasAttribute("data-editor-caret-marker")) return false;
        if (element.tagName === "BR") return false;
        if (element.matches("img, table, [data-variable-name]")) return true;
        if (element.textContent?.trim()) return true;
        return Boolean(
          element.querySelector("img, table, [data-variable-name]"),
        );
      });

      const previousRange = document.createRange();
      const lastBlock = previousBody.lastElementChild;
      const caretTarget =
        lastBlock?.matches("p, div, li, blockquote, h1, h2, h3, h4, h5, h6") &&
        !lastBlock.querySelector(
          "table, img, [data-variable-name], [data-data-table-name]",
        )
          ? lastBlock
          : previousBody;
      previousRange.selectNodeContents(caretTarget);
      previousRange.collapse(false);
      previousBody.focus({ preventScroll: true });
      selection.removeAllRanges();
      selection.addRange(previousRange);
      activeEditor.current = previousBody as HTMLDivElement;
      savedRange.current = previousRange.cloneRange();

      // Crossing an automatic page boundary with Backspace is a destructive
      // merge operation. Once the current BODY contains no real content, remove
      // that physical sheet immediately. Leaving Chrome's empty placeholder
      // mounted here poisons the next reverse-flow: the previous BODY can retain
      // its old overflow/scroll geometry and the following Enter is then allowed
      // to render underneath the footer instead of recreating page #2.
      //
      // This is intentionally different from normal reverse-flow. A page that
      // still contains text/table/image remains geometry-driven; only a BODY
      // that has just been emptied by this cross-page Backspace is removed.
      if (!hasRealBodyContent && page.isConnected) {
        page.remove();
      }

      // Normalize any stale contentEditable scroll state left by Chromium after
      // the former overflow. The BODY itself is not a scroll owner; paper-stage
      // is. Future input must therefore be measured from the physical top of the
      // previous BODY and immediately paginate again when it reaches the footer.
      previousBody.scrollTop = 0;
      previousBody.scrollLeft = 0;

      // Keep the previous insertion line visible after crossing the boundary.
      // Merely moving focus with preventScroll leaves page two on screen.
      revealBodyCaret.current = true;
      run();
    };

    const onKeyDown = (event: KeyboardEvent) => handleBoundaryAction(event);
    const onBeforeInput = (event: InputEvent) => {
      if (event.inputType !== "deleteContentBackward" || !event.cancelable)
        return;
      handleBoundaryAction({
        key: "Backspace",
        defaultPrevented: event.defaultPrevented,
        isComposing: event.isComposing,
        preventDefault: () => event.preventDefault(),
      });
    };

    root.addEventListener("input", onInput, true);
    root.addEventListener("keydown", onKeyDown, true);
    root.addEventListener("beforeinput", onBeforeInput, true);

    return () => {
      cancelAnimationFrame(layoutFrame);
      cancelAnimationFrame(reflowFrame);
      root.removeEventListener("input", onInput, true);
      root.removeEventListener("keydown", onKeyDown, true);
      root.removeEventListener("beforeinput", onBeforeInput, true);
    };
  }, [paginateEditor]);

  const handlePaperStageWheel = useCallback(
    (event: ReactWheelEvent<HTMLDivElement>) => {
      if (event.deltaY === 0 || event.shiftKey) return;
      const stage = event.currentTarget;
      const maxScrollTop = stage.scrollHeight - stage.clientHeight;
      if (maxScrollTop <= 0) return;
      const nextScrollTop = Math.min(
        maxScrollTop,
        Math.max(0, stage.scrollTop + event.deltaY),
      );
      if (nextScrollTop === stage.scrollTop) return;
      event.preventDefault();
      stage.scrollTop = nextScrollTop;
    },
    [],
  );

  const serializeRegion = (region: HTMLElement | null) => {
    if (!region) return "";
    if (region === editor.current) {
      const holder = document.createElement("div");
      region
        .querySelectorAll<HTMLElement>(
          ":scope > .editor-a4-page > .editor-a4-page-body",
        )
        .forEach((body) => {
          Array.from(body.childNodes).forEach((node) =>
            holder.appendChild(node.cloneNode(true)),
          );
        });
      region = holder;
    }
    const clone = region.cloneNode(true) as HTMLElement;
    clone
      .querySelectorAll("[data-editor-page-break]")
      .forEach((node) => node.remove());
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
      category,
      emailSubject: emailSubject.trim(),

      content: serializeRegion(editor.current),

      headerContent: serializeRegion(headerEditor.current),

      footerContent: serializeRegion(footerEditor.current),

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

  const selectedDataTableElement =
    selectedTableCell?.closest<HTMLElement>("[data-data-table-name]") ?? null;
  const selectedDataTableDefinition = selectedDataTableElement
    ? variables.find(
        (item) =>
          item.type === "dataTable" &&
          item.name === selectedDataTableElement.dataset.dataTableName,
      )
    : undefined;

  const pending = create.isPending || update.isPending;

  useEffect(() => {
    publishMobileEditorNav({
      active: true,
      kind: "template",
      name: name.trim() || t("templateName"),
      pending,
    });

    const handleSave = () => {
      if (!pending) void save();
    };
    const handleBack = () => void closeEditor();
    const handleEditMeta = () => openMetadataEditor();

    window.addEventListener(MOBILE_EDITOR_NAV_SAVE, handleSave);
    window.addEventListener(MOBILE_EDITOR_NAV_BACK, handleBack);
    window.addEventListener(MOBILE_EDITOR_NAV_EDIT_META, handleEditMeta);
    return () => {
      window.removeEventListener(MOBILE_EDITOR_NAV_SAVE, handleSave);
      window.removeEventListener(MOBILE_EDITOR_NAV_BACK, handleBack);
      window.removeEventListener(MOBILE_EDITOR_NAV_EDIT_META, handleEditMeta);
      publishMobileEditorNav({ active: false });
    };
  }, [name, pending, save, closeEditor, t]);

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

                    <CategoryField value={category} onChange={setCategory} />

                    <label className="field">
                      <span>{t("emailSubject")}</span>
                      <InputControl
                        maxLength={250}
                        value={emailSubject}
                        onChange={(event) =>
                          setEmailSubject(event.target.value)
                        }
                        placeholder={`${t("emailSubjectPlaceholder")} {{variable}}`}
                      />
                      <small>
                        {t("emailSubjectHelp")} {"{{variable}}"}
                      </small>
                    </label>

                    <div className="editor-header-meta-actions">
                      <button
                        type="button"
                        className="btn ghost compact editor-header-meta-cancel"
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

                  <CategoryField value={category} onChange={setCategory} />

                  <label className="field">
                    <span>{t("emailSubject")}</span>
                    <InputControl
                      maxLength={250}
                      value={emailSubject}
                      onChange={(event) => setEmailSubject(event.target.value)}
                      placeholder={`${t("emailSubjectPlaceholder")} {{variable}}`}
                    />
                    <small>
                      {t("emailSubjectHelp")} {"{{variable}}"}
                    </small>
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
            setFontFamily={setFontFamily}
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
            canDuplicate={Boolean(
              (selectedVariableElement &&
                variables.some(
                  (item) =>
                    item.name === selectedVariableElement.dataset.variableName,
                )) ||
              (selectedDataTableElement && selectedDataTableDefinition),
            )}
            duplicateSelected={() => {
              if (selectedVariableElement) {
                const variable = variables.find(
                  (item) =>
                    item.name === selectedVariableElement.dataset.variableName,
                );
                if (variable)
                  duplicatePlacedVariable(variable, selectedVariableElement);
                return;
              }
              if (selectedDataTableElement && selectedDataTableDefinition) {
                duplicatePlacedVariable(
                  selectedDataTableDefinition,
                  selectedDataTableElement,
                );
              }
            }}
            state={toolbarState}
          />

          {selectedTableCell &&
            (() => {
              const dataTableElement = selectedDataTableElement;
              const dataTableDefinition = selectedDataTableDefinition;
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
                        <Pencil size={15} /> {t("editTable")}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (dataTableElement) {
                            duplicatePlacedVariable(
                              dataTableDefinition,
                              dataTableElement,
                            );
                          }
                        }}
                      >
                        <CopyPlus size={15} /> {t("duplicateTable")}
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
                const region = activeEditor.current ?? editor.current;
                if (region) ensureDataTableCaretHosts(region);
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
            duplicateVariable={duplicateVariableDefinition}
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

          <div
            className="editor-view-controls"
            onPointerDownCapture={rememberSelection}
          >
            <DocumentOptions
              t={t}
              pageNumbers={pageNumbers}
              setPageNumbers={(value) => {
                // Do not call paginateEditor from this render: that callback still
                // closes over the previous pageNumbers value. The effect below
                // runs after React commits the new value.
                setPageNumbers(value);
                restoreSelection();
                setDirty(true);
              }}
            />
            <ZoomBar t={t} zoom={zoom} setZoom={setZoom} />
          </div>
        </div>

        <div className="paper-stage" onWheelCapture={handlePaperStageWheel}>
          <div
            className="paper-zoom"
            style={
              {
                "--editor-zoom": zoom / 100,
                "--scaled-a4-width": `${A4_WIDTH_PX * (zoom / 100)}px`,
                "--scaled-a4-height": `${Math.round(A4_WIDTH_PX * (297 / 210) * (zoom / 100))}px`,
                "--scaled-document-height": `${Math.round((A4_WIDTH_PX * (297 / 210) * editorPageCount + (12 / 25.4) * 96 * Math.max(0, editorPageCount - 1) + (16 / 25.4) * 96) * (zoom / 100))}px`,
                "--editor-page-count": editorPageCount,
              } as CSSProperties
            }
          >
            <div
              className="a4-page-shell"
              data-page-count={editorPageCount}
              data-header-enabled="true"
              data-footer-enabled="true"
            >
              <div
                ref={editor}
                className="a4-paper editor-page-stack"
                contentEditable={false}
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
                onFocus={(event) => {
                  const target = event.target as HTMLElement;
                  activeEditor.current =
                    target.closest<HTMLDivElement>(".editor-a4-page-header") ??
                    target.closest<HTMLDivElement>(".editor-a4-page-footer") ??
                    target.closest<HTMLDivElement>(".editor-a4-page-body") ??
                    editor.current;
                }}
                onKeyUp={rememberSelection}
                onMouseUp={rememberSelection}
                onKeyDown={(event) => {
                  if (!(event.ctrlKey || event.metaKey) || event.altKey) return;
                  const key = event.key.toLowerCase();
                  if (key !== "z" && key !== "y") return;
                  const region = (
                    event.target as HTMLElement
                  ).closest<HTMLDivElement>(
                    ".editor-a4-page-header, .editor-a4-page-footer",
                  );
                  if (!region) return;
                  event.preventDefault();
                  activeEditor.current = region;
                  cmd(key === "y" || event.shiftKey ? "redo" : "undo");
                }}
                onInput={(event) => {
                  if (formattingTransaction.current) return;
                  const region = (
                    event.target as HTMLElement
                  ).closest<HTMLDivElement>(
                    ".editor-a4-page-header, .editor-a4-page-footer",
                  );
                  if (region) commitActiveBoundedRegion(region);
                  setDirty(true);
                }}
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

              {/* Persistent shared-region sources. Physical A4 header/footer nodes are
                  disposable pagination views; toolbar controls may temporarily move
                  focus away from them. Keep the canonical HTML outside the page stack
                  so a pagination pass cannot replace a styled header with an empty
                  value while a Select owns focus. */}
              <div
                ref={headerEditor}
                className="editor-header-source"
                contentEditable={false}
                aria-hidden="true"
              />

              <div
                ref={footerEditor}
                className="editor-footer-source"
                contentEditable={false}
                aria-hidden="true"
              />
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

              const actionsWidth = 98;
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
                    className="selected-variable-duplicate"
                    aria-label={t("duplicateVariable")}
                    title={t("duplicateVariable")}
                    onClick={() =>
                      duplicatePlacedVariable(variable, selectedVariableElement)
                    }
                  >
                    <CopyPlus size={14} />
                  </button>
                  <button
                    type="button"
                    className="selected-variable-delete"
                    aria-label={t("removeVariable")}
                    title={t("removeVariable")}
                    onClick={() => {
                      setVariableRemoval({
                        element: selectedVariableElement,
                        variable,
                      });
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
            onDuplicateVariable={duplicateVariableDefinition}
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
                  const nextVariables = upsertVariable(
                    variables,
                    table,
                    previousName ?? table.name,
                  );
                  holder.innerHTML = dataTableHtml(table, nextVariables);
                  const replacement = holder.querySelector<HTMLElement>(
                    ".docflow-data-table",
                  );
                  if (replacement) {
                    existing.replaceWith(replacement);
                    if (region) ensureDataTableCaretHosts(region);
                  }
                }
              } else {
                restoreSelection();
                document.execCommand(
                  "insertHTML",
                  false,
                  dataTableHtml(table, variables),
                );
                const region = activeEditor.current ?? editor.current;
                if (region) ensureDataTableCaretHosts(region);
              }
              setDirty(true);
              setDataTableOpen(false);
              setEditingDataTable(undefined);
              rememberSelection();
            }}
          />
        )}

        {variableRemoval && (
          <div className="dialog-backdrop">
            <section
              className="dialog variable-removal-dialog"
              role="alertdialog"
              aria-modal="true"
              aria-labelledby="remove-workspace-variable-title"
            >
              <div className="variable-removal-dialog-header">
                <div>
                  <h3 id="remove-workspace-variable-title">
                    {t("removeVariableDialogTitle")}
                  </h3>
                  <p>
                    {t("removeVariableDialogMessage", {
                      variable:
                        variableRemoval.variable.label ||
                        variableRemoval.variable.name,
                    })}
                  </p>
                </div>
                <button
                  type="button"
                  className="variable-removal-dialog-close"
                  onClick={() => setVariableRemoval(null)}
                  aria-label={t("cancel")}
                  title={t("cancel")}
                >
                  <X size={20} />
                </button>
              </div>

              <div className="variable-removal-options">
                <button
                  type="button"
                  className="variable-removal-option"
                  onClick={() => {
                    const wrapper =
                      variableRemoval.element.closest<HTMLElement>(
                        "[data-variable-editor-wrapper]",
                      );
                    (wrapper ?? variableRemoval.element).remove();
                    setVariableRemoval(null);
                    setSelectedVariableElement(null);
                    setSelectedVariableBox(null);
                    setDirty(true);
                  }}
                >
                  <Trash2 size={20} />
                  <span>
                    <strong>{t("removeVariableFromHere")}</strong>
                    <small>{t("removeVariableFromHereDescription")}</small>
                  </span>
                </button>

                <button
                  type="button"
                  className="variable-removal-option variable-removal-option-danger"
                  onClick={() => {
                    const variableName = variableRemoval.variable.name;
                    [
                      editor.current,
                      headerEditor.current,
                      footerEditor.current,
                    ].forEach((region) => {
                      region
                        ?.querySelectorAll<HTMLElement>(
                          `[data-variable-name="${CSS.escape(variableName)}"]`,
                        )
                        .forEach((node) => {
                          const wrapper = node.closest<HTMLElement>(
                            "[data-variable-editor-wrapper]",
                          );
                          (wrapper ?? node).remove();
                        });
                    });
                    setVariables((current) =>
                      current.filter((item) => item.name !== variableName),
                    );
                    setVariableRemoval(null);
                    setSelectedVariableElement(null);
                    setSelectedVariableBox(null);
                    setDirty(true);
                  }}
                >
                  <Trash2 size={20} />
                  <span>
                    <strong>{t("removeVariableFromTemplate")}</strong>
                    <small>{t("removeVariableFromTemplateDescription")}</small>
                  </span>
                </button>
              </div>

              <div className="variable-removal-dialog-footer">
                <button
                  type="button"
                  className="btn secondary"
                  onClick={() => setVariableRemoval(null)}
                >
                  {t("cancel")}
                </button>
              </div>
            </section>
          </div>
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
