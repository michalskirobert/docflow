import type { SelectHTMLAttributes } from "react";
import type { ReactNode } from "react";

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
      <select
        {...props}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : undefined}
      >
        {children}
      </select>
      {error && (
        <span id={errorId} className="field-error-message" role="alert">
          {error}
        </span>
      )}
    </label>
  );
}
