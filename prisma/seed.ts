import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
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
  console.log({ user: user.email, organization: org.name });
}
main().finally(() => prisma.$disconnect());
