import { NextResponse } from "next/server";

function cleanNip(value: string) {
  return value.replace(/\D/g, "");
}
function parseAddress(value?: string | null) {
  const raw = (value ?? "").trim();
  const postal = raw.match(/\b\d{2}-\d{3}\b/)?.[0] ?? "";
  const parts = raw
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
  const streetPart = parts[0] ?? "";
  const cityPart = parts.slice(1).join(", ").replace(postal, "").trim();
  const number =
    streetPart.match(/\s(\d+[A-Za-z]?(?:\/\d+[A-Za-z]?)?)$/)?.[1] ?? "";
  const street = number
    ? streetPart.slice(0, -number.length).trim()
    : streetPart;
  return { street, buildingNumber: number, postalCode: postal, city: cityPart };
}
export async function GET(request: Request) {
  const nip = cleanNip(new URL(request.url).searchParams.get("nip") ?? "");
  if (!/^\d{10}$/.test(nip))
    return NextResponse.json(
      { code: "INVALID_NIP", message: "NIP must contain 10 digits" },
      { status: 400 },
    );
  const date = new Date().toISOString().slice(0, 10);
  try {
    const response = await fetch(
      `https://wl-api.mf.gov.pl/api/search/nip/${nip}?date=${date}`,
      { headers: { Accept: "application/json" }, next: { revalidate: 0 } },
    );
    if (!response.ok)
      return NextResponse.json(
        {
          code: "COMPANY_LOOKUP_FAILED",
          message: "Company registry is temporarily unavailable",
        },
        { status: 502 },
      );
    const json = (await response.json()) as {
      result?: {
        subject?: {
          name?: string;
          nip?: string;
          workingAddress?: string;
          residenceAddress?: string;
          statusVat?: string;
        };
      };
    };
    const subject = json.result?.subject;
    if (!subject)
      return NextResponse.json(
        { code: "COMPANY_NOT_FOUND", message: "Company not found" },
        { status: 404 },
      );
    const address = parseAddress(
      subject.workingAddress || subject.residenceAddress,
    );
    return NextResponse.json({
      companyName: subject.name ?? "",
      taxId: subject.nip ?? nip,
      countryCode: "PL",
      statusVat: subject.statusVat ?? null,
      ...address,
    });
  } catch {
    return NextResponse.json(
      {
        code: "COMPANY_LOOKUP_FAILED",
        message: "Company registry is temporarily unavailable",
      },
      { status: 502 },
    );
  }
}
