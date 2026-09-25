import { useState, type InputHTMLAttributes, type ReactNode } from "react";
import { Eye, EyeOff } from "lucide-react";
import type { FieldError } from "react-hook-form";
import { InputControl } from "./InputControl";

type Props = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string | FieldError;
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
  const errorMessage = typeof error === "string" ? error : error?.message;
  const [passwordVisible, setPasswordVisible] = useState(false);
  const isPassword = inputProps.type === "password";
  const errorId = `${inputProps.name ?? inputProps.id ?? "field"}-error`;
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
        <InputControl
          {...inputProps}
          type={isPassword && passwordVisible ? "text" : inputProps.type}
          className={`${inputProps.className ?? ""}${isPassword ? " has-password-toggle" : ""}`.trim()}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : undefined}
        />
        {isPassword && (
          <button
            type="button"
            className="password-visibility-toggle"
            aria-label={passwordVisible ? "Hide password" : "Show password"}
            title={passwordVisible ? "Hide password" : "Show password"}
            onClick={() => setPasswordVisible((visible) => !visible)}
          >
            {passwordVisible ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        )}
        {suffix}
      </div>
      {error && (
        <span id={errorId} className="field-error-message" role="alert">
          {errorMessage}
        </span>
      )}
    </label>
  );
}
