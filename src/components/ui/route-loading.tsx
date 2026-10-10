"use client";
import { usePathname } from "next/navigation";
import LoginLoading from "@/app/[locale]/login/loading";
import RegisterLoading from "@/app/[locale]/register/loading";
import { AppLoader } from "./app-loader";

export function RouteLoading() {
  const pathname = usePathname();
  if (/\/register\/?$/.test(pathname ?? "")) return <RegisterLoading />;
  if (/\/login\/?$/.test(pathname ?? "")) return <LoginLoading />;
  return <AppLoader />;
}
