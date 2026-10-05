"use client";
import {
  useDelete,
  useGet,
  useInfiniteGet,
  usePost,
  usePut,
} from "@/hooks/use-api";
import type { Template, TemplateSummary, TemplateVariable } from "./types";
export type TemplateInput = {
  name: string;
  category: string;
  description?: string;
  emailSubject?: string;
  content: string;
  headerContent?: string;
  footerContent?: string;
  pageNumbers?: boolean;
  variables?: TemplateVariable[];
};
export type TemplatePage = {
  items: TemplateSummary[];
  nextOffset: number | null;
  total: number;
};

export const useTemplatesService = (
  q = "",
  sort = "newest",
  source = "all",
  dateFrom = "",
  dateTo = "",
  category = "all",
  enabled = true,
  view?: "picker",
) =>
  useInfiniteGet<TemplatePage>(
    ["templates", view ?? "list", q, sort, source, dateFrom, dateTo, category],
    (offset) => {
      const params = new URLSearchParams();
      if (q.trim()) params.set("q", q.trim());
      params.set("sort", sort);
      params.set("source", source);
      params.set("offset", String(offset));
      params.set("limit", "20");
      if (dateFrom) params.set("dateFrom", dateFrom);
      if (dateTo) params.set("dateTo", dateTo);
      if (category !== "all") params.set("category", category);
      if (view) params.set("view", view);
      return `/templates?${params.toString()}`;
    },
    enabled,
  );
export const useCreateTemplateService = () =>
  usePost<Template, TemplateInput>("/templates", [["templates"]]);
export const useUpdateTemplateService = (id: string) =>
  usePut<Template, TemplateInput>(`/templates/${id}`, [["templates"]]);
export const useDeleteTemplateService = (id: string) =>
  useDelete<{ ok: boolean }>(`/templates/${id}`);
