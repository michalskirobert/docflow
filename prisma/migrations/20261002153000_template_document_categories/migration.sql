ALTER TABLE "Template" ADD COLUMN "category" TEXT NOT NULL DEFAULT 'system:GENERAL';
ALTER TABLE "Document" ADD COLUMN "category" TEXT NOT NULL DEFAULT 'system:GENERAL';

CREATE TABLE "Category" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Category_organizationId_name_key" ON "Category"("organizationId", "name");
CREATE INDEX "Category_organizationId_idx" ON "Category"("organizationId");
ALTER TABLE "Category" ADD CONSTRAINT "Category_organizationId_fkey"
FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
