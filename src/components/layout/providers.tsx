"use client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { type ReactNode, useState } from "react";
import { FeedbackProvider } from "@/components/ui/feedback-provider";
import { ThemeProvider } from "@/components/layout/theme-provider";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Analytics } from "@vercel/analytics/next";

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: false },
          mutations: { retry: false },
        },
      }),
  );
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <FeedbackProvider>{children}</FeedbackProvider>
      </ThemeProvider>
      <SpeedInsights />
      <Analytics />
    </QueryClientProvider>
  );
}
