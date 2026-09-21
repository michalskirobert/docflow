import { forwardRef, type InputHTMLAttributes, type ReactNode } from "react";
import { InputControl } from "./InputControl";

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
  type: "checkbox" | "radio";
  label?: ReactNode;
  description?: ReactNode;
  className?: string;
};

export const ChoiceField = forwardRef<HTMLInputElement, Props>(
  function ChoiceField({ type, label, description, className, ...props }, ref) {
    return (
      <label className={`choice-field${className ? ` ${className}` : ""}`}>
        <InputControl ref={ref} type={type} {...props} />
        <span className="choice-indicator" aria-hidden="true" />
        {(label || description) && (
          <span className="choice-copy">
            {label && <strong>{label}</strong>}
            {description && <small>{description}</small>}
          </span>
        )}
      </label>
    );
  },
);
