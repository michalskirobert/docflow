"use client";
import { createContext, useContext, type ReactNode } from "react";
import type { SessionUser } from "@/types/auth";
const C = createContext<{ user: SessionUser } | null>(null);
export function AppProvider({
  user,
  children,
}: {
  user: SessionUser;
  children: ReactNode;
}) {
  return <C.Provider value={{ user }}>{children}</C.Provider>;
}
export function useApp() {
  const c = useContext(C);
  if (!c) throw new Error("useApp outside AppProvider");
  return c;
}
