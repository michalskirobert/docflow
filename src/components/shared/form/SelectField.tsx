import type { SelectHTMLAttributes } from "react";
import type { ReactNode } from "react";
import { SelectControl } from "./SelectControl";

type Props = SelectHTMLAttributes<HTMLSelectElement> & {
  label: string;
  error?: string;
  requiredMark?: boolean;
  children: ReactNode;
};
export function SelectField({
  label,
  error,
  requiredMark = false,
  children,
  className,
  ...props
}: Props) {
  const errorId = `${props.name ?? props.id ?? "select"}-error`;
  return (
    <label
      className={`field${error ? " field-error" : ""}${className ? ` ${className}` : ""}`}
    >
      <span className="field-label">
        {label}
        {requiredMark && (
          <span className="required-mark" aria-hidden="true">
            {" "}
            *
          </span>
        )}
      </span>
      <SelectControl
        {...props}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : undefined}
      >
        {children}
      </SelectControl>
      {error && (
        <span id={errorId} className="field-error-message" role="alert">
          {error}
        </span>
      )}
    </label>
  );
}
