/*
  Warnings:

  - You are about to drop the column `userId` on the `contingent` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE `contingent` DROP FOREIGN KEY `Contingent_userId_fkey`;

-- DropIndex
DROP INDEX `Contingent_userId_fkey` ON `contingent`;

-- AlterTable
ALTER TABLE `contingent` DROP COLUMN `userId`;

-- CreateTable
CREATE TABLE `contingentManager` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `contingentId` INTEGER NOT NULL,
    `isOwner` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `contingentManager_userId_idx`(`userId`),
    INDEX `contingentManager_contingentId_idx`(`contingentId`),
    UNIQUE INDEX `contingentManager_userId_contingentId_key`(`userId`, `contingentId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `contingentManager` ADD CONSTRAINT `contingentManager_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `contingentManager` ADD CONSTRAINT `contingentManager_contingentId_fkey` FOREIGN KEY (`contingentId`) REFERENCES `contingent`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
