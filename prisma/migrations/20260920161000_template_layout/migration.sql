ALTER TABLE "Template" ADD COLUMN "headerContent" TEXT;
ALTER TABLE "Template" ADD COLUMN "footerContent" TEXT;
ALTER TABLE "Template" ADD COLUMN "pageNumbers" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Document" ADD COLUMN "renderedHeader" TEXT;
ALTER TABLE "Document" ADD COLUMN "renderedFooter" TEXT;
ALTER TABLE "Document" ADD COLUMN "pageNumbers" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Document" ALTER COLUMN "templateId" DROP NOT NULL;
ALTER TABLE "Document" DROP CONSTRAINT IF EXISTS "Document_templateId_fkey";
ALTER TABLE "Document" ADD CONSTRAINT "Document_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "Template"("id") ON DELETE SET NULL ON UPDATE CASCADE;
