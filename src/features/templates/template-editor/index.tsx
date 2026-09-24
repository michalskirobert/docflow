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

  const [name, setName] = useState(template?.name ?? "");
  const [description, setDescription] = useState(template?.description ?? "");
  const [emailSubject, setEmailSubject] = useState(
    template?.emailSubject ?? "",
  );
  const [editingName, setEditingName] = useState(false);
  const [mobileMetadataSheet, setMobileMetadataSheet] = useState(false);
  const metadataSnapshot = useRef({
    name: template?.name ?? "",
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

    if (command === "justifyBetween") {
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

  const decorateVariableTokens = useCallback(() => {
    [editor.current, headerEditor.current, footerEditor.current].forEach(
      (region) => {
        region
          ?.querySelectorAll<HTMLElement>('[data-variable-type="value"]')
          .forEach((token) => {
            if (token.querySelector("[data-variable-actions]")) return;
            const actions = document.createElement("span");
            actions.dataset.variableActions = "true";
            actions.className = "inline-variable-actions";
            actions.contentEditable = "false";
            actions.innerHTML = `<button type="button" data-variable-action="edit" aria-label="Edit">✎</button><button type="button" data-variable-action="remove" aria-label="Remove">×</button>`;
            token.appendChild(actions);
          });
      },
    );
  }, []);

  useEffect(() => {
    decorateVariableTokens();
    const observer = new MutationObserver(() => decorateVariableTokens());
    [editor.current, headerEditor.current, footerEditor.current].forEach(
      (region) => {
        if (region)
          observer.observe(region, { childList: true, subtree: true });
      },
    );
    return () => observer.disconnect();
  }, [decorateVariableTokens, variables, headerEnabled, footerEnabled]);

  const handleVariableAction = (target: HTMLElement) => {
    const action = target.closest<HTMLButtonElement>("[data-variable-action]");
    if (!action) return false;
    const token = action.closest<HTMLElement>("[data-variable-name]");
    const variable = variables.find(
      (item) => item.name === token?.dataset.variableName,
    );
    if (!token || !variable) return true;
    if (action.dataset.variableAction === "edit") {
      setEditingVariable(variable);
      setVariableOpen(true);
    } else {
      token.remove();
      setDirty(true);
    }
    return true;
  };

  const selectVariableElement = (target: HTMLElement) => {
    const element = target.closest<HTMLElement>("[data-variable-name]");
    if (!element || element.tagName === "IMG") {
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

  const saveVariableDefinition = (variable: TemplateVariable) => {
    setDirty(true);
    if (!editingVariable) {
      insertVariable(variable);
      return;
    }

    const oldName = editingVariable.name;

    setVariables((current) => upsertVariable(current, variable, oldName));

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
    const variableName = event.dataTransfer.getData("text/docflow-variable");

    const variable = variables.find((item) => item.name === variableName);

    const range = rangeAtPoint(event.clientX, event.clientY);

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
                removePlacedImage(selectedImage);

                setSelectedImage(null);
                setResizeBox(null);
              }}
            />
          )}

          {selectedVariableElement &&
            (() => {
              const variableName = selectedVariableElement.dataset.variableName;
              const variable = variables.find(
                (item) => item.name === variableName,
              );
              if (!variable) return null;
              return (
                <div className="image-context-bar variable-context-bar">
                  <strong>{`{{${variable.name}}}`}</strong>
                  <div className="image-context-actions">
                    <button
                      type="button"
                      className="btn secondary compact"
                      onClick={() => {
                        setEditingVariable(variable);
                        setVariableOpen(true);
                      }}
                    >
                      <Pencil size={16} /> {t("editVariable")}
                    </button>
                    <button
                      type="button"
                      className="btn secondary compact danger"
                      onClick={() => {
                        selectedVariableElement.remove();
                        setSelectedVariableElement(null);
                        setSelectedVariableBox(null);
                        setDirty(true);
                      }}
                    >
                      <Trash2 size={16} /> {t("removeVariable")}
                    </button>
                  </div>
                </div>
              );
            })()}

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
                    if (handleVariableAction(target)) return;
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
                  if (handleVariableAction(target)) return;
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
                    if (handleVariableAction(target)) return;
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

              return (
                <>
                  <button
                    type="button"
                    className="selected-variable-edit"
                    aria-label={t("editVariable")}
                    title={t("editVariable")}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => {
                      setEditingVariable(variable);
                      setVariableOpen(true);
                    }}
                    style={{
                      left: Math.max(8, selectedVariableBox.right - 68),
                      top: Math.max(8, selectedVariableBox.top - 34),
                    }}
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    type="button"
                    className="selected-variable-delete"
                    aria-label={t("removeVariable")}
                    title={t("removeVariable")}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => {
                      selectedVariableElement.remove();
                      setSelectedVariableElement(null);
                      setSelectedVariableBox(null);
                      setDirty(true);
                    }}
                    style={{
                      left: Math.max(42, selectedVariableBox.right - 34),
                      top: Math.max(8, selectedVariableBox.top - 34),
                    }}
                  >
                    <Trash2 size={14} />
                  </button>
                </>
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

        {variableOpen && (
          <VariableModal
            onClose={() => {
              setVariableOpen(false);
              setEditingVariable(undefined);
            }}
            onInsert={saveVariableDefinition}
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
