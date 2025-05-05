-- CreateTable
CREATE TABLE `manager` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `ic` VARCHAR(191) NOT NULL,
    `hashcode` VARCHAR(191) NOT NULL,
    `teamId` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `createdBy` INTEGER NOT NULL,

    UNIQUE INDEX `manager_hashcode_key`(`hashcode`),
    INDEX `manager_teamId_idx`(`teamId`),
    INDEX `manager_createdBy_idx`(`createdBy`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `manager` ADD CONSTRAINT `manager_teamId_fkey` FOREIGN KEY (`teamId`) REFERENCES `team`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `manager` ADD CONSTRAINT `manager_createdBy_fkey` FOREIGN KEY (`createdBy`) REFERENCES `user_participant`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
