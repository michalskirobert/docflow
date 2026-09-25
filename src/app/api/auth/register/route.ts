import { Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";

import { registerSchema } from "@/features/auth/schema";
import { prisma } from "@/lib/prisma";
import { getPlan } from "@/server/billing/plans";
import { verifyCaptcha } from "@/server/captcha/challenge";
import { sendVerificationEmail } from "@/server/email/verification";

export async function POST(request: Request) {
  try {
    const parsed = registerSchema.safeParse(await request.json());

    if (!parsed.success) {
      return NextResponse.json(
        {
          code: "VALIDATION_ERROR",
          message: "Invalid registration data",
          issues: parsed.error.flatten(),
        },
        { status: 400 },
      );
    }

    const data = parsed.data;

    if (data.customerType === "BUSINESS" && data.plan === "FREE") {
      return NextResponse.json(
        {
          code: "PLAN_UNAVAILABLE",
          message: "Business accounts require a paid plan",
        },
        { status: 400 },
      );
    }

    if (!verifyCaptcha(data.captchaToken, data.captchaAnswer.trim())) {
      return NextResponse.json(
        {
          code: "INVALID_CAPTCHA",
          message: "Invalid or expired verification challenge",
        },
        { status: 400 },
      );
    }

    const email = data.email.toLowerCase();

    const existingUser = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        firstName: true,
        locale: true,
        emailVerifiedAt: true,
        memberships: {
          take: 1,
          select: {
            organization: {
              select: {
                payments: {
                  orderBy: { createdAt: "desc" },
                  take: 1,
                  select: {
                    plan: true,
                    provider: true,
                    transferReference: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (existingUser) {
      if (existingUser.emailVerifiedAt) {
        return NextResponse.json(
          {
            code: "EMAIL_EXISTS",
            message: "Account with this email already exists",
          },
          { status: 409 },
        );
      }

      try {
        await sendVerificationEmail(existingUser);
      } catch (error) {
        console.error(
          "[POST /api/auth/register] verification email retry",
          error,
        );

        return NextResponse.json(
          {
            code: "EMAIL_DELIVERY_FAILED",
            message: "Verification email could not be sent",
          },
          { status: 503 },
        );
      }

      const payment =
        existingUser.memberships[0]?.organization.payments[0] ?? null;

      return NextResponse.json(
        {
          email,
          verificationRequired: true,
          paymentRequired: Boolean(payment && payment.plan !== "FREE"),
          ...(payment?.provider === "BANK_TRANSFER" && {
            paymentPending: true,
            paymentMethod: "BANK_TRANSFER",
            transferReference: payment.transferReference,
          }),
        },
        { status: 200 },
      );
    }

    const plan = getPlan(data.plan);

    if (!plan.available) {
      return NextResponse.json(
        {
          code: "PLAN_UNAVAILABLE",
          message: "Selected paid plan is not configured",
        },
        { status: 400 },
      );
    }

    const passwordHash = await bcrypt.hash(data.password, 12);

    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          firstName: data.firstName,
          lastName: data.lastName,
          email,
          passwordHash,
          locale: data.locale,
        },
      });

      const organization = await tx.organization.create({
        data: {
          name: data.organizationName,
        },
      });

      await tx.membership.create({
        data: {
          userId: user.id,
          organizationId: organization.id,
          role: "OWNER",
        },
      });

      await tx.billingProfile.create({
        data: {
          organizationId: organization.id,
          customerType: data.customerType,
          billingEmail: data.billingEmail.toLowerCase(),
          firstName: data.customerType === "INDIVIDUAL" ? data.firstName : null,
          lastName: data.customerType === "INDIVIDUAL" ? data.lastName : null,
          companyName:
            data.customerType === "BUSINESS" ? data.companyName : null,
          taxId: data.customerType === "BUSINESS" ? data.taxId : null,
          vatId: data.customerType === "BUSINESS" ? data.vatId : null,
          countryCode: data.countryCode.toUpperCase(),
          street: data.street,
          buildingNumber: data.buildingNumber,
          apartmentNumber: data.apartmentNumber || null,
          postalCode: data.postalCode,
          city: data.city,
        },
      });

      await tx.subscription.create({
        data: {
          organizationId: organization.id,
          plan: "FREE",
          status: "ACTIVE",
          monthlyDocumentLimit: 10,
        },
      });

      let paymentMethod: string | undefined;
      let transferReference: string | null = null;

      if (data.plan !== "FREE") {
        const extOrderId = randomUUID();
        transferReference =
          data.paymentMethod === "BANK_TRANSFER"
            ? `DF-${randomUUID().replace(/-/g, "").slice(0, 12).toUpperCase()}`
            : null;

        await tx.payment.create({
          data: {
            organizationId: organization.id,
            plan: data.plan,
            provider: data.paymentMethod,
            extOrderId,
            transferReference,
            netAmount: plan.net,
            vatAmount: plan.vat,
            grossAmount: plan.gross,
            vatRate: plan.vatRate,
          },
        });

        paymentMethod = data.paymentMethod;
      }

      return {
        user,
        paymentMethod,
        transferReference,
      };
    });

    try {
      await sendVerificationEmail(result.user);
    } catch (error) {
      console.error("[POST /api/auth/register] verification email", error);

      return NextResponse.json(
        {
          code: "EMAIL_DELIVERY_FAILED",
          message: "Verification email could not be sent",
        },
        { status: 503 },
      );
    }

    if (result.paymentMethod === "BANK_TRANSFER") {
      return NextResponse.json(
        {
          email,
          verificationRequired: true,
          paymentRequired: true,
          paymentPending: true,
          paymentMethod: "BANK_TRANSFER",
          transferReference: result.transferReference,
        },
        { status: 201 },
      );
    }

    return NextResponse.json(
      {
        email,
        verificationRequired: true,
        paymentRequired: data.plan !== "FREE",
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("[POST /api/auth/register]", error);

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        return NextResponse.json(
          {
            code: "CONFLICT",
            message: "A record with these values already exists",

            ...(process.env.NODE_ENV === "development" && {
              prismaCode: error.code,
              meta: error.meta,
            }),
          },
          { status: 409 },
        );
      }

      return NextResponse.json(
        {
          code: "DATABASE_ERROR",
          message: "Registration could not be saved",

          ...(process.env.NODE_ENV === "development" && {
            prismaCode: error.code,
            meta: error.meta,
          }),
        },
        { status: 500 },
      );
    }

    if (error instanceof Prisma.PrismaClientValidationError) {
      return NextResponse.json(
        {
          code: "DATABASE_VALIDATION_ERROR",

          message: "Registration data does not match the database schema",

          ...(process.env.NODE_ENV === "development" && {
            details: error.message,
          }),
        },
        { status: 500 },
      );
    }

    return NextResponse.json(
      {
        code: "INTERNAL_ERROR",
        message: "Internal server error",

        ...(process.env.NODE_ENV === "development" &&
          error instanceof Error && {
            details: error.message,
          }),
      },
      { status: 500 },
    );
  }
}
