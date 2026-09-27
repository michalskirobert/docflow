"use client";
import { useDelete, useGet, usePost, usePut } from "@/hooks/use-api";
import type { Template, TemplateSummary, TemplateVariable } from "./types";
export type TemplateInput = {
  name: string;
  description?: string;
  emailSubject?: string;
  content: string;
  headerContent?: string;
  footerContent?: string;
  pageNumbers?: boolean;
  variables?: TemplateVariable[];
};
export const useTemplatesService = (
  q = "",
  sort = "newest",
  source = "all",
  dateFrom = "",
  dateTo = "",
) => {
  const params = new URLSearchParams();
  if (q.trim()) params.set("q", q.trim());
  params.set("sort", sort);
  params.set("source", source);
  if (dateFrom) params.set("dateFrom", dateFrom);
  if (dateTo) params.set("dateTo", dateTo);
  return useGet<TemplateSummary[]>(
    ["templates", q, sort, source, dateFrom, dateTo],
    `/templates?${params.toString()}`,
  );
};
export const useCreateTemplateService = () =>
  usePost<Template, TemplateInput>("/templates", [["templates"]]);
export const useUpdateTemplateService = (id: string) =>
  usePut<Template, TemplateInput>(`/templates/${id}`, [["templates"]]);
export const useDeleteTemplateService = (id: string) =>
  useDelete<{ ok: boolean }>(`/templates/${id}`, [["templates"]]);
