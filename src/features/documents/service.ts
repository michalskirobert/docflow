"use client";
import { useGet, usePost } from "@/hooks/use-api";
import type { Document } from "./types";
import type { Template } from "@/features/templates/types";
export const useDocumentsService = () =>
  useGet<Document[]>(["documents"], "/documents");
export const useDocumentTemplatesService = () =>
  useGet<Template[]>(["templates"], "/templates");
export const useGenerateDocumentService = () =>
  usePost<
    Document,
    { templateId: string; name: string; data: Record<string, string> }
  >("/documents", [["documents"]]);
