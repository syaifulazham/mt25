-- Drop existing foreign key constraints and indexes
ALTER TABLE `contingentManager` DROP FOREIGN KEY `contingentManager_userId_fkey`;
ALTER TABLE `contingentManager` DROP INDEX `contingentManager_userId_contingentId_key`;
ALTER TABLE `contingentManager` DROP INDEX `contingentManager_userId_idx`;

-- Rename userId column to participantId
ALTER TABLE `contingentManager` CHANGE COLUMN `userId` `participantId` INT NOT NULL;

-- Add new foreign key constraint to user_participant table
ALTER TABLE `contingentManager` ADD CONSTRAINT `contingentManager_participantId_fkey` 
FOREIGN KEY (`participantId`) REFERENCES `user_participant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- Add new unique constraint and index
ALTER TABLE `contingentManager` ADD UNIQUE INDEX `contingentManager_participantId_contingentId_key` (`participantId`, `contingentId`);
ALTER TABLE `contingentManager` ADD INDEX `contingentManager_participantId_idx` (`participantId`);
