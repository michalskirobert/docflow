import { NextResponse } from "next/server";
import { publicPlans } from "@/server/billing/plans";
export async function GET(request: Request) {
  const type =
    new URL(request.url).searchParams.get("customerType") === "BUSINESS"
      ? "BUSINESS"
      : "INDIVIDUAL";
  return NextResponse.json(publicPlans(type));
}
