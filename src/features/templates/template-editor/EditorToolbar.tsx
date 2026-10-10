import { useState } from "react";
import { SelectControl } from "@/components/shared/form";
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  CopyPlus,
  ImagePlus,
  Italic,
  Link2,
  List,
  ListOrdered,
  MoveHorizontal,
  Redo2,
  Table2,
  Underline,
  Undo2,
  Variable,
} from "lucide-react";
import {
  FONT_SIZES_PX,
  TEMPLATE_EDITOR_FONT_FAMILIES,
} from "@/utils/constants";
export type ToolbarState = {
  bold: boolean;
  italic: boolean;
  underline: boolean;
  justifyLeft: boolean;
  justifyCenter: boolean;
  justifyRight: boolean;
  justifyFull: boolean;
  justifyBetween: boolean;
  unorderedList: boolean;
  orderedList: boolean;
  block: string;
  fontSize: string;
  fontFamily: string;
  lineHeight: string;
};
type Props = {
  t: (key: string) => string;
  cmd: (command: string, value?: string) => void;
  setPx: (px: string) => void;
  setFontFamily: (value: string) => void;
  setLineHeight: (value: string) => void;
  insertTable: () => void;
  rememberSelection: () => void;
  openImage: () => void;
  openLink: () => void;
  openVariable: () => void;
  openDataTable: () => void;
  duplicateSelected: () => void;
  canDuplicate: boolean;
  state: ToolbarState;
};
export function EditorToolbar({
  t,
  cmd,
  setPx,
  setFontFamily,
  setLineHeight,
  insertTable,
  rememberSelection,
  openImage,
  openLink,
  openVariable,
  openDataTable,
  duplicateSelected,
  canDuplicate,
  state,
}: Props) {
  const [tableMenuOpen, setTableMenuOpen] = useState(false);
  const b = (active: boolean) => (active ? "active" : undefined);
  return (
    <div className="editor-toolbar">
      <button
        onMouseDown={rememberSelection}
        onClick={() => cmd("undo")}
        title={t("undo")}
      >
        <Undo2 />
      </button>
      <button
        onMouseDown={rememberSelection}
        onClick={() => cmd("redo")}
        title={t("redo")}
      >
        <Redo2 />
      </button>
      <span />
      <SelectControl
        restoreTriggerFocus={false}
        className="editor-select editor-select-block"
        onPointerDown={rememberSelection}
        onTouchStart={rememberSelection}
        onChange={(e) => cmd("formatBlock", e.target.value)}
        value={state.block}
        aria-label={t("paragraphStyle")}
      >
        <option value="p">{t("paragraph")}</option>
        <option value="h1">{t("heading1")}</option>
        <option value="h2">{t("heading2")}</option>
        <option value="h3">{t("heading3")}</option>
        <option value="h4">{t("heading4")}</option>
        <option value="h5">{t("subtitle")}</option>
        <option value="blockquote">{t("quote")}</option>
      </SelectControl>
      <SelectControl
        restoreTriggerFocus={false}
        className="editor-select editor-select-font"
        value={state.fontFamily}
        onPointerDown={rememberSelection}
        onTouchStart={rememberSelection}
        onChange={(e) => setFontFamily(e.target.value)}
        aria-label={t("fontFamily")}
        title={t("fontFamily")}
      >
        <option value="">{t("fontFamily")}</option>
        {TEMPLATE_EDITOR_FONT_FAMILIES.map((font) => (
          <option key={font.value} value={font.value}>
            {font.label}
          </option>
        ))}
      </SelectControl>
      <SelectControl
        restoreTriggerFocus={false}
        className="editor-select editor-select-size"
        value={state.fontSize}
        onPointerDown={rememberSelection}
        onTouchStart={rememberSelection}
        onChange={(e) => setPx(e.target.value)}
        aria-label={t("fontSize")}
      >
        <option value="">{t("size")}</option>
        {FONT_SIZES_PX.map((size) => (
          <option key={size} value={size}>
            {size}px
          </option>
        ))}
      </SelectControl>
      <SelectControl
        restoreTriggerFocus={false}
        className="editor-select editor-select-line-height"
        value={state.lineHeight}
        onPointerDown={rememberSelection}
        onTouchStart={rememberSelection}
        onChange={(e) => setLineHeight(e.target.value)}
        aria-label={t("lineHeight")}
        title={t("lineHeight")}
      >
        <option value="">{t("lineHeight")}</option>
        {["1", "1.15", "1.25", "1.5", "1.75", "2"].map((value) => (
          <option key={value} value={value}>
            {value}
          </option>
        ))}
      </SelectControl>
      <button
        className={b(state.bold)}
        aria-pressed={state.bold}
        onMouseDown={rememberSelection}
        onClick={() => cmd("bold")}
        title={t("bold")}
      >
        <Bold strokeWidth={3} />
      </button>
      <button
        className={b(state.italic)}
        aria-pressed={state.italic}
        onMouseDown={rememberSelection}
        onClick={() => cmd("italic")}
        title={t("italic")}
      >
        <Italic />
      </button>
      <button
        className={b(state.underline)}
        aria-pressed={state.underline}
        onMouseDown={rememberSelection}
        onClick={() => cmd("underline")}
        title={t("underline")}
      >
        <Underline />
      </button>
      <label className="editor-color-control" title={t("textColor")}>
        <input
          type="color"
          defaultValue="#111827"
          aria-label={t("textColor")}
          onPointerDown={rememberSelection}
          onTouchStart={rememberSelection}
          onChange={(e) => cmd("foreColor", e.target.value)}
        />
      </label>
      <span />
      <button
        className={b(state.justifyLeft)}
        aria-pressed={state.justifyLeft}
        onMouseDown={rememberSelection}
        onClick={() => cmd("justifyLeft")}
        title={t("alignLeft")}
      >
        <AlignLeft />
      </button>
      <button
        className={b(state.justifyCenter)}
        aria-pressed={state.justifyCenter}
        onMouseDown={rememberSelection}
        onClick={() => cmd("justifyCenter")}
        title={t("alignCenter")}
      >
        <AlignCenter />
      </button>
      <button
        className={b(state.justifyRight)}
        aria-pressed={state.justifyRight}
        onMouseDown={rememberSelection}
        onClick={() => cmd("justifyRight")}
        title={t("alignRight")}
      >
        <AlignRight />
      </button>
      <button
        className={b(state.justifyFull)}
        aria-pressed={state.justifyFull}
        onMouseDown={rememberSelection}
        onClick={() => cmd("justifyFull")}
        title={t("justify")}
      >
        <AlignJustify />
      </button>
      <button
        className={b(state.justifyBetween)}
        aria-pressed={state.justifyBetween}
        onMouseDown={rememberSelection}
        onClick={() => cmd("justifyBetween")}
        title={t("alignBetween")}
      >
        <MoveHorizontal />
      </button>
      <span />
      <button
        className={b(state.unorderedList)}
        aria-pressed={state.unorderedList}
        onMouseDown={rememberSelection}
        onClick={() => cmd("insertUnorderedList")}
        title={t("bulletList")}
      >
        <List />
      </button>
      <button
        className={b(state.orderedList)}
        aria-pressed={state.orderedList}
        onMouseDown={rememberSelection}
        onClick={() => cmd("insertOrderedList")}
        title={t("numberedList")}
      >
        <ListOrdered />
      </button>
      <div className="toolbar-table-menu">
        <button
          className={tableMenuOpen ? "active" : undefined}
          onMouseDown={rememberSelection}
          onClick={() => setTableMenuOpen((current) => !current)}
          title={t("table")}
          aria-haspopup="menu"
          aria-expanded={tableMenuOpen}
        >
          <Table2 />
        </button>
        {tableMenuOpen && (
          <div className="toolbar-popover toolbar-table-popover" role="menu">
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setTableMenuOpen(false);
                insertTable();
              }}
            >
              <Table2 />
              <span>
                <strong>{t("table")}</strong>
                <small>Static layout table</small>
              </span>
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setTableMenuOpen(false);
                openDataTable();
              }}
            >
              <Table2 />
              <span>
                <strong>Data table</strong>
                <small>Repeatable rows with DocFlow variables</small>
              </span>
            </button>
          </div>
        )}
      </div>
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
      <button
        type="button"
        className="duplicate-btn"
        onMouseDown={rememberSelection}
        onClick={duplicateSelected}
        disabled={!canDuplicate}
        aria-label={t("duplicateVariable")}
        title={t("duplicateVariable")}
      >
        <CopyPlus />
      </button>
    </div>
  );
}
