"use client";
import { useGet, usePost, useDelete } from "@/hooks/use-api";
import type { Template } from "./types";
export const useTemplatesService = () =>
  useGet<Template[]>(["templates"], "/templates");
export const useCreateTemplateService = () =>
  usePost<Template, { name: string; description?: string; content: string }>(
    "/templates",
    [["templates"]],
  );
export const useDeleteTemplateService = (id: string) =>
  useDelete<{ ok: boolean }>(`/templates/${id}`, [["templates"]]);
