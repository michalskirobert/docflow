import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/server/email/service";
import { renderEmailTemplate } from "@/server/email/template";
export const runtime = "nodejs";
export async function POST(request: Request) {
  if (
    !process.env.CRON_SECRET ||
    request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`
  )
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  const now = new Date(),
    until = new Date(now.getTime() + 7 * 86400000);
  const subscriptions = await prisma.subscription.findMany({
    where: {
      plan: "YEARLY",
      status: "ACTIVE",
      currentPeriodEndsAt: { gt: now, lte: until },
    },
    include: {
      organization: {
        include: {
          memberships: {
            where: { role: "OWNER" },
            include: { user: true },
            take: 1,
          },
        },
      },
    },
  });
  let sent = 0;
  for (const sub of subscriptions) {
    const user = sub.organization.memberships[0]?.user;
    if (!user || !sub.currentPeriodEndsAt) continue;
    const days = Math.max(
      0,
      Math.ceil((sub.currentPeriodEndsAt.getTime() - now.getTime()) / 86400000),
    );
    const locale =
      user.locale === "pl" ? "pl" : user.locale === "id" ? "id" : "en";
    const subject =
      locale === "pl"
        ? "Licencja DocFlow wkrótce wygaśnie"
        : locale === "id"
          ? "Lisensi DocFlow Anda akan segera berakhir"
          : "Your DocFlow license expires soon";
    const intro =
      locale === "pl"
        ? `Cześć ${user.firstName}, Twoja roczna licencja DocFlow wygaśnie za ${days} dni (${sub.currentPeriodEndsAt.toLocaleDateString("pl-PL")}).`
        : locale === "id"
          ? `Halo ${user.firstName}, lisensi tahunan DocFlow Anda akan berakhir dalam ${days} hari (${sub.currentPeriodEndsAt.toLocaleDateString("id-ID")}).`
          : `Hi ${user.firstName}, your annual DocFlow license expires in ${days} days (${sub.currentPeriodEndsAt.toLocaleDateString("en-GB")}).`;
    const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    await sendEmail({
      to: user.email,
      subject,
      html: renderEmailTemplate({
        title: subject,
        intro,
        actionLabel:
          locale === "pl"
            ? "Otwórz DocFlow"
            : locale === "id"
              ? "Buka DocFlow"
              : "Open DocFlow",
        actionUrl: `${base}/${locale}/settings`,
      }),
    });
    sent++;
  }
  return NextResponse.json({ ok: true, sent });
}
