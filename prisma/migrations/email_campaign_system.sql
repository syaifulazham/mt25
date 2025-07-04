-- Add email_campaign table
CREATE TABLE `email_campaign` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `campaign_name` VARCHAR(191) NOT NULL,
  `description` TEXT NULL,
  `status` VARCHAR(191) NOT NULL DEFAULT 'DRAFT',
  `template_id` INT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,
  `scheduled_datetime` DATETIME(3) NULL,
  `completed_datetime` DATETIME(3) NULL,
  `created_by` INT NULL,
  `total_recipients` INT NOT NULL DEFAULT 0,
  `successful_sends` INT NOT NULL DEFAULT 0,
  `failed_sends` INT NOT NULL DEFAULT 0,
  `open_count` INT NOT NULL DEFAULT 0,
  `click_count` INT NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  INDEX `email_campaign_template_id_idx` (`template_id`),
  CONSTRAINT `email_campaign_template_id_fkey` FOREIGN KEY (`template_id`) REFERENCES `email_template` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
);

-- Add email_recipient table
CREATE TABLE `email_recipient` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `campaign_id` INT NOT NULL,
  `email` VARCHAR(191) NOT NULL,
  `name` VARCHAR(191) NULL,
  `source` VARCHAR(191) NOT NULL DEFAULT 'MANUAL',
  `source_id` INT NULL,
  `status` VARCHAR(191) NOT NULL DEFAULT 'PENDING',
  `placeholders` JSON NULL,
  `sent_at` DATETIME(3) NULL,
  `opened_at` DATETIME(3) NULL,
  `clicked_at` DATETIME(3) NULL,
  PRIMARY KEY (`id`),
  INDEX `email_recipient_campaign_id_idx` (`campaign_id`),
  INDEX `email_recipient_email_idx` (`email`),
  CONSTRAINT `email_recipient_campaign_id_fkey` FOREIGN KEY (`campaign_id`) REFERENCES `email_campaign` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
);

-- Alter email_outgoing table to add new columns and relations
ALTER TABLE `email_outgoing`
  ADD COLUMN `campaign_id` INT NULL,
  ADD COLUMN `recipient_id` INT NULL,
  ADD COLUMN `tracking_id` VARCHAR(191) NULL,
  ADD COLUMN `open_count` INT NOT NULL DEFAULT 0,
  ADD COLUMN `click_count` INT NOT NULL DEFAULT 0,
  ADD COLUMN `first_opened_at` DATETIME(3) NULL,
  ADD COLUMN `last_opened_at` DATETIME(3) NULL,
  ADD COLUMN `first_clicked_at` DATETIME(3) NULL,
  ADD COLUMN `last_clicked_at` DATETIME(3) NULL,
  ADD UNIQUE INDEX `email_outgoing_recipient_id_key` (`recipient_id`),
  ADD UNIQUE INDEX `email_outgoing_tracking_id_key` (`tracking_id`),
  ADD INDEX `email_outgoing_campaign_id_idx` (`campaign_id`),
  ADD CONSTRAINT `email_outgoing_campaign_id_fkey` FOREIGN KEY (`campaign_id`) REFERENCES `email_campaign` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `email_outgoing_recipient_id_fkey` FOREIGN KEY (`recipient_id`) REFERENCES `email_recipient` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- Update column name for consistency
ALTER TABLE `email_outgoing` CHANGE `recipient_email` `to_email` VARCHAR(191) NOT NULL;
