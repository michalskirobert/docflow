import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
const db = new PrismaClient();
const templates = [
  {
    name: "Employment agreement",
    description: "Simple employment contract",
    content:
      "EMPLOYMENT AGREEMENT\n\nEmployee: {{employeeName}}\nPosition: {{position}}\nStart date: {{startDate}}\nSalary: {{salary}} PLN\n\nEmployer: {{companyName}}",
  },
  {
    name: "NDA",
    description: "Mutual confidentiality agreement",
    content:
      "NON-DISCLOSURE AGREEMENT\n\nBetween {{companyName}} and {{counterpartyName}} effective {{effectiveDate}}.\nConfidentiality period: {{periodYears}} years.",
  },
  {
    name: "Equipment handover",
    description: "Equipment acceptance protocol",
    content:
      "EQUIPMENT HANDOVER PROTOCOL\n\nRecipient: {{employeeName}}\nDevice: {{deviceName}}\nSerial number: {{serialNumber}}\nDate: {{handoverDate}}",
  },
  {
    name: "Service offer",
    description: "Reusable commercial offer",
    content:
      "COMMERCIAL OFFER\n\nCustomer: {{customerName}}\nService: {{serviceName}}\nNet price: {{netPrice}} PLN\nValid until: {{validUntil}}",
  },
];
const vars = (s: string) =>
  JSON.stringify(
    [...s.matchAll(/{{\s*([\w.]+)\s*}}/g)]
      .map((m) => m[1])
      .filter((v, i, a) => a.indexOf(v) === i),
  );
async function main() {
  const email = process.env.SEED_ADMIN_EMAIL ?? "owner@example.com";
  const password = process.env.SEED_ADMIN_PASSWORD ?? "ChangeMe123!";
  const user = await db.user.upsert({
    where: { email },
    update: {},
    create: {
      email,
      name: process.env.SEED_ADMIN_NAME ?? "Owner",
      passwordHash: await bcrypt.hash(password, 12),
    },
  });
  let membership = await db.membership.findFirst({
    where: { userId: user.id },
    include: { organization: true },
  });
  if (!membership) {
    const org = await db.organization.create({
      data: { name: process.env.SEED_ORGANIZATION_NAME ?? "Demo Company" },
    });
    membership = await db.membership.create({
      data: { userId: user.id, organizationId: org.id, role: "OWNER" },
      include: { organization: true },
    });
    const days = Number(process.env.DEFAULT_TRIAL_DAYS ?? 30);
    await db.subscription.create({
      data: {
        organizationId: org.id,
        status: "TRIALING",
        trialEndsAt: new Date(Date.now() + days * 86400000),
        monthlyDocumentLimit: Number(
          process.env.DEFAULT_MONTHLY_DOCUMENT_LIMIT ?? 100,
        ),
      },
    });
  }
  const count = await db.template.count({
    where: { organizationId: membership.organizationId },
  });
  if (!count)
    await db.template.createMany({
      data: templates.map((t) => ({
        ...t,
        organizationId: membership!.organizationId,
        variablesJson: vars(t.content),
        isExample: true,
      })),
    });
  console.log(`Seeded ${email}`);
}
main().finally(() => db.$disconnect());
