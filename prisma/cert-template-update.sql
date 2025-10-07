-- Add target audience fields to cert_template table
ALTER TABLE `cert_template` 
ADD COLUMN `targetType` ENUM('GENERAL', 'EVENT_PARTICIPANT', 'EVENT_WINNER') NOT NULL DEFAULT 'GENERAL',
ADD COLUMN `eventId` INT NULL,
ADD COLUMN `winnerRangeStart` INT NULL,
ADD COLUMN `winnerRangeEnd` INT NULL;

-- Add foreign key constraint to link with event table
ALTER TABLE `cert_template` 
ADD CONSTRAINT `fk_cert_template_event` 
FOREIGN KEY (`eventId`) 
REFERENCES `event`(`id`) 
ON DELETE SET NULL 
ON UPDATE CASCADE;

-- Add indexes for better performance
CREATE INDEX `idx_cert_template_targetType` ON `cert_template`(`targetType`);
CREATE INDEX `idx_cert_template_eventId` ON `cert_template`(`eventId`);

-- Update any existing templates to be GENERAL type
UPDATE `cert_template` SET `targetType` = 'GENERAL' WHERE `targetType` IS NULL;
