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
  Redo2,
  Table2,
  Underline,
  Undo2,
  Variable,
} from "lucide-react";
import { FONT_SIZES_PX } from "@/utils/constants";
export type ToolbarState = {
  bold: boolean;
  italic: boolean;
  underline: boolean;
  justifyLeft: boolean;
  justifyCenter: boolean;
  justifyRight: boolean;
  justifyFull: boolean;
  unorderedList: boolean;
  orderedList: boolean;
};
type Props = {
  t: (key: string) => string;
  cmd: (command: string, value?: string) => void;
  setPx: (px: string) => void;
  insertTable: () => void;
  rememberSelection: () => void;
  openImage: () => void;
  openLink: () => void;
  openVariable: () => void;
  state: ToolbarState;
};
export function EditorToolbar({
  t,
  cmd,
  setPx,
  insertTable,
  rememberSelection,
  openImage,
  openLink,
  openVariable,
  state,
}: Props) {
  const b = (active: boolean) => (active ? "active" : undefined);
  return (
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
        {FONT_SIZES_PX.map((size) => (
          <option key={size} value={size}>
            {size}px
          </option>
        ))}
      </select>
      <button
        className={b(state.bold)}
        aria-pressed={state.bold}
        onClick={() => cmd("bold")}
        title={t("bold")}
      >
        <Bold strokeWidth={3} />
      </button>
      <button
        className={b(state.italic)}
        aria-pressed={state.italic}
        onClick={() => cmd("italic")}
        title={t("italic")}
      >
        <Italic />
      </button>
      <button
        className={b(state.underline)}
        aria-pressed={state.underline}
        onClick={() => cmd("underline")}
        title={t("underline")}
      >
        <Underline />
      </button>
      <span />
      <button
        className={b(state.justifyLeft)}
        aria-pressed={state.justifyLeft}
        onClick={() => cmd("justifyLeft")}
        title={t("alignLeft")}
      >
        <AlignLeft />
      </button>
      <button
        className={b(state.justifyCenter)}
        aria-pressed={state.justifyCenter}
        onClick={() => cmd("justifyCenter")}
        title={t("alignCenter")}
      >
        <AlignCenter />
      </button>
      <button
        className={b(state.justifyRight)}
        aria-pressed={state.justifyRight}
        onClick={() => cmd("justifyRight")}
        title={t("alignRight")}
      >
        <AlignRight />
      </button>
      <button
        className={b(state.justifyFull)}
        aria-pressed={state.justifyFull}
        onClick={() => cmd("justifyFull")}
        title={t("justify")}
      >
        <AlignJustify />
      </button>
      <span />
      <button
        className={b(state.unorderedList)}
        aria-pressed={state.unorderedList}
        onClick={() => cmd("insertUnorderedList")}
        title={t("bulletList")}
      >
        <List />
      </button>
      <button
        className={b(state.orderedList)}
        aria-pressed={state.orderedList}
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
        onClick={openImage}
        title={t("image")}
      >
        <ImagePlus />
      </button>
      <button
        onMouseDown={rememberSelection}
        onClick={openLink}
        title={t("link")}
      >
        <Link2 />
      </button>
      <button
        className="variable-btn"
        onMouseDown={rememberSelection}
        onClick={openVariable}
      >
        <Variable />
        {t("variable")}
      </button>
    </div>
  );
}
