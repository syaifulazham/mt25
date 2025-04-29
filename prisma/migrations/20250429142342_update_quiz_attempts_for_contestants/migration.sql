/*
  Warnings:

  - You are about to drop the column `participantId` on the `quiz_attempt` table. All the data in the column will be lost.
  - Added the required column `contestantId` to the `quiz_attempt` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE `quiz_attempt` DROP FOREIGN KEY `quiz_attempt_participantId_fkey`;

-- DropIndex
DROP INDEX `quiz_attempt_participantId_fkey` ON `quiz_attempt`;

-- AlterTable
ALTER TABLE `quiz_attempt` DROP COLUMN `participantId`,
    ADD COLUMN `contestantId` INTEGER NOT NULL;

-- CreateIndex
CREATE INDEX `quiz_attempt_contestantId_idx` ON `quiz_attempt`(`contestantId`);

-- AddForeignKey
ALTER TABLE `quiz_attempt` ADD CONSTRAINT `quiz_attempt_contestantId_fkey` FOREIGN KEY (`contestantId`) REFERENCES `contestant`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- RenameIndex
ALTER TABLE `quiz_attempt` RENAME INDEX `quiz_attempt_quizId_fkey` TO `quiz_attempt_quizId_idx`;
