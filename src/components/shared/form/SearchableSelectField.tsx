"use client";

import { useId, useMemo, useState } from "react";

export type SearchableSelectOption = { value: string; label: string };

type Props = {
  label: string;
  value: string;
  options: SearchableSelectOption[];
  onChange: (value: string) => void;
  error?: string;
  requiredMark?: boolean;
  disabled?: boolean;
  placeholder?: string;
};

export function SearchableSelectField({
  label,
  value,
  options,
  onChange,
  error,
  requiredMark = false,
  disabled,
  placeholder = "Search…",
}: Props) {
  const id = useId();
  const selected = options.find((option) => option.value === value);
  const [query, setQuery] = useState(selected?.label ?? "");
  const [open, setOpen] = useState(false);
  const filtered = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase();
    if (!normalized || query === selected?.label) return options;
    return options.filter((option) =>
      `${option.label} ${option.value}`
        .toLocaleLowerCase()
        .includes(normalized),
    );
  }, [options, query, selected?.label]);
  return (
    <div
      className={`field searchable-select-field${error ? " field-error" : ""}`}
    >
      <label className="field-label" htmlFor={id}>
        {label}
        {requiredMark && (
          <span className="required-mark" aria-hidden="true">
            {" "}
            *
          </span>
        )}
      </label>
      <div className="searchable-select">
        <input
          id={id}
          value={open ? query : (selected?.label ?? query)}
          disabled={disabled}
          placeholder={placeholder}
          autoComplete="off"
          onFocus={() => {
            setQuery(selected?.label ?? "");
            setOpen(true);
          }}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
          }}
          onKeyDown={(event) => {
            if (event.key === "Escape") setOpen(false);
          }}
          onBlur={() =>
            window.setTimeout(() => {
              setOpen(false);
              setQuery(selected?.label ?? "");
            }, 120)
          }
        />
        {open && !disabled && (
          <div className="searchable-select-menu" role="listbox">
            {filtered.map((option) => (
              <button
                type="button"
                role="option"
                aria-selected={option.value === value}
                key={option.value}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => {
                  onChange(option.value);
                  setQuery(option.label);
                  setOpen(false);
                }}
              >
                <span>{option.label}</span>
                <small>{option.value}</small>
              </button>
            ))}
            {!filtered.length && (
              <span className="searchable-select-empty">No results</span>
            )}
          </div>
        )}
      </div>
      {error && (
        <span className="field-error-message" role="alert">
          {error}
        </span>
      )}
    </div>
  );
}
