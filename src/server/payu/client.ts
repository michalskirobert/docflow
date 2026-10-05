import { createHash, timingSafeEqual } from "node:crypto";

const baseUrl = () =>
  process.env.PAYU_ENV === "production"
    ? "https://secure.payu.com"
    : "https://secure.snd.payu.com";

async function accessToken() {
  const clientId = process.env.PAYU_CLIENT_ID;
  const secret = process.env.PAYU_CLIENT_SECRET;
  if (!clientId || !secret)
    throw new Error("PayU credentials are not configured");

  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: clientId,
    client_secret: secret,
  });
  const response = await fetch(`${baseUrl()}/pl/standard/user/oauth/authorize`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!response.ok) throw new Error(`PayU OAuth failed: ${response.status}`);
  return ((await response.json()) as { access_token: string }).access_token;
}

export async function createPayUOrder(input: {
  extOrderId: string;
  customerIp: string;
  description: string;
  totalAmount: number;
  email: string;
  firstName: string;
  lastName: string;
  locale: string;
  currency: "PLN" | "EUR";
}) {
  const token = await accessToken();
  const posId = process.env.PAYU_POS_ID;
  const configuredAppUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!posId || !configuredAppUrl)
    throw new Error("PAYU_POS_ID and NEXT_PUBLIC_APP_URL are required");

  const appUrl = configuredAppUrl.replace(/\/$/, "");
  const response = await fetch(`${baseUrl()}/api/v2_1/orders`, {
    method: "POST",
    redirect: "manual",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      notifyUrl: `${appUrl}/api/payu/notify`,
      continueUrl: `${appUrl}/${input.locale}/payment/return?payment=${encodeURIComponent(input.extOrderId)}`,
      customerIp: input.customerIp,
      merchantPosId: posId,
      description: input.description,
      currencyCode: input.currency,
      totalAmount: String(input.totalAmount),
      extOrderId: input.extOrderId,
      buyer: {
        email: input.email,
        firstName: input.firstName,
        lastName: input.lastName,
        language: input.locale,
      },
      products: [
        {
          name: input.description,
          unitPrice: String(input.totalAmount),
          quantity: "1",
        },
      ],
    }),
  });

  const data = (await response.json()) as {
    orderId?: string;
    redirectUri?: string;
    status?: { statusCode?: string };
  };
  if (!data.orderId || !data.redirectUri)
    throw new Error(`PayU order failed: ${JSON.stringify(data)}`);
  return data;
}

export async function getPayUOrder(orderId: string) {
  const token = await accessToken();
  const response = await fetch(
    `${baseUrl()}/api/v2_1/orders/${encodeURIComponent(orderId)}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      cache: "no-store",
    },
  );
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`PayU order status failed: ${response.status} ${body}`);
  }
  const data = (await response.json()) as {
    orders?: Array<{
      orderId?: string;
      extOrderId?: string;
      status?: string;
    }>;
  };
  const order = data.orders?.[0];
  if (!order) throw new Error("PayU order status response has no order");
  return order;
}

export async function cancelPayUOrder(orderId: string) {
  const token = await accessToken();
  const response = await fetch(
    `${baseUrl()}/api/v2_1/orders/${encodeURIComponent(orderId)}`,
    {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    },
  );
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`PayU cancellation failed: ${response.status} ${body}`);
  }
}

export type PayUSignatureVerification = {
  valid: boolean;
  reason?: "missing-second-key" | "missing-header" | "missing-signature" | "unsupported-algorithm" | "mismatch";
};

export function verifyPayUSignature(
  rawBody: string,
  header: string | null,
): PayUSignatureVerification {
  const secondKey = process.env.PAYU_SECOND_KEY;
  if (!secondKey) return { valid: false, reason: "missing-second-key" };
  if (!header) return { valid: false, reason: "missing-header" };

  const params = new Map(
    header
      .split(";")
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const separator = part.indexOf("=");
        if (separator < 0) return [part.toLowerCase(), ""] as const;
        return [
          part.slice(0, separator).trim().toLowerCase(),
          part.slice(separator + 1).trim(),
        ] as const;
      }),
  );

  const incoming = params.get("signature");
  if (!incoming) return { valid: false, reason: "missing-signature" };

  const algorithm = (params.get("algorithm") ?? "MD5").toUpperCase();
  if (algorithm !== "MD5") {
    return { valid: false, reason: "unsupported-algorithm" };
  }

  const expected = createHash("md5")
    .update(rawBody + secondKey, "utf8")
    .digest("hex");
  const a = Buffer.from(incoming.toLowerCase(), "utf8");
  const b = Buffer.from(expected, "utf8");

  const valid = a.length === b.length && timingSafeEqual(a, b);
  return { valid, reason: valid ? undefined : "mismatch" };
}
