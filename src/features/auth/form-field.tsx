import type { InputHTMLAttributes, ReactNode } from "react";
import type { FieldError } from "react-hook-form";

type Props = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: FieldError;
  requiredMark?: boolean;
  suffix?: ReactNode;
};

export function FormField({
  label,
  error,
  requiredMark = false,
  suffix,
  className,
  ...inputProps
}: Props) {
  const errorId = `${inputProps.name ?? "field"}-error`;
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
      <div className="field-control">
        <input
          {...inputProps}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : undefined}
        />
        {suffix}
      </div>
      {error && (
        <span id={errorId} className="field-error-message" role="alert">
          {error.message}
        </span>
      )}
    </label>
  );
}
