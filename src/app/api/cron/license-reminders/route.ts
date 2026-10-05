import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/server/email/service";
import { renderEmailTemplate } from "@/server/email/template";

export const runtime = "nodejs";

type ReminderKind = "SEVEN_DAYS" | "ONE_DAY" | "EXPIRED";

function reminderKind(days: number): ReminderKind | null {
  if (days === 7) return "SEVEN_DAYS";
  if (days === 1) return "ONE_DAY";
  if (days <= 0) return "EXPIRED";
  return null;
}

async function run(request: Request) {
  if (
    !process.env.CRON_SECRET ||
    request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const from = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const until = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const subscriptions = await prisma.subscription.findMany({
    where: {
      plan: "YEARLY",
      currentPeriodEndsAt: { gte: from, lte: until },
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
    const days = Math.ceil(
      (sub.currentPeriodEndsAt.getTime() - now.getTime()) / 86400000,
    );
    const kind = reminderKind(days);
    if (!kind) continue;

    const alreadySent = await prisma.licenseReminderDelivery.findUnique({
      where: {
        organizationId_periodEndsAt_kind: {
          organizationId: sub.organizationId,
          periodEndsAt: sub.currentPeriodEndsAt,
          kind,
        },
      },
      select: { id: true },
    });
    if (alreadySent) continue;

    const locale = user.locale === "pl" ? "pl" : user.locale === "id" ? "id" : "en";
    const expired = kind === "EXPIRED";
    const subject = expired
      ? locale === "pl"
        ? "Licencja DocFlow wygasła"
        : locale === "id"
          ? "Lisensi DocFlow Anda telah berakhir"
          : "Your DocFlow license has expired"
      : locale === "pl"
        ? "Licencja DocFlow wkrótce wygaśnie"
        : locale === "id"
          ? "Lisensi DocFlow Anda akan segera berakhir"
          : "Your DocFlow license expires soon";
    const date = sub.currentPeriodEndsAt.toLocaleDateString(
      locale === "pl" ? "pl-PL" : locale === "id" ? "id-ID" : "en-GB",
    );
    const intro = expired
      ? locale === "pl"
        ? `Cześć ${user.firstName}, Twoja roczna licencja DocFlow wygasła (${date}). Możesz ją odnowić w ustawieniach konta.`
        : locale === "id"
          ? `Halo ${user.firstName}, lisensi tahunan DocFlow Anda telah berakhir (${date}). Anda dapat memperpanjangnya di pengaturan akun.`
          : `Hi ${user.firstName}, your annual DocFlow license has expired (${date}). You can renew it in account settings.`
      : locale === "pl"
        ? `Cześć ${user.firstName}, Twoja roczna licencja DocFlow wygaśnie za ${days} dni (${date}). Możesz odnowić ją już teraz bez utraty pozostałego czasu.`
        : locale === "id"
          ? `Halo ${user.firstName}, lisensi tahunan DocFlow Anda akan berakhir dalam ${days} hari (${date}). Anda dapat memperpanjangnya sekarang tanpa kehilangan sisa waktu.`
          : `Hi ${user.firstName}, your annual DocFlow license expires in ${days} days (${date}). You can renew now without losing the remaining time.`;
    const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

    await sendEmail({
      to: user.email,
      subject,
      html: renderEmailTemplate({
        title: subject,
        intro,
        actionLabel:
          locale === "pl" ? "Przedłuż licencję" : locale === "id" ? "Perpanjang lisensi" : "Renew license",
        actionUrl: `${base}/${locale}/account`,
      }),
    });
    await prisma.licenseReminderDelivery.create({
      data: {
        organizationId: sub.organizationId,
        periodEndsAt: sub.currentPeriodEndsAt,
        kind,
      },
    });
    sent += 1;
  }

  return NextResponse.json({ ok: true, sent });
}

export async function GET(request: Request) {
  return run(request);
}

export async function POST(request: Request) {
  return run(request);
}
