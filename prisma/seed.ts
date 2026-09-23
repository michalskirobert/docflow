import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import { EXAMPLE_TEMPLATES } from "../src/server/templates/examples";
const prisma = new PrismaClient();
async function main() {
  const email = process.env.SEED_ADMIN_EMAIL ?? "owner@example.com";
  const full = (process.env.SEED_ADMIN_NAME ?? "NurByte Owner")
    .trim()
    .split(/\s+/);
  const firstName = full[0] ?? "NurByte";
  const lastName = full.slice(1).join(" ") || "Owner";
  const passwordHash = await bcrypt.hash(
    process.env.SEED_ADMIN_PASSWORD ?? "ChangeMe123!",
    12,
  );
  const user = await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      email,
      firstName,
      lastName,
      passwordHash,
      emailVerifiedAt: new Date(),
      locale: "en",
    },
  });
  let org = await prisma.organization.findFirst({
    where: { memberships: { some: { userId: user.id } } },
  });
  if (!org) {
    org = await prisma.organization.create({
      data: {
        name: process.env.SEED_ORGANIZATION_NAME ?? "NurByte Demo",
        memberships: { create: { userId: user.id, role: "OWNER" } },
        subscription: {
          create: { plan: "FREE", status: "ACTIVE", monthlyDocumentLimit: 10 },
        },
      },
    });
  }
  const organizations = await prisma.organization.findMany({
    select: { id: true },
  });

  for (const targetOrg of organizations) {
    const legacyReception = await prisma.template.findFirst({
      where: {
        organizationId: targetOrg.id,
        name: "Protokół odbioru",
        isExample: true,
      },
    });

    if (legacyReception) {
      await prisma.template.update({
        where: { id: legacyReception.id },
        data: { name: "Protokół zdawczo-odbiorczy" },
      });
    }

    for (const template of EXAMPLE_TEMPLATES) {
      const existing = await prisma.template.findFirst({
        where: {
          organizationId: targetOrg.id,
          name: template.name,
          isExample: true,
        },
      });

      const data = {
        description: template.description,
        emailSubject: "emailSubject" in template ? template.emailSubject : null,
        content: template.content,
        variablesJson: JSON.stringify(template.variables),
        isExample: true,
      };

      if (existing) {
        await prisma.template.update({ where: { id: existing.id }, data });
      } else {
        await prisma.template.create({
          data: {
            organizationId: targetOrg.id,
            name: template.name,
            ...data,
          },
        });
      }
    }
  }

  console.log({ user: user.email, organization: org.name });
}
main().finally(() => prisma.$disconnect());
