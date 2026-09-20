"use client";
import { useDelete, useGet, usePost, usePut } from "@/hooks/use-api";
import type { Template, TemplateVariable } from "./types";
export type TemplateInput = {
  name: string;
  description?: string;
  content: string;
  variables?: TemplateVariable[];
};
export const useTemplatesService = () =>
  useGet<Template[]>(["templates"], "/templates");
export const useCreateTemplateService = () =>
  usePost<Template, TemplateInput>("/templates", [["templates"]]);
export const useUpdateTemplateService = (id: string) =>
  usePut<Template, TemplateInput>(`/templates/${id}`, [["templates"]]);
export const useDeleteTemplateService = (id: string) =>
  useDelete<{ ok: boolean }>(`/templates/${id}`, [["templates"]]);
