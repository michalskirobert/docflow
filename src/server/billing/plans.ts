import type { CustomerType, PlanCode } from "@/types/auth";

export type BillingMarket = "PL" | "ID" | "INTL";
export type BillingCurrency = "PLN" | "IDR" | "EUR";

export type PlanPrice = {
  code: PlanCode;
  documentLimit: number;
  net: number;
  vat: number;
  gross: number;
  vatRate: number;
  currency: BillingCurrency;
  market: BillingMarket;
  available: boolean;
  paymentAvailable: boolean;
};

const n = (key: string, fallback = 0) => Number(process.env[key] ?? fallback);

export function getBillingMarket(countryCode?: string | null): BillingMarket {
  const country = countryCode?.trim().toUpperCase();
  if (country === "PL") return "PL";
  if (country === "ID") return "ID";
  return "INTL";
}

function marketConfig(countryCode?: string | null) {
  const market = getBillingMarket(countryCode);

  if (market === "PL") {
    return {
      market,
      currency: "PLN" as const,
      gross: n("YEARLY_PRICE_PLN_GROSZ", n("YEARLY_PRICE_GROSS_GROSZ", 50000)),
      vatRate: n("POLAND_VAT_RATE", 23),
      paymentAvailable: true,
    };
  }

  if (market === "ID") {
    return {
      market,
      currency: "IDR" as const,
      gross: n("YEARLY_PRICE_IDR_MINOR", 59900000),
      vatRate: n("INDONESIA_VAT_RATE", 11),
      // PayU Europe does not support IDR as a standard settlement currency.
      // Keep the local price visible, but do not create a misleading checkout
      // until an Indonesian payment provider is configured.
      paymentAvailable: false,
    };
  }

  return {
    market,
    currency: "EUR" as const,
    gross: n("YEARLY_PRICE_EUR_CENTS", 12000),
    vatRate: n("INTERNATIONAL_VAT_RATE", 0),
    paymentAvailable: true,
  };
}

export function getPlan(code: PlanCode, countryCode?: string | null): PlanPrice {
  const config = marketConfig(countryCode);

  if (code === "FREE") {
    return {
      code,
      documentLimit: 10,
      net: 0,
      vat: 0,
      gross: 0,
      vatRate: config.vatRate,
      currency: config.currency,
      market: config.market,
      available: true,
      paymentAvailable: true,
    };
  }

  const net = Math.round(config.gross / (1 + config.vatRate / 100));
  const vat = config.gross - net;

  return {
    code,
    documentLimit: n("YEARLY_DOCUMENT_LIMIT", 100),
    net,
    vat,
    gross: config.gross,
    vatRate: config.vatRate,
    currency: config.currency,
    market: config.market,
    available: config.gross > 0,
    paymentAvailable: config.paymentAvailable,
  };
}

export function publicPlans(customerType: CustomerType, countryCode?: string | null) {
  const codes: PlanCode[] = customerType === "BUSINESS" ? ["YEARLY"] : ["FREE", "YEARLY"];

  return codes.map((code) => {
    const plan = getPlan(code, countryCode);
    return {
      ...plan,
      displayAmount: customerType === "BUSINESS" ? plan.net : plan.gross,
      displayNet: customerType === "BUSINESS",
    };
  });
}
