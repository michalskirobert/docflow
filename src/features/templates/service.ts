"use client";
import { useDelete, useGet, usePost, usePut } from "@/hooks/use-api";
import type { Template, TemplateVariable } from "./types";
export type TemplateInput = {
  name: string;
  description?: string;
  content: string;
  headerContent?: string;
  footerContent?: string;
  pageNumbers?: boolean;
  variables?: TemplateVariable[];
};
export const useTemplatesService = (q = "", sort = "newest") => {
  const params = new URLSearchParams();
  if (q.trim()) params.set("q", q.trim());
  params.set("sort", sort);
  return useGet<Template[]>(
    ["templates", q, sort],
    `/templates?${params.toString()}`,
  );
};
export const useCreateTemplateService = () =>
  usePost<Template, TemplateInput>("/templates", [["templates"]]);
export const useUpdateTemplateService = (id: string) =>
  usePut<Template, TemplateInput>(`/templates/${id}`, [["templates"]]);
export const useDeleteTemplateService = (id: string) =>
  useDelete<{ ok: boolean }>(`/templates/${id}`, [["templates"]]);
