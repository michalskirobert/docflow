import { forwardRef, type SelectHTMLAttributes } from "react";

export const SelectControl = forwardRef<
  HTMLSelectElement,
  SelectHTMLAttributes<HTMLSelectElement>
>(function SelectControl({ className, onChange, ...props }, ref) {
  return (
    <select
      ref={ref}
      className={className}
      onChange={(event) => {
        onChange?.(event);
        // React releases/clears parts of the synthetic event after this handler.
        // Keep the DOM node itself for the deferred blur instead of reading
        // event.currentTarget inside requestAnimationFrame.
        const select = event.currentTarget;
        requestAnimationFrame(() => select.blur());
      }}
      {...props}
    />
  );
});
