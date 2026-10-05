import type { ButtonHTMLAttributes, ReactNode } from "react";

type InputActionProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  label: string;
  children: ReactNode;
};

export function InputAction({ label, children, className, ...props }: InputActionProps) {
  return (
    <button {...props} type="button" className={`field-input-action${className ? ` ${className}` : ""}`} aria-label={label} title={label}>
      {children}
    </button>
  );
}

export function InputActions({ children }: { children: ReactNode }) {
  return <span className="field-input-actions">{children}</span>;
}
