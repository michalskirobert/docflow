import type { ReactNode } from "react";
import { Section } from "@/components/shared/layout";

export function SectionSkeleton({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <Section className={`section-skeleton${className ? ` ${className}` : ""}`}>
      {children}
    </Section>
  );
}
