import type { CustomerType, PlanCode } from "@/types/auth";
export type PlanPrice = {
  code: PlanCode;
  documentLimit: number;
  net: number;
  vat: number;
  gross: number;
  vatRate: number;
  available: boolean;
};
const n = (key: string, fallback = 0) => Number(process.env[key] ?? fallback);
export function getPlan(code: PlanCode): PlanPrice {
  if (code === "FREE")
    return {
      code,
      documentLimit: 10,
      net: 0,
      vat: 0,
      gross: 0,
      vatRate: 23,
      available: true,
    };
  const net =
    code === "MONTHLY"
      ? n("MONTHLY_PRICE_NET_GROSZ")
      : n("YEARLY_PRICE_NET_GROSZ");
  const vatRate = n("POLAND_VAT_RATE", 23);
  const vat = Math.round((net * vatRate) / 100);
  const gross = net + vat;
  return {
    code,
    documentLimit: n(
      code === "MONTHLY" ? "MONTHLY_DOCUMENT_LIMIT" : "YEARLY_DOCUMENT_LIMIT",
      100,
    ),
    net,
    vat,
    gross,
    vatRate,
    available: net > 0,
  };
}
export function publicPlans(customerType: CustomerType) {
  return (["FREE", "MONTHLY", "YEARLY"] as PlanCode[]).map((code) => ({
    ...getPlan(code),
    displayAmount:
      customerType === "BUSINESS" ? getPlan(code).net : getPlan(code).gross,
    displayNet: customerType === "BUSINESS",
  }));
}
