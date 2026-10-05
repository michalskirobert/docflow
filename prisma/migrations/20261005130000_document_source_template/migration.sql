ALTER TABLE "Document" ADD COLUMN "sourceTemplateId" TEXT;
UPDATE "Document" SET "sourceTemplateId" = "templateId" WHERE "templateId" IS NOT NULL;
