/*
  Warnings:

  - The values [PARTICIPANT] on the enum `user_role` will be removed. If these variants are still used in the database, this will fail.
  - Made the column `contingentId` on table `contestant` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE `contestant` DROP FOREIGN KEY `contestant_contingentId_fkey`;

-- DropForeignKey
ALTER TABLE `contingent` DROP FOREIGN KEY `Contingent_schoolId_fkey`;

-- DropForeignKey
ALTER TABLE `contingent` DROP FOREIGN KEY `Contingent_userId_fkey`;

-- AlterTable
ALTER TABLE `contestant` ADD COLUMN `class_grade` INTEGER NULL,
    MODIFY `contingentId` INTEGER NOT NULL;

-- AlterTable
ALTER TABLE `contingent` ADD COLUMN `higherInstId` INTEGER NULL,
    ADD COLUMN `managedByParticipant` BOOLEAN NOT NULL DEFAULT true,
    MODIFY `userId` INTEGER NULL,
    MODIFY `schoolId` INTEGER NULL;

-- AlterTable
ALTER TABLE `user` MODIFY `role` ENUM('ADMIN', 'OPERATOR', 'VIEWER', 'PARTICIPANTS_MANAGER', 'JUDGE') NOT NULL DEFAULT 'ADMIN';

-- CreateTable
CREATE TABLE `contingentRequest` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `contingentId` INTEGER NOT NULL,
    `participantId` INTEGER NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'PENDING',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `contingentRequest_contingentId_idx`(`contingentId`),
    INDEX `contingentRequest_participantId_idx`(`participantId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `contingent_higherInstId_idx` ON `contingent`(`higherInstId`);

-- AddForeignKey
ALTER TABLE `contingent` ADD CONSTRAINT `Contingent_schoolId_fkey` FOREIGN KEY (`schoolId`) REFERENCES `school`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `contingent` ADD CONSTRAINT `contingent_higherInstId_fkey` FOREIGN KEY (`higherInstId`) REFERENCES `higherinstitution`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `contingent` ADD CONSTRAINT `Contingent_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `contestant` ADD CONSTRAINT `contestant_contingentId_fkey` FOREIGN KEY (`contingentId`) REFERENCES `contingent`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `contingentRequest` ADD CONSTRAINT `contingentRequest_contingentId_fkey` FOREIGN KEY (`contingentId`) REFERENCES `contingent`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `contingentRequest` ADD CONSTRAINT `contingentRequest_participantId_fkey` FOREIGN KEY (`participantId`) REFERENCES `user_participant`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
