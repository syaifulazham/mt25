/*
  Warnings:

  - You are about to drop the column `contestId` on the `contingent` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE `contingent` DROP FOREIGN KEY `Contingent_contestId_fkey`;

-- DropIndex
DROP INDEX `Contingent_contestId_fkey` ON `contingent`;

-- AlterTable
ALTER TABLE `contingent` DROP COLUMN `contestId`;

-- CreateTable
CREATE TABLE `contestParticipation` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `contestId` INTEGER NOT NULL,
    `contestantId` INTEGER NOT NULL,
    `registeredAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `status` VARCHAR(191) NOT NULL DEFAULT 'REGISTERED',
    `notes` VARCHAR(191) NULL,

    INDEX `contestParticipation_contestId_idx`(`contestId`),
    INDEX `contestParticipation_contestantId_idx`(`contestantId`),
    UNIQUE INDEX `contestParticipation_contestId_contestantId_key`(`contestId`, `contestantId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `contestParticipation` ADD CONSTRAINT `contestParticipation_contestId_fkey` FOREIGN KEY (`contestId`) REFERENCES `contest`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `contestParticipation` ADD CONSTRAINT `contestParticipation_contestantId_fkey` FOREIGN KEY (`contestantId`) REFERENCES `contestant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
