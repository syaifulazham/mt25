/*
  Warnings:

  - You are about to drop the column `stateId` on the `event` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE `event` DROP FOREIGN KEY `Event_stateId_fkey`;

-- DropIndex
DROP INDEX `Event_stateId_fkey` ON `event`;

-- AlterTable
ALTER TABLE `event` DROP COLUMN `stateId`,
    ADD COLUMN `state` VARCHAR(191) NULL;
