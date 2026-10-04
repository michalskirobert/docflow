"use client";
import {
  useDelete,
  useGet,
  useInfiniteGet,
  usePost,
  usePut,
} from "@/hooks/use-api";
import { useTemplatesService } from "@/features/templates/service";
import type { Document, DocumentSummary } from "./types";
import type { Template } from "@/features/templates/types";

export type DocumentPage = {
  items: DocumentSummary[];
  nextOffset: number | null;
  total: number;
};

export type DocumentTemplateFilter = { id: string; name: string };

export const useDocumentsService = (
  q = "",
  sort = "newest",
  category = "all",
  templateId = "all",
  dateFrom = "",
  dateTo = "",
) =>
  useInfiniteGet<DocumentPage>(
    ["documents", "list", q, sort, category, templateId, dateFrom, dateTo],
    (offset) => {
      const params = new URLSearchParams();
      if (q.trim()) params.set("q", q.trim());
      params.set("sort", sort);
      params.set("offset", String(offset));
      params.set("limit", "20");
      if (category !== "all") params.set("category", category);
      if (templateId !== "all") params.set("templateId", templateId);
      if (dateFrom) params.set("dateFrom", dateFrom);
      if (dateTo) params.set("dateTo", dateTo);
      return `/documents?${params.toString()}`;
    },
  );

export const useDocumentTemplateFiltersService = () =>
  useGet<DocumentTemplateFilter[]>(
    ["documents", "template-filters"],
    "/documents?view=filters",
  );
export const useDocumentService = (id: string) =>
  useGet<Document>(["documents", id], `/documents/${id}`, Boolean(id), {
    refetchOnMount: "always",
  });
export const useDocumentTemplatesService = (
  q = "",
  category = "all",
  enabled = true,
) =>
  useTemplatesService(q, "newest", "all", "", "", category, enabled, "picker");
export const useDocumentTemplateService = (id: string) =>
  useGet<Template>(["templates", id], `/templates/${id}`, Boolean(id), {
    refetchOnMount: "always",
  });
export const useGenerateDocumentService = () =>
  usePost<
    Document,
    {
      templateId: string;
      name: string;
      category: string;
      data: Record<string, string>;
    }
  >("/documents", [["documents"]]);
export type RenderedEmail = {
  subject: string;
  html: string;
  text: string;
};
export const useRenderEmailService = (templateId: string) =>
  usePost<RenderedEmail, { data: Record<string, string>; subject?: string }>(
    `/templates/${templateId}/email`,
  );
export const useRenderDocumentEmailService = (documentId: string) =>
  usePost<RenderedEmail, { subject?: string; data?: Record<string, string> }>(
    `/documents/${documentId}/email`,
  );
export type RenderedDocumentPreview = { pdfDataUrl: string };
export const useRenderDocumentPreviewService = (templateId: string) =>
  usePost<RenderedDocumentPreview, { data: Record<string, string> }>(
    `/templates/${templateId}/preview`,
  );
export const useUpdateDocumentService = (id: string) =>
  usePut<
    Document,
    { name: string; category: string; data: Record<string, string> }
  >(`/documents/${id}`, [["documents"], ["documents", id]]);
export const useDeleteDocumentService = (id: string) =>
  useDelete<void>(`/documents/${id}`);

export type EmailSettingsStatus = { configured: boolean };
export const useEmailSettingsStatusService = () =>
  useGet<EmailSettingsStatus>(["email-settings"], "/settings/email");
export const useSendPreparedEmailService = () =>
  usePost<
    { ok: boolean },
    { to: string; subject: string; html: string; text?: string }
  >("/email/send");
