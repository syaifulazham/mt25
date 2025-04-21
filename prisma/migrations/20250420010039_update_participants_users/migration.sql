-- AlterTable
ALTER TABLE `contestant` ADD COLUMN `participantId` INTEGER NULL;

-- AlterTable
ALTER TABLE `contingent` ADD COLUMN `participantId` INTEGER NULL;

-- AlterTable
ALTER TABLE `submission` ADD COLUMN `participantId` INTEGER NULL;

-- AlterTable
ALTER TABLE `user` MODIFY `role` ENUM('ADMIN', 'OPERATOR', 'VIEWER', 'PARTICIPANT', 'JUDGE') NOT NULL DEFAULT 'ADMIN';

-- CreateTable
CREATE TABLE `user_participant` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NULL,
    `email` VARCHAR(191) NOT NULL,
    `password` VARCHAR(191) NULL,
    `username` VARCHAR(191) NOT NULL,
    `ic` VARCHAR(191) NULL,
    `phoneNumber` VARCHAR(191) NULL,
    `gender` VARCHAR(191) NULL,
    `dateOfBirth` DATETIME(3) NULL,
    `schoolId` INTEGER NULL,
    `higherInstId` INTEGER NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `lastLogin` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `user_participant_email_key`(`email`),
    UNIQUE INDEX `user_participant_username_key`(`username`),
    INDEX `user_participant_schoolId_idx`(`schoolId`),
    INDEX `user_participant_higherInstId_idx`(`higherInstId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `contestant_participantId_idx` ON `contestant`(`participantId`);

-- CreateIndex
CREATE INDEX `contingent_participantId_idx` ON `contingent`(`participantId`);

-- CreateIndex
CREATE INDEX `submission_participantId_idx` ON `submission`(`participantId`);

-- AddForeignKey
ALTER TABLE `contingent` ADD CONSTRAINT `contingent_participantId_fkey` FOREIGN KEY (`participantId`) REFERENCES `user_participant`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `contestant` ADD CONSTRAINT `contestant_participantId_fkey` FOREIGN KEY (`participantId`) REFERENCES `user_participant`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `submission` ADD CONSTRAINT `submission_participantId_fkey` FOREIGN KEY (`participantId`) REFERENCES `user_participant`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_participant` ADD CONSTRAINT `user_participant_schoolId_fkey` FOREIGN KEY (`schoolId`) REFERENCES `school`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_participant` ADD CONSTRAINT `user_participant_higherInstId_fkey` FOREIGN KEY (`higherInstId`) REFERENCES `higherinstitution`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
