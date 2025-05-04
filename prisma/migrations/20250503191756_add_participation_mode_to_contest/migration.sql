/*
  Warnings:

  - A unique constraint covering the columns `[hashcode]` on the table `contestant` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE `contest` ADD COLUMN `participation_mode` ENUM('INDIVIDUAL', 'TEAM') NOT NULL DEFAULT 'INDIVIDUAL';

-- AlterTable
ALTER TABLE `contestant` ADD COLUMN `hashcode` VARCHAR(191) NULL;

-- CreateIndex
CREATE UNIQUE INDEX `contestant_hashcode_key` ON `contestant`(`hashcode`);
