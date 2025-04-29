-- Modify the createdBy column in question_bank to be VARCHAR instead of INT
ALTER TABLE `question_bank` MODIFY `createdBy` VARCHAR(255) NULL;
