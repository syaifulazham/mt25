-- Step 1: Create the target_group table
CREATE TABLE `target_group` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(191) NOT NULL,
  `display_name` VARCHAR(191) NOT NULL,
  `sort_order` INTEGER NOT NULL DEFAULT 0,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `target_group_name_key`(`name`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Step 2: Seed initial target groups plus existing values from the database
INSERT INTO `target_group` (`name`, `display_name`, `sort_order`, `createdAt`, `updatedAt`) 
VALUES 
  ('PRIMARY', 'Primary School', 1, NOW(), NOW()),
  ('SECONDARY', 'Secondary School', 2, NOW(), NOW()),
  ('HIGHER', 'Higher Education', 3, NOW(), NOW());

-- Step 3: Insert any additional target groups from existing data
INSERT IGNORE INTO `target_group` (`name`, `display_name`, `sort_order`, `createdAt`, `updatedAt`)
SELECT DISTINCT target_group, target_group, 10, NOW(), NOW() 
FROM `question_bank`
WHERE target_group NOT IN ('PRIMARY', 'SECONDARY', 'HIGHER');

INSERT IGNORE INTO `target_group` (`name`, `display_name`, `sort_order`, `createdAt`, `updatedAt`)
SELECT DISTINCT target_group, target_group, 10, NOW(), NOW() 
FROM `quiz`
WHERE target_group NOT IN ('PRIMARY', 'SECONDARY', 'HIGHER') 
  AND target_group NOT IN (SELECT name FROM `target_group`);

-- Step 4: Now we can safely add the foreign key constraints
-- CreateIndex for quiz table
CREATE INDEX `quiz_target_group_relation_idx` ON `quiz`(`target_group`);

-- AddForeignKey constraints
ALTER TABLE `question_bank` ADD CONSTRAINT `question_bank_target_group_fkey` FOREIGN KEY (`target_group`) REFERENCES `target_group`(`name`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `quiz` ADD CONSTRAINT `quiz_target_group_fkey` FOREIGN KEY (`target_group`) REFERENCES `target_group`(`name`) ON DELETE RESTRICT ON UPDATE CASCADE;
