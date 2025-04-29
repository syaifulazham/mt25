-- Drop foreign key constraints on question_bank and quiz tables
ALTER TABLE `question_bank` DROP FOREIGN KEY `question_bank_target_group_fkey`;
ALTER TABLE `quiz` DROP FOREIGN KEY `quiz_target_group_fkey`;
