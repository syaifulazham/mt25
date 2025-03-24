/*
  Warnings:

  - You are about to drop the column `state` on the `event` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `event` DROP COLUMN `state`,
    ADD COLUMN `addressState` VARCHAR(191) NULL;
