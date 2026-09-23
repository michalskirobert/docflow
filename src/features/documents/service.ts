"use client";
import { useDelete, useGet, usePost, usePut } from "@/hooks/use-api";
import type { Document } from "./types";
import type { Template } from "@/features/templates/types";

export const useDocumentsService = (q = "", sort = "newest") => {
  const params = new URLSearchParams();
  if (q.trim()) params.set("q", q.trim());
  params.set("sort", sort);
  return useGet<Document[]>(
    ["documents", q, sort],
    `/documents?${params.toString()}`,
  );
};
export const useDocumentService = (id: string) =>
  useGet<Document>(["documents", id], `/documents/${id}`, Boolean(id));
export const useDocumentTemplatesService = () =>
  useGet<Template[]>(["templates"], "/templates");
export const useGenerateDocumentService = () =>
  usePost<
    Document,
    { templateId: string; name: string; data: Record<string, string> }
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
export const useUpdateDocumentService = (id: string) =>
  usePut<Document, { name: string; data: Record<string, string> }>(
    `/documents/${id}`,
    [["documents"], ["documents", id]],
  );
export const useDeleteDocumentService = (id: string) =>
  useDelete<void>(`/documents/${id}`, [["documents"]]);

export type EmailSettingsStatus = { configured: boolean };
export const useEmailSettingsStatusService = () =>
  useGet<EmailSettingsStatus>(["email-settings"], "/settings/email");
export const useSendPreparedEmailService = () =>
  usePost<
    { ok: boolean },
    { to: string; subject: string; html: string; text?: string }
  >("/email/send");
