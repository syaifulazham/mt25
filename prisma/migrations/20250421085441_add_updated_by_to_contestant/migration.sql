/*
  Warnings:

  - You are about to drop the column `participantId` on the `contestant` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `contestant` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE `contestant` DROP FOREIGN KEY `contestant_contingentId_fkey`;

-- DropForeignKey
ALTER TABLE `contestant` DROP FOREIGN KEY `contestant_participantId_fkey`;

-- DropForeignKey
ALTER TABLE `contestant` DROP FOREIGN KEY `contestant_userId_fkey`;

-- DropForeignKey
ALTER TABLE `submission` DROP FOREIGN KEY `Submission_userId_fkey`;

-- DropIndex
DROP INDEX `contestant_participantId_idx` ON `contestant`;

-- DropIndex
DROP INDEX `contestant_userId_idx` ON `contestant`;

-- AlterTable
ALTER TABLE `contestant` DROP COLUMN `participantId`,
    DROP COLUMN `userId`,
    ADD COLUMN `email` VARCHAR(191) NULL,
    ADD COLUMN `phoneNumber` VARCHAR(191) NULL,
    ADD COLUMN `status` VARCHAR(191) NOT NULL DEFAULT 'ACTIVE',
    ADD COLUMN `updatedBy` VARCHAR(191) NULL,
    MODIFY `class_grade` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `submission` ADD COLUMN `contestantId` INTEGER NULL,
    MODIFY `userId` INTEGER NULL;

-- CreateIndex
CREATE INDEX `submission_contestantId_idx` ON `submission`(`contestantId`);

-- AddForeignKey
ALTER TABLE `contestant` ADD CONSTRAINT `contestant_contingentId_fkey` FOREIGN KEY (`contingentId`) REFERENCES `contingent`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `submission` ADD CONSTRAINT `Submission_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `submission` ADD CONSTRAINT `submission_contestantId_fkey` FOREIGN KEY (`contestantId`) REFERENCES `contestant`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
