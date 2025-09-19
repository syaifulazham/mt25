-- Add relations to user model for certificate templates
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "created_templates" INTEGER[];
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "updated_templates" INTEGER[];

-- Update foreign key constraints to match relation names
ALTER TABLE "cert_template" DROP CONSTRAINT IF EXISTS "cert_template_createdBy_fkey";
ALTER TABLE "cert_template" ADD CONSTRAINT "cert_template_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "cert_template" DROP CONSTRAINT IF EXISTS "cert_template_updatedBy_fkey";
ALTER TABLE "cert_template" ADD CONSTRAINT "cert_template_updatedBy_fkey" FOREIGN KEY ("updatedBy") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Add relations to user model for certificates
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "created_certificates" INTEGER[];

ALTER TABLE "certificate" DROP CONSTRAINT IF EXISTS "certificate_createdBy_fkey";
ALTER TABLE "certificate" ADD CONSTRAINT "certificate_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
