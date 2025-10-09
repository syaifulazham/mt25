-- Add eventId column to cert_template table
ALTER TABLE `cert_template` 
ADD COLUMN `eventId` INT NULL DEFAULT NULL;

-- Add index for the new column
CREATE INDEX `idx_cert_template_eventId` ON `cert_template` (`eventId`);

-- Add winnerRangeStart and winnerRangeEnd columns
ALTER TABLE `cert_template` 
ADD COLUMN `winnerRangeStart` INT NULL DEFAULT NULL,
ADD COLUMN `winnerRangeEnd` INT NULL DEFAULT NULL;
