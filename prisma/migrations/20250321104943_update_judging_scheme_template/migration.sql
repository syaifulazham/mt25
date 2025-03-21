/*
  Warnings:

  - You are about to drop the column `userId` on the `judging` table. All the data in the column will be lost.
  - Added the required column `judgeId` to the `Judging` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE `judging` DROP FOREIGN KEY `Judging_userId_fkey`;

-- AlterTable
ALTER TABLE `contest` ADD COLUMN `judgingTemplateId` INTEGER NULL;

-- AlterTable
ALTER TABLE `judging` DROP COLUMN `userId`,
    ADD COLUMN `judgeId` INTEGER NOT NULL;

-- CreateTable
CREATE TABLE `JudgingCriteriaScore` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `judgingId` INTEGER NOT NULL,
    `criteriaName` VARCHAR(191) NOT NULL,
    `criteriaDescription` VARCHAR(191) NULL,
    `evaluationType` ENUM('POINTS', 'TIME', 'DISCRETE') NOT NULL,
    `weight` INTEGER NOT NULL,
    `score` DOUBLE NOT NULL,
    `feedback` VARCHAR(191) NULL,
    `discreteValue` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `JudgingTemplate` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `isDefault` BOOLEAN NOT NULL DEFAULT false,
    `contestType` ENUM('QUIZ', 'CODING', 'STRUCTURE_BUILDING', 'FASTEST_COMPLETION', 'POSTER_PRESENTATION', 'SCIENCE_PROJECT', 'ENGINEERING_DESIGN', 'ANALYSIS_CHALLENGE') NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `JudgingTemplateCriteria` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `needsJuryCourtesy` BOOLEAN NOT NULL DEFAULT false,
    `evaluationType` ENUM('POINTS', 'TIME', 'DISCRETE') NOT NULL,
    `weight` INTEGER NOT NULL DEFAULT 1,
    `maxScore` INTEGER NULL,
    `discreteValues` VARCHAR(191) NULL,
    `templateId` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Contest` ADD CONSTRAINT `Contest_judgingTemplateId_fkey` FOREIGN KEY (`judgingTemplateId`) REFERENCES `JudgingTemplate`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Judging` ADD CONSTRAINT `Judging_judgeId_fkey` FOREIGN KEY (`judgeId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `JudgingCriteriaScore` ADD CONSTRAINT `JudgingCriteriaScore_judgingId_fkey` FOREIGN KEY (`judgingId`) REFERENCES `Judging`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `JudgingTemplateCriteria` ADD CONSTRAINT `JudgingTemplateCriteria_templateId_fkey` FOREIGN KEY (`templateId`) REFERENCES `JudgingTemplate`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
