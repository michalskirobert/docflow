CREATE TABLE "LicenseReminderDelivery" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "periodEndsAt" TIMESTAMP(3) NOT NULL,
    "kind" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LicenseReminderDelivery_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "LicenseReminderDelivery_periodEndsAt_idx" ON "LicenseReminderDelivery"("periodEndsAt");
CREATE UNIQUE INDEX "LicenseReminderDelivery_organizationId_periodEndsAt_kind_key" ON "LicenseReminderDelivery"("organizationId", "periodEndsAt", "kind");
ALTER TABLE "LicenseReminderDelivery" ADD CONSTRAINT "LicenseReminderDelivery_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
