-- Add targetType column to cert_template table
ALTER TABLE `cert_template` 
ADD COLUMN `targetType` ENUM('GENERAL', 'EVENT_PARTICIPANT', 'EVENT_WINNER') NOT NULL DEFAULT 'GENERAL';

-- Add index for the new column
CREATE INDEX `idx_cert_template_targetType` ON `cert_template` (`targetType`);
