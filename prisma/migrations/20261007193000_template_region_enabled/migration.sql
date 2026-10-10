ALTER TABLE "Template" ADD COLUMN "headerEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Template" ADD COLUMN "footerEnabled" BOOLEAN NOT NULL DEFAULT false;

UPDATE "Template" SET "headerEnabled" = true WHERE COALESCE("headerContent", '') <> '';
UPDATE "Template" SET "footerEnabled" = true WHERE COALESCE("footerContent", '') <> '';
