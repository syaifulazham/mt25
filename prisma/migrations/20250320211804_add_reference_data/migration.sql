/*
  Warnings:

  - You are about to drop the column `hashcode` on the `contingent` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `judging` table. All the data in the column will be lost.
  - You are about to drop the column `judgeId` on the `judging` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `submission` table. All the data in the column will be lost.
  - Added the required column `contestId` to the `Contingent` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Contingent` table without a default value. This is not possible if the table is not empty.
  - Made the column `schoolId` on table `contingent` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `contestId` to the `Judging` table without a default value. This is not possible if the table is not empty.
  - Added the required column `userId` to the `Judging` table without a default value. This is not possible if the table is not empty.
  - Added the required column `judgingId` to the `Result` table without a default value. This is not possible if the table is not empty.
  - Added the required column `submissionId` to the `Result` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Result` table without a default value. This is not possible if the table is not empty.
  - Added the required column `category` to the `School` table without a default value. This is not possible if the table is not empty.
  - Added the required column `level` to the `School` table without a default value. This is not possible if the table is not empty.
  - Added the required column `title` to the `Submission` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE `contingent` DROP FOREIGN KEY `Contingent_schoolId_fkey`;

-- DropForeignKey
ALTER TABLE `judging` DROP FOREIGN KEY `Judging_judgeId_fkey`;

-- DropIndex
DROP INDEX `Contingent_hashcode_key` ON `contingent`;

-- AlterTable
ALTER TABLE `contingent` DROP COLUMN `hashcode`,
    ADD COLUMN `contestId` INTEGER NOT NULL,
    ADD COLUMN `description` VARCHAR(191) NULL,
    ADD COLUMN `updatedAt` DATETIME(3) NOT NULL,
    MODIFY `schoolId` INTEGER NOT NULL;

-- AlterTable
ALTER TABLE `judging` DROP COLUMN `createdAt`,
    DROP COLUMN `judgeId`,
    ADD COLUMN `contestId` INTEGER NOT NULL,
    ADD COLUMN `judgingTime` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    ADD COLUMN `userId` INTEGER NOT NULL;

-- AlterTable
ALTER TABLE `result` ADD COLUMN `judgingId` INTEGER NOT NULL,
    ADD COLUMN `submissionId` INTEGER NOT NULL,
    ADD COLUMN `updatedAt` DATETIME(3) NOT NULL,
    MODIFY `rank` INTEGER NULL;

-- AlterTable
ALTER TABLE `school` ADD COLUMN `category` VARCHAR(191) NOT NULL,
    ADD COLUMN `level` VARCHAR(191) NOT NULL;

-- AlterTable
ALTER TABLE `submission` DROP COLUMN `createdAt`,
    ADD COLUMN `description` VARCHAR(191) NULL,
    ADD COLUMN `submittedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    ADD COLUMN `title` VARCHAR(191) NOT NULL,
    MODIFY `fileUrl` VARCHAR(191) NULL,
    MODIFY `status` ENUM('PENDING', 'APPROVED', 'REJECTED') NOT NULL DEFAULT 'PENDING';

-- CreateTable
CREATE TABLE `ReferenceData` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `type` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `sortOrder` INTEGER NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `metadata` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `ReferenceData_type_isActive_idx`(`type`, `isActive`),
    UNIQUE INDEX `ReferenceData_type_code_key`(`type`, `code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Contingent` ADD CONSTRAINT `Contingent_contestId_fkey` FOREIGN KEY (`contestId`) REFERENCES `Contest`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Contingent` ADD CONSTRAINT `Contingent_schoolId_fkey` FOREIGN KEY (`schoolId`) REFERENCES `School`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Judging` ADD CONSTRAINT `Judging_contestId_fkey` FOREIGN KEY (`contestId`) REFERENCES `Contest`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Judging` ADD CONSTRAINT `Judging_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Result` ADD CONSTRAINT `Result_submissionId_fkey` FOREIGN KEY (`submissionId`) REFERENCES `Submission`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Result` ADD CONSTRAINT `Result_judgingId_fkey` FOREIGN KEY (`judgingId`) REFERENCES `Judging`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
