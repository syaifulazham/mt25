-- AlterTable
ALTER TABLE `team` ADD COLUMN `eventcontestId` INTEGER NULL;

-- CreateTable
CREATE TABLE `eventcontest` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `eventId` INTEGER NOT NULL,
    `contestId` INTEGER NOT NULL,
    `maxteampercontingent` INTEGER NOT NULL DEFAULT 1,
    `person_incharge` VARCHAR(191) NULL,
    `person_incharge_phone` VARCHAR(191) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `eventcontest_eventId_idx`(`eventId`),
    INDEX `eventcontest_contestId_idx`(`contestId`),
    UNIQUE INDEX `eventcontest_eventId_contestId_key`(`eventId`, `contestId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `eventcontestjudge` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `eventcontestId` INTEGER NOT NULL,
    `userId` INTEGER NOT NULL,
    `isChiefJudge` BOOLEAN NOT NULL DEFAULT false,
    `notes` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `eventcontestjudge_eventcontestId_idx`(`eventcontestId`),
    INDEX `eventcontestjudge_userId_idx`(`userId`),
    UNIQUE INDEX `eventcontestjudge_eventcontestId_userId_key`(`eventcontestId`, `userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `team_eventcontestId_idx` ON `team`(`eventcontestId`);

-- AddForeignKey
ALTER TABLE `eventcontest` ADD CONSTRAINT `eventcontest_eventId_fkey` FOREIGN KEY (`eventId`) REFERENCES `event`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `eventcontest` ADD CONSTRAINT `eventcontest_contestId_fkey` FOREIGN KEY (`contestId`) REFERENCES `contest`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `eventcontestjudge` ADD CONSTRAINT `eventcontestjudge_eventcontestId_fkey` FOREIGN KEY (`eventcontestId`) REFERENCES `eventcontest`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `eventcontestjudge` ADD CONSTRAINT `eventcontestjudge_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `team` ADD CONSTRAINT `team_eventcontestId_fkey` FOREIGN KEY (`eventcontestId`) REFERENCES `eventcontest`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
