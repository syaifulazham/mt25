/*
  Warnings:

  - You are about to drop the column `sortOrder` on the `referencedata` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `result` table. All the data in the column will be lost.
  - You are about to drop the column `googleId` on the `user` table. All the data in the column will be lost.
  - You are about to drop the column `refreshToken` on the `user` table. All the data in the column will be lost.
  - Made the column `username` on table `user` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE `result` DROP FOREIGN KEY `Result_userId_fkey`;

-- DropIndex
DROP INDEX `ReferenceData_type_isActive_idx` ON `referencedata`;

-- DropIndex
DROP INDEX `User_googleId_key` ON `user`;

-- AlterTable
ALTER TABLE `referencedata` DROP COLUMN `sortOrder`;

-- AlterTable
ALTER TABLE `result` DROP COLUMN `userId`;

-- AlterTable
ALTER TABLE `user` DROP COLUMN `googleId`,
    DROP COLUMN `refreshToken`,
    MODIFY `name` VARCHAR(191) NULL,
    MODIFY `role` ENUM('ADMIN', 'OPERATOR', 'VIEWER', 'PARTICIPANT', 'JUDGE') NOT NULL DEFAULT 'PARTICIPANT',
    MODIFY `username` VARCHAR(191) NOT NULL;
