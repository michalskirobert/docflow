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
  const response = await fetch(
    `${baseUrl()}/pl/standard/user/oauth/authorize`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    },
  );
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
}) {
  const token = await accessToken();
  const posId = process.env.PAYU_POS_ID;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!posId || !appUrl)
    throw new Error("PAYU_POS_ID and NEXT_PUBLIC_APP_URL are required");
  const response = await fetch(`${baseUrl()}/api/v2_1/orders`, {
    method: "POST",
    redirect: "manual",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      notifyUrl: `${appUrl}/api/payu/notify`,
      continueUrl: `${appUrl}/${input.locale}/payment/return`,
      customerIp: input.customerIp,
      merchantPosId: posId,
      description: input.description,
      currencyCode: "PLN",
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
export function verifyPayUSignature(rawBody: string, header: string | null) {
  const secondKey = process.env.PAYU_SECOND_KEY;
  if (!secondKey || !header) return false;
  const incoming = header
    .split(";")
    .map((x) => x.split("="))
    .find(([k]) => k?.toLowerCase() === "signature")?.[1];
  if (!incoming) return false;
  const expected = createHash("md5")
    .update(rawBody + secondKey)
    .digest("hex");
  const a = Buffer.from(incoming);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}
