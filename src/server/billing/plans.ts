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
  const vatRate = n("POLAND_VAT_RATE", 23);
  const gross = n("YEARLY_PRICE_GROSS_GROSZ", 50000);
  const net = Math.round(gross / (1 + vatRate / 100));
  const vat = gross - net;
  return {
    code,
    documentLimit: n("YEARLY_DOCUMENT_LIMIT", 100),
    net,
    vat,
    gross,
    vatRate,
    available: gross > 0,
  };
}
export function publicPlans(customerType: CustomerType) {
  const codes: PlanCode[] =
    customerType === "BUSINESS" ? ["YEARLY"] : ["FREE", "YEARLY"];

  return codes.map((code) => {
    const plan = getPlan(code);
    return {
      ...plan,
      displayAmount: customerType === "BUSINESS" ? plan.net : plan.gross,
      displayNet: customerType === "BUSINESS",
    };
  });
}
