import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { accountSchema } from "@/features/settings/schema";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/server/auth/require-session";
import { destroySession } from "@/server/auth/session";
import { sendVerificationEmail } from "@/server/email/verification";

export async function GET() {
  try {
    const s = await requireSession();
    const membership = await prisma.membership.findUnique({
      where: {
        userId_organizationId: {
          userId: s.id,
          organizationId: s.organizationId,
        },
      },
      include: {
        user: true,
        organization: { include: { billingProfile: true } },
      },
    });
    if (!membership)
      return NextResponse.json({ message: "Not found" }, { status: 404 });
    const b = membership.organization.billingProfile;
    return NextResponse.json({
      firstName: membership.user.firstName,
      lastName: membership.user.lastName,
      email: membership.user.email,
      organizationName: membership.organization.name,
      canEditOrganization: membership.role === "OWNER",
      customerType: b?.customerType ?? "INDIVIDUAL",
      billingEmail: b?.billingEmail ?? membership.user.email,
      companyName: b?.companyName ?? "",
      taxId: b?.taxId ?? "",
      vatId: b?.vatId ?? "",
      countryCode: b?.countryCode ?? "PL",
      street: b?.street ?? "",
      buildingNumber: b?.buildingNumber ?? "",
      apartmentNumber: b?.apartmentNumber ?? "",
      postalCode: b?.postalCode ?? "",
      city: b?.city ?? "",
    });
  } catch (error) {
    console.error("[GET account]", error);
    return NextResponse.json(
      { message: "Could not load account" },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const s = await requireSession();
    const parsed = accountSchema.safeParse(await request.json());
    if (!parsed.success)
      return NextResponse.json(
        { code: "VALIDATION_ERROR", issues: parsed.error.flatten() },
        { status: 400 },
      );
    const data = parsed.data;
    const email = data.email.toLowerCase();
    const existing = await prisma.user.findFirst({
      where: { email, NOT: { id: s.id } },
      select: { id: true },
    });
    if (existing)
      return NextResponse.json(
        { code: "EMAIL_EXISTS", message: "Email already used" },
        { status: 409 },
      );
    const membership = await prisma.membership.findUnique({
      where: {
        userId_organizationId: {
          userId: s.id,
          organizationId: s.organizationId,
        },
      },
    });
    if (!membership)
      return NextResponse.json({ message: "Not found" }, { status: 404 });
    const current = await prisma.user.findUniqueOrThrow({
      where: { id: s.id },
    });
    const emailChanged = current.email.toLowerCase() !== email;
    const user = await prisma.$transaction(async (tx) => {
      const updated = await tx.user.update({
        where: { id: s.id },
        data: {
          firstName: data.firstName,
          lastName: data.lastName,
          email,
          ...(emailChanged ? { emailVerifiedAt: null } : {}),
        },
      });
      if (membership.role === "OWNER") {
        await tx.organization.update({
          where: { id: s.organizationId },
          data: { name: data.organizationName },
        });
      }
      await tx.billingProfile.update({
        where: { organizationId: s.organizationId },
        data: {
          customerType: data.customerType,
          billingEmail: data.billingEmail.toLowerCase(),
          companyName: data.companyName || null,
          taxId: data.taxId || null,
          vatId: data.vatId || null,
          countryCode: data.countryCode.toUpperCase(),
          street: data.street,
          buildingNumber: data.buildingNumber,
          apartmentNumber: data.apartmentNumber || null,
          postalCode: data.postalCode,
          city: data.city,
        },
      });
      return updated;
    });
    if (emailChanged) await sendVerificationEmail(user);
    return NextResponse.json({ emailChanged });
  } catch (error) {
    console.error("[PATCH account]", error);
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    )
      return NextResponse.json({ code: "EMAIL_EXISTS" }, { status: 409 });
    return NextResponse.json(
      { message: "Could not update account" },
      { status: 500 },
    );
  }
}

export async function DELETE() {
  try {
    const s = await requireSession();
    await prisma.$transaction(async (tx) => {
      const membership = await tx.membership.findUnique({
        where: {
          userId_organizationId: {
            userId: s.id,
            organizationId: s.organizationId,
          },
        },
      });
      if (membership?.role === "OWNER")
        await tx.organization.delete({ where: { id: s.organizationId } });
      await tx.user.delete({ where: { id: s.id } });
    });
    await destroySession();
    return new NextResponse(null, { status: 204 });
  } catch (e) {
    console.error("[DELETE account]", e);
    return NextResponse.json(
      { message: "Could not delete account" },
      { status: 500 },
    );
  }
}
