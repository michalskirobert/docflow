import { Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";

import { registerSchema } from "@/features/auth/schema";
import { prisma } from "@/lib/prisma";
import { getPlan } from "@/server/billing/plans";
import { verifyCaptcha } from "@/server/captcha/challenge";
import { sendVerificationEmail } from "@/server/email/verification";
import { createPayUOrder } from "@/server/payu/client";

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
      select: { id: true },
    });

    if (existingUser) {
      return NextResponse.json(
        {
          code: "EMAIL_EXISTS",
          message: "Account with this email already exists",
        },
        { status: 409 },
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

      return {
        user,
        organization,
      };
    });

    await sendVerificationEmail(result.user);

    let redirectUri: string | undefined;

    if (data.plan !== "FREE") {
      const extOrderId = randomUUID();
      const transferReference =
        data.paymentMethod === "BANK_TRANSFER"
          ? `DF-${randomUUID().replace(/-/g, "").slice(0, 12).toUpperCase()}`
          : null;

      const payment = await prisma.payment.create({
        data: {
          organizationId: result.organization.id,

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

      if (data.paymentMethod === "BANK_TRANSFER") {
        return NextResponse.json(
          {
            email,
            verificationRequired: true,
            paymentRequired: true,
            paymentPending: true,
            paymentMethod: "BANK_TRANSFER",
            transferReference,
          },
          { status: 201 },
        );
      }

      const forwarded = request.headers
        .get("x-forwarded-for")
        ?.split(",")[0]
        ?.trim();

      const customerIp = forwarded || "127.0.0.1";

      try {
        const order = await createPayUOrder({
          extOrderId,
          customerIp,
          description: `DocFlow ${data.plan}`,

          totalAmount: plan.gross,

          email,

          firstName: data.firstName,

          lastName: data.lastName,

          locale: data.locale,
        });

        redirectUri = order.redirectUri;

        await prisma.payment.update({
          where: {
            id: payment.id,
          },

          data: {
            providerOrderId: order.orderId,
          },
        });
      } catch (error) {
        await prisma.payment.update({
          where: {
            id: payment.id,
          },

          data: {
            status: "FAILED",
          },
        });

        throw error;
      }
    }

    return NextResponse.json(
      {
        email,
        verificationRequired: true,
        paymentRequired: data.plan !== "FREE",
        redirectUri,
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
