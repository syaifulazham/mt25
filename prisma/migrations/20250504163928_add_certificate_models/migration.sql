-- CreateEnum
CREATE TYPE "Status" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateTable
CREATE TABLE "cert_template" (
  "id" SERIAL NOT NULL,
  "templateName" VARCHAR(255) NOT NULL,
  "basePdfPath" VARCHAR(1000),
  "configuration" JSONB NOT NULL,
  "status" "Status" NOT NULL DEFAULT 'ACTIVE',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "createdBy" INTEGER NOT NULL,
  "updatedBy" INTEGER,

  CONSTRAINT "cert_template_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "certificate" (
  "id" SERIAL NOT NULL,
  "templateId" INTEGER NOT NULL,
  "recipientName" VARCHAR(255) NOT NULL,
  "recipientEmail" VARCHAR(255),
  "recipientType" VARCHAR(50) NOT NULL,
  "contestName" VARCHAR(255),
  "awardTitle" VARCHAR(255),
  "uniqueCode" VARCHAR(50) NOT NULL,
  "filePath" VARCHAR(1000),
  "status" VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
  "issuedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "createdBy" INTEGER NOT NULL,

  CONSTRAINT "certificate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "cert_template_templateName_idx" ON "cert_template"("templateName");

-- CreateIndex
CREATE INDEX "cert_template_status_idx" ON "cert_template"("status");

-- CreateIndex
CREATE INDEX "cert_template_createdAt_idx" ON "cert_template"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "certificate_uniqueCode_key" ON "certificate"("uniqueCode");

-- CreateIndex
CREATE INDEX "certificate_templateId_idx" ON "certificate"("templateId");

-- CreateIndex
CREATE INDEX "certificate_recipientName_idx" ON "certificate"("recipientName");

-- CreateIndex
CREATE INDEX "certificate_recipientEmail_idx" ON "certificate"("recipientEmail");

-- CreateIndex
CREATE INDEX "certificate_status_idx" ON "certificate"("status");

-- CreateIndex
CREATE INDEX "certificate_createdAt_idx" ON "certificate"("createdAt");

-- AddForeignKey
ALTER TABLE "cert_template" ADD CONSTRAINT "cert_template_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cert_template" ADD CONSTRAINT "cert_template_updatedBy_fkey" FOREIGN KEY ("updatedBy") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "certificate" ADD CONSTRAINT "certificate_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "cert_template"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "certificate" ADD CONSTRAINT "certificate_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
