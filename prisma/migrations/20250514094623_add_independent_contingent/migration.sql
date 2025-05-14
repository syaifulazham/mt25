-- AlterTable
ALTER TABLE `contingent` ADD COLUMN `contingentType` VARCHAR(191) NOT NULL DEFAULT 'SCHOOL',
    ADD COLUMN `independentId` INTEGER NULL;

-- CreateTable
CREATE TABLE `independent` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `address` VARCHAR(191) NULL,
    `town` VARCHAR(191) NULL,
    `postcode` VARCHAR(191) NULL,
    `stateId` INTEGER NOT NULL,
    `institution` VARCHAR(191) NULL,
    `type` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `independent_stateId_idx`(`stateId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `contingent_independentId_idx` ON `contingent`(`independentId`);

-- AddForeignKey
ALTER TABLE `independent` ADD CONSTRAINT `independent_stateId_fkey` FOREIGN KEY (`stateId`) REFERENCES `state`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `contingent` ADD CONSTRAINT `contingent_independentId_fkey` FOREIGN KEY (`independentId`) REFERENCES `independent`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
