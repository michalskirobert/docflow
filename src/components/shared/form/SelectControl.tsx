"use client";

import {
  Children,
  forwardRef,
  isValidElement,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ChangeEvent,
  type CSSProperties,
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

type SelectControlProps = SelectHTMLAttributes<HTMLSelectElement> & {
  restoreTriggerFocus?: boolean;
};

export const SelectControl = forwardRef<HTMLSelectElement, SelectControlProps>(
  function SelectControl(
    {
      className,
      restoreTriggerFocus = true,
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
    const [dropUp, setDropUp] = useState(false);
    const [menuHeight, setMenuHeight] = useState(280);
    useLayoutEffect(() => {
      if (!open) return;
      const position = () => {
        const root = rootRef.current;
        if (!root) return;
        const rect = root.getBoundingClientRect();
        const scrollArea = root.closest(".editor-bottom-sheet-content");
        const bounds = scrollArea?.getBoundingClientRect();
        const viewport = window.visualViewport;
        const bottom = Math.min(
          bounds?.bottom ?? Infinity,
          (viewport?.height ?? window.innerHeight) + (viewport?.offsetTop ?? 0),
        );
        const top = Math.max(bounds?.top ?? 0, viewport?.offsetTop ?? 0);
        const desired = window.matchMedia("(max-width: 900px)").matches
          ? 188
          : 280;
        const below = bottom - rect.bottom - 12;
        const above = rect.top - top - 12;
        const up = below < desired && above > below;
        setDropUp(up);
        setMenuHeight(Math.max(44, Math.min(desired, up ? above : below)));
      };
      position();
      window.addEventListener("resize", position);
      window.visualViewport?.addEventListener("resize", position);
      return () => {
        window.removeEventListener("resize", position);
        window.visualViewport?.removeEventListener("resize", position);
      };
    }, [open]);
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

      if (restoreTriggerFocus)
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
        requestAnimationFrame(() => {
          rootRef.current
            ?.querySelector<HTMLButtonElement>(
              '[role="option"][aria-selected="true"]:not(:disabled), [role="option"]:not(:disabled)',
            )
            ?.focus();
        });
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
            className={`shared-select-options${dropUp ? " opens-up" : ""}`}
            style={
              {
                maxHeight: menuHeight,
                "--select-menu-height": `${menuHeight}px`,
              } as CSSProperties
            }
            role="listbox"
            onKeyDown={(event) => {
              const items = Array.from(
                event.currentTarget.querySelectorAll<HTMLButtonElement>(
                  "button:not(:disabled)",
                ),
              );
              const index = items.indexOf(
                document.activeElement as HTMLButtonElement,
              );
              if (["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
                event.preventDefault();
                const next =
                  event.key === "Home"
                    ? 0
                    : event.key === "End"
                      ? items.length - 1
                      : (index +
                          (event.key === "ArrowUp" ? -1 : 1) +
                          items.length) %
                        items.length;
                items[next]?.focus();
              }
              if (event.key === "Escape") {
                event.preventDefault();
                event.stopPropagation();
                setOpen(false);
                rootRef.current
                  ?.querySelector<HTMLButtonElement>(".shared-select-trigger")
                  ?.focus();
              }
            }}
          >
            {options.map((option) => (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={option.value === currentValue}
                className={
                  option.value === currentValue ? "selected" : undefined
                }
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
  },
);
