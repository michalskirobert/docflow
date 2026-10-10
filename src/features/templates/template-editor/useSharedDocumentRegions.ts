import { useRef, type RefObject } from "react";

type RegionKind = "header" | "footer";
type Boundary = { path: number[]; offset: number };
type Bookmark = { start: Boundary; end: Boundary };
type Entry = { html: string; selection: Bookmark | null };
type History = { entries: Entry[]; index: number };

function regionHtml(region: HTMLElement) {
  const clone = region.cloneNode(true) as HTMLElement;
  clone
    .querySelectorAll("[data-selected], [data-variable-selected]")
    .forEach((node) => {
      node.removeAttribute("data-selected");
      node.removeAttribute("data-variable-selected");
    });
  return clone.innerHTML;
}

const kindOf = (region: HTMLElement): RegionKind | null =>
  region.classList.contains("editor-a4-page-header")
    ? "header"
    : region.classList.contains("editor-a4-page-footer")
      ? "footer"
      : null;

function bookmark(region: HTMLElement): Bookmark | null {
  const selection = window.getSelection();
  if (!selection?.rangeCount) return null;
  const range = selection.getRangeAt(0);
  if (
    !region.contains(range.startContainer) ||
    !region.contains(range.endContainer)
  )
    return null;
  const boundary = (node: Node, offset: number): Boundary => {
    const path: number[] = [];
    while (node !== region && node.parentNode) {
      path.unshift(
        Array.from(node.parentNode.childNodes).indexOf(node as ChildNode),
      );
      node = node.parentNode;
    }
    return { path, offset };
  };
  return {
    start: boundary(range.startContainer, range.startOffset),
    end: boundary(range.endContainer, range.endOffset),
  };
}

function restore(region: HTMLElement, saved: Bookmark | null) {
  const range = document.createRange();
  const resolve = ({ path, offset }: Boundary): [Node, number] => {
    let node: Node = region;
    for (const index of path) {
      const child = node.childNodes[index];
      if (!child) break;
      node = child;
    }
    return [
      node,
      Math.min(
        offset,
        node.nodeType === Node.TEXT_NODE
          ? (node.textContent?.length ?? 0)
          : node.childNodes.length,
      ),
    ];
  };
  if (saved) {
    range.setStart(...resolve(saved.start));
    range.setEnd(...resolve(saved.end));
  } else {
    range.selectNodeContents(region);
    range.collapse(false);
  }
  region.focus({ preventScroll: true });
  const selection = window.getSelection();
  selection?.removeAllRanges();
  selection?.addRange(range);
}

export function useSharedDocumentRegions(
  editor: RefObject<HTMLDivElement | null>,
  header: RefObject<HTMLDivElement | null>,
  footer: RefObject<HTMLDivElement | null>,
) {
  const history = useRef<Record<RegionKind, History>>({
    header: { entries: [], index: -1 },
    footer: { entries: [], index: -1 },
  });

  const reset = () => {
    for (const kind of ["header", "footer"] as const) {
      const source = kind === "header" ? header.current : footer.current;
      history.current[kind] = {
        entries: [{ html: source?.innerHTML ?? "", selection: null }],
        index: 0,
      };
    }
  };

  const mirror = (region: HTMLDivElement, kind: RegionKind) => {
    const html = regionHtml(region);
    const source = kind === "header" ? header.current : footer.current;
    if (source && source !== region && source.innerHTML !== html)
      source.innerHTML = html;
    editor.current
      ?.querySelectorAll<HTMLDivElement>(`.editor-a4-page-${kind}`)
      .forEach((other) => {
        if (other !== region && other.innerHTML !== html)
          other.innerHTML = html;
      });
  };

  const commit = (region: HTMLDivElement) => {
    const kind = kindOf(region);
    if (!kind) return;
    const state = history.current[kind];
    const entry = { html: regionHtml(region), selection: bookmark(region) };
    if (state.entries[state.index]?.html !== entry.html) {
      state.entries.splice(state.index + 1);
      state.entries.push(entry);
      let characters = state.entries.reduce(
        (total, item) => total + item.html.length,
        0,
      );
      while (
        state.entries.length > 2 &&
        (state.entries.length > 100 || characters > 8 * 1024 * 1024)
      ) {
        characters -= state.entries.shift()!.html.length;
      }
      state.index = state.entries.length - 1;
    } else {
      state.entries[state.index] = entry;
    }
    mirror(region, kind);
  };

  const navigate = (region: HTMLDivElement, direction: -1 | 1) => {
    const kind = kindOf(region);
    if (!kind) return false;
    const state = history.current[kind];
    const index = state.index + direction;
    const entry = state.entries[index];
    if (!entry) return true;
    state.index = index;
    region.innerHTML = entry.html;
    mirror(region, kind);
    restore(region, entry.selection);
    return true;
  };

  const restoreCurrentSelection = (region: HTMLDivElement) => {
    const kind = kindOf(region);
    if (!kind) return;
    const state = history.current[kind];
    restore(region, state.entries[state.index]?.selection ?? null);
  };

  return { reset, commit, navigate, restoreCurrentSelection };
}
