import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/server/email/service";
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
    await sendEmail({
      to: user.email,
      subject:
        user.locale === "pl"
          ? "Licencja DocFlow wkrótce wygaśnie"
          : "Your DocFlow license expires soon",
      html:
        user.locale === "pl"
          ? `<p>Cześć ${user.firstName}, Twoja roczna licencja DocFlow wygaśnie za ${days} dni (${sub.currentPeriodEndsAt.toLocaleDateString("pl-PL")}).</p><p>Zaloguj się do DocFlow, aby ją przedłużyć.</p>`
          : `<p>Hi ${user.firstName}, your annual DocFlow license expires in ${days} days (${sub.currentPeriodEndsAt.toLocaleDateString("en-GB")}).</p><p>Sign in to DocFlow to renew it.</p>`,
    });
    sent++;
  }
  return NextResponse.json({ ok: true, sent });
}
