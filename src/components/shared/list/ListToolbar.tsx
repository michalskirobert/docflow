"use client";

import { Filter, Search, SlidersHorizontal, X } from "lucide-react";
import { InputControl, SelectControl } from "@/components/shared/form";
import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";

type SortOption = { value: string; label: string };

type Props = {
  search: string;
  searchPlaceholder: string;
  onSearchChange: (value: string) => void;
  sort: string;
  sortLabel: string;
  sortOptions: SortOption[];
  onSortChange: (value: string) => void;
  filterLabel: string;
  closeLabel: string;
  clearLabel: string;
  applyLabel: string;
  activeFilterCount?: number;
  filters?: ReactNode;
  chips?: ReactNode;
  onClearFilters?: () => void;
  action?: ReactNode;
};

export function ListToolbar({
  search,
  searchPlaceholder,
  onSearchChange,
  sort,
  sortLabel,
  sortOptions,
  onSortChange,
  filterLabel,
  closeLabel,
  clearLabel,
  applyLabel,
  activeFilterCount = 0,
  filters,
  chips,
  onClearFilters,
  action,
}: Props) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const close = (event: PointerEvent) => {
      if (root.current && !root.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, []);

  return (
    <div className="list-toolbar-shell" ref={root}>
      <div className="list-toolbar">
        <label className="search-field list-toolbar-search">
          <Search size={16} />
          <InputControl value={search} onChange={(e) => onSearchChange(e.target.value)} placeholder={searchPlaceholder} />
        </label>
        <SelectControl value={sort} onChange={(e) => onSortChange(e.target.value)} aria-label={sortLabel}>
          {sortOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </SelectControl>
        {filters && (
          <button type="button" className={`btn secondary list-filter-trigger${open ? " active" : ""}`} onClick={() => setOpen((value) => !value)} aria-expanded={open}>
            <SlidersHorizontal size={17} /> {filterLabel}
            {activeFilterCount > 0 && <span className="filter-count">{activeFilterCount}</span>}
          </button>
        )}
        {action}
      </div>
      {chips && <div className="active-filter-chips">{chips}</div>}
      {open && filters && (
        <div className="list-filter-panel" role="dialog" aria-label={filterLabel}>
          <div className="list-filter-panel-heading">
            <span><Filter size={17} /> {filterLabel}</span>
            <button type="button" className="icon-button" aria-label={closeLabel} onClick={() => setOpen(false)}><X size={18} /></button>
          </div>
          <div className="list-filter-panel-body">{filters}</div>
          <div className="list-filter-panel-actions">
            <button type="button" className="btn secondary" onClick={onClearFilters} disabled={!activeFilterCount}>{clearLabel}</button>
            <button type="button" className="btn" onClick={() => setOpen(false)}>{applyLabel}</button>
          </div>
        </div>
      )}
    </div>
  );
}
