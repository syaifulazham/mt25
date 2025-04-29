-- CreateTable
CREATE TABLE `question_bank` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `target_group` VARCHAR(191) NOT NULL,
    `knowledge_field` VARCHAR(191) NOT NULL,
    `question` TEXT NOT NULL,
    `question_image` VARCHAR(191) NULL,
    `answer_type` VARCHAR(191) NOT NULL,
    `answer_options` JSON NOT NULL,
    `answer_correct` VARCHAR(191) NOT NULL,
    `createdBy` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `question_bank_createdBy_idx`(`createdBy`),
    INDEX `question_bank_knowledge_field_idx`(`knowledge_field`),
    INDEX `question_bank_target_group_idx`(`target_group`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `quiz` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `target_group` VARCHAR(191) NOT NULL,
    `quiz_name` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `time_limit` INTEGER NULL,
    `publishedAt` DATETIME(3) NULL,
    `status` VARCHAR(191) NOT NULL,
    `createdBy` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `quiz_createdBy_idx`(`createdBy`),
    INDEX `quiz_status_idx`(`status`),
    INDEX `quiz_target_group_idx`(`target_group`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `quiz_question` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `quizId` INTEGER NOT NULL,
    `questionId` INTEGER NOT NULL,
    `order` INTEGER NOT NULL,
    `points` INTEGER NOT NULL DEFAULT 1,

    INDEX `quiz_question_quizId_idx`(`quizId`),
    INDEX `quiz_question_questionId_idx`(`questionId`),
    UNIQUE INDEX `quiz_question_quizId_questionId_key`(`quizId`, `questionId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `question_bank` ADD CONSTRAINT `question_bank_createdBy_fkey` FOREIGN KEY (`createdBy`) REFERENCES `user_participant`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `quiz` ADD CONSTRAINT `quiz_createdBy_fkey` FOREIGN KEY (`createdBy`) REFERENCES `user_participant`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `quiz_question` ADD CONSTRAINT `quiz_question_quizId_fkey` FOREIGN KEY (`quizId`) REFERENCES `quiz`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `quiz_question` ADD CONSTRAINT `quiz_question_questionId_fkey` FOREIGN KEY (`questionId`) REFERENCES `question_bank`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
