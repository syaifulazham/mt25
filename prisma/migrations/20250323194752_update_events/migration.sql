-- AlterTable
ALTER TABLE `contest` ADD COLUMN `eventId` INTEGER NULL;

-- CreateTable
CREATE TABLE `event` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `startDate` DATETIME(3) NOT NULL,
    `endDate` DATETIME(3) NOT NULL,
    `venue` VARCHAR(191) NULL,
    `address` VARCHAR(191) NULL,
    `city` VARCHAR(191) NULL,
    `stateId` INTEGER NULL,
    `latitude` DOUBLE NULL,
    `longitude` DOUBLE NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Event_code_key`(`code`),
    INDEX `Event_stateId_fkey`(`stateId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `Contest_eventId_fkey` ON `contest`(`eventId`);

-- AddForeignKey
ALTER TABLE `contest` ADD CONSTRAINT `Contest_eventId_fkey` FOREIGN KEY (`eventId`) REFERENCES `event`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `event` ADD CONSTRAINT `Event_stateId_fkey` FOREIGN KEY (`stateId`) REFERENCES `state`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- RenameIndex
ALTER TABLE `_contesttotargetgroup` RENAME INDEX `_ContestToTargetGroup_AB_unique` TO `_contesttotargetgroup_AB_unique`;

-- RenameIndex
ALTER TABLE `_contesttotargetgroup` RENAME INDEX `_ContestToTargetGroup_B_index` TO `_contesttotargetgroup_B_index`;
