import { forwardRef, type InputHTMLAttributes } from "react";

export const InputControl = forwardRef<
  HTMLInputElement,
  InputHTMLAttributes<HTMLInputElement>
>(function InputControl({ className, ...props }, ref) {
  return <input ref={ref} className={className} {...props} />;
});
