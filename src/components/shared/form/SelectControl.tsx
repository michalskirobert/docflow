"use client";

import {
  Children,
  forwardRef,
  isValidElement,
  useEffect,
  useId,
  useRef,
  useState,
  type ChangeEvent,
  type KeyboardEvent,
  type ReactElement,
  type ReactNode,
  type SelectHTMLAttributes,
} from "react";
import { Check, ChevronDown } from "lucide-react";

type Option = {
  value: string;
  label: string;
  disabled?: boolean;
};

export const SelectControl = forwardRef<
  HTMLSelectElement,
  SelectHTMLAttributes<HTMLSelectElement>
>(function SelectControl(
  {
    className,
    children,
    value,
    defaultValue,
    onChange,
    onBlur,
    disabled,
    id,
    name,
    ...props
  },
  forwardedRef,
) {
  const generatedId = useId();
  const selectId = id ?? generatedId;
  const rootRef = useRef<HTMLDivElement>(null);
  const nativeRef = useRef<HTMLSelectElement | null>(null);

  const [open, setOpen] = useState(false);
  const [uncontrolledValue, setUncontrolledValue] = useState(
    String(defaultValue ?? ""),
  );

  const options: Option[] = [];

  const collectOptions = (nodes: ReactNode) => {
    Children.forEach(nodes, (child) => {
      if (!isValidElement(child)) return;

      if (child.type === "option") {
        const option = child as ReactElement<{
          value?: string | number;
          disabled?: boolean;
          children?: ReactNode;
        }>;

        options.push({
          value: String(option.props.value ?? ""),
          label: Children.toArray(option.props.children).join(""),
          disabled: option.props.disabled,
        });
        return;
      }

      const nested = child as ReactElement<{ children?: ReactNode }>;
      if (nested.props.children !== undefined) {
        collectOptions(nested.props.children);
      }
    });
  };

  collectOptions(children);

  const currentValue = String(value ?? uncontrolledValue ?? "");

  const current =
    options.find((option) => option.value === currentValue) ?? options[0];

  useEffect(() => {
    if (!open) return;

    const close = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener("pointerdown", close);

    return () => {
      document.removeEventListener("pointerdown", close);
    };
  }, [open]);

  const assignRef = (node: HTMLSelectElement | null) => {
    nativeRef.current = node;

    if (typeof forwardedRef === "function") {
      forwardedRef(node);
    } else if (forwardedRef) {
      forwardedRef.current = node;
    }
  };

  const choose = (nextValue: string) => {
    const node = nativeRef.current;

    if (!node) return;

    node.value = nextValue;

    if (value === undefined) {
      setUncontrolledValue(nextValue);
    }

    onChange?.({
      target: node,
      currentTarget: node,
    } as ChangeEvent<HTMLSelectElement>);

    setOpen(false);

    requestAnimationFrame(() => {
      rootRef.current
        ?.querySelector<HTMLButtonElement>(".shared-select-trigger")
        ?.focus();
    });
  };

  const onTriggerKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (["ArrowDown", "ArrowUp", "Enter", " "].includes(event.key)) {
      event.preventDefault();
      setOpen(true);
    }

    if (event.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <div
      ref={rootRef}
      className={`shared-select${open ? " is-open" : ""}${
        disabled ? " is-disabled" : ""
      }${className ? ` ${className}` : ""}`}
    >
      <select
        {...props}
        ref={assignRef}
        id={selectId}
        name={name}
        value={currentValue}
        disabled={disabled}
        onChange={onChange}
        onBlur={onBlur}
        className="shared-select-native"
        tabIndex={-1}
        aria-hidden="true"
      >
        {children}
      </select>

      <button
        type="button"
        className="shared-select-trigger"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={`${selectId}-options`}
        aria-label={props["aria-label"]}
        onPointerDown={props.onPointerDown as never}
        onMouseDown={props.onMouseDown as never}
        onClick={() => setOpen((state) => !state)}
        onKeyDown={onTriggerKeyDown}
        onBlur={(event) => {
          if (!rootRef.current?.contains(event.relatedTarget as Node)) {
            onBlur?.({
              target: nativeRef.current!,
              currentTarget: nativeRef.current!,
            } as never);
          }
        }}
      >
        <span>{current?.label ?? ""}</span>

        <ChevronDown
          size={17}
          className="shared-select-chevron"
          aria-hidden="true"
        />
      </button>

      {open && !disabled && (
        <div
          id={`${selectId}-options`}
          className="shared-select-options"
          role="listbox"
        >
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              role="option"
              aria-selected={option.value === currentValue}
              className={option.value === currentValue ? "selected" : undefined}
              disabled={option.disabled}
              onClick={() => choose(option.value)}
            >
              <span>{option.label}</span>

              {option.value === currentValue && (
                <Check size={16} aria-hidden="true" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
});
