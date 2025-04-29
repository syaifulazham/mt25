-- Drop the foreign key constraint first
ALTER TABLE `question_bank` DROP FOREIGN KEY `question_bank_createdBy_fkey`;

-- Then modify the column type
ALTER TABLE `question_bank` MODIFY `createdBy` VARCHAR(255) NULL;
