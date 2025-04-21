-- CreateTable
CREATE TABLE `contestant` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `ic` VARCHAR(191) NOT NULL,
    `gender` VARCHAR(191) NOT NULL,
    `age` INTEGER NOT NULL,
    `edu_level` VARCHAR(191) NOT NULL,
    `class_name` VARCHAR(191) NULL,
    `hashcode` VARCHAR(191) NOT NULL,
    `userId` INTEGER NOT NULL,
    `contingentId` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `contestant_ic_key`(`ic`),
    UNIQUE INDEX `contestant_hashcode_key`(`hashcode`),
    INDEX `contestant_userId_idx`(`userId`),
    INDEX `contestant_contingentId_idx`(`contingentId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `contestant` ADD CONSTRAINT `contestant_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `contestant` ADD CONSTRAINT `contestant_contingentId_fkey` FOREIGN KEY (`contingentId`) REFERENCES `contingent`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
