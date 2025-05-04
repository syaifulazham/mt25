/*
  Warnings:

  - You are about to drop the column `hashcode` on the `contestant` table. All the data in the column will be lost.
  - You are about to drop the column `updatedBy` on the `contestant` table. All the data in the column will be lost.
  - Made the column `name` on table `user_participant` required. This step will fail if there are existing NULL values in that column.

*/
-- DropIndex
DROP INDEX `contestant_hashcode_key` ON `contestant`;

-- DropIndex
DROP INDEX `contestant_ic_key` ON `contestant`;

-- AlterTable
ALTER TABLE `contestant` DROP COLUMN `hashcode`,
    DROP COLUMN `updatedBy`,
    ADD COLUMN `birthdate` DATETIME(3) NULL,
    ADD COLUMN `createdById` INTEGER NULL,
    ADD COLUMN `updatedById` INTEGER NULL,
    MODIFY `ic` VARCHAR(191) NULL,
    MODIFY `age` INTEGER NULL;

-- AlterTable
ALTER TABLE `user_participant` MODIFY `name` VARCHAR(191) NOT NULL;

-- CreateTable
CREATE TABLE `team` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `hashcode` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `contestId` INTEGER NOT NULL,
    `contingentId` INTEGER NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'ACTIVE',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `maxMembers` INTEGER NOT NULL DEFAULT 4,

    UNIQUE INDEX `team_hashcode_key`(`hashcode`),
    INDEX `team_contestId_idx`(`contestId`),
    INDEX `team_contingentId_idx`(`contingentId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `teamManager` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `teamId` INTEGER NOT NULL,
    `participantId` INTEGER NOT NULL,
    `isOwner` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `teamManager_teamId_idx`(`teamId`),
    INDEX `teamManager_participantId_idx`(`participantId`),
    UNIQUE INDEX `teamManager_teamId_participantId_key`(`teamId`, `participantId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `teamMember` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `teamId` INTEGER NOT NULL,
    `contestantId` INTEGER NOT NULL,
    `role` VARCHAR(191) NULL,
    `joinedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `teamMember_teamId_idx`(`teamId`),
    INDEX `teamMember_contestantId_idx`(`contestantId`),
    UNIQUE INDEX `teamMember_teamId_contestantId_key`(`teamId`, `contestantId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `team` ADD CONSTRAINT `team_contestId_fkey` FOREIGN KEY (`contestId`) REFERENCES `contest`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `team` ADD CONSTRAINT `team_contingentId_fkey` FOREIGN KEY (`contingentId`) REFERENCES `contingent`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `teamManager` ADD CONSTRAINT `teamManager_teamId_fkey` FOREIGN KEY (`teamId`) REFERENCES `team`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `teamManager` ADD CONSTRAINT `teamManager_participantId_fkey` FOREIGN KEY (`participantId`) REFERENCES `user_participant`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `teamMember` ADD CONSTRAINT `teamMember_teamId_fkey` FOREIGN KEY (`teamId`) REFERENCES `team`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `teamMember` ADD CONSTRAINT `teamMember_contestantId_fkey` FOREIGN KEY (`contestantId`) REFERENCES `contestant`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
