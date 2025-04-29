/*
  Warnings:

  - You are about to drop the column `description` on the `submission` table. All the data in the column will be lost.
  - You are about to drop the column `fileUrl` on the `submission` table. All the data in the column will be lost.
  - You are about to drop the column `title` on the `submission` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `quiz` ADD COLUMN `contestId` INTEGER NULL;

-- AlterTable
ALTER TABLE `quiz_attempt` ADD COLUMN `submissionId` INTEGER NULL;

-- AlterTable
ALTER TABLE `submission` DROP COLUMN `description`,
    DROP COLUMN `fileUrl`,
    DROP COLUMN `title`,
    ADD COLUMN `metadata` JSON NULL;

-- CreateIndex
CREATE INDEX `quiz_attempt_submissionId_idx` ON `quiz_attempt`(`submissionId`);

-- AddForeignKey
ALTER TABLE `quiz` ADD CONSTRAINT `quiz_contestId_fkey` FOREIGN KEY (`contestId`) REFERENCES `contest`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `quiz_attempt` ADD CONSTRAINT `quiz_attempt_submissionId_fkey` FOREIGN KEY (`submissionId`) REFERENCES `submission`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
