import { LoaderCircle } from "lucide-react";
import type { ButtonHTMLAttributes, ReactNode } from "react";
type Variant = "primary" | "secondary" | "danger" | "ghost";
type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  loading?: boolean;
  full?: boolean;
  children: ReactNode;
};
export function Button({
  variant = "primary",
  loading = false,
  full = false,
  className,
  disabled,
  children,
  ...props
}: Props) {
  return (
    <button
      {...props}
      disabled={disabled || loading}
      className={`btn${variant === "primary" ? "" : ` ${variant}`}${full ? " full" : ""}${className ? ` ${className}` : ""}`}
    >
      {loading && <LoaderCircle className="spinner" aria-hidden="true" />}
      {children}
    </button>
  );
}
