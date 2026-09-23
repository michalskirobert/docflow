import type { HTMLAttributes, ReactNode } from "react";

type Props = HTMLAttributes<HTMLElement> & {
  children: ReactNode;
};

export function Section({ children, className, ...props }: Props) {
  return (
    <section className={`card${className ? ` ${className}` : ""}`} {...props}>
      {children}
    </section>
  );
}
