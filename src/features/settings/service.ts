"use client";
import { useDelete, useGet, usePatch, usePost } from "@/hooks/use-api";
export type BillingOverview = {
  subscription: {
    plan: string;
    status: string;
    currentPeriodEndsAt: string | null;
    monthlyDocumentLimit: number;
  } | null;
  payments: Array<{
    id: string;
    provider: string;
    status: string;
    grossAmount: number;
    currency: string;
    transferReference: string | null;
    createdAt: string;
  }>;
  salesDocuments: Array<{
    id: string;
    number: string | null;
    fileUrl: string | null;
    sentAt: string | null;
    createdAt: string;
  }>;
  billingProfile: {
    billingEmail: string;
    companyName: string | null;
    taxId: string | null;
  } | null;
};
export type PaymentResult = {
  paymentMethod: "PAYU" | "BANK_TRANSFER";
  redirectUri?: string;
  transferReference?: string;
};
export const useBillingOverview = () =>
  useGet<BillingOverview>(["billing"], "/billing");
export const useDeleteAccount = () => useDelete<void>("/account");
export const useStartLicensePayment = () =>
  usePost<PaymentResult, { paymentMethod: "PAYU" | "BANK_TRANSFER" }>(
    "/billing",
    [["billing"]],
  );
export const useChangePaymentMethod = () =>
  usePatch<
    PaymentResult,
    { paymentId: string; paymentMethod: "PAYU" | "BANK_TRANSFER" }
  >("/billing", [["billing"]]);
