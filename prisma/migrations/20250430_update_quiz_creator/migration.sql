-- Modify the createdBy column in quiz to be VARCHAR instead of INT
ALTER TABLE `quiz` MODIFY `createdBy` VARCHAR(255) NULL;
