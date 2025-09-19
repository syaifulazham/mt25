-- MySQL script to create certificate management tables
-- User: azham
-- Password: DBAzham231
-- Database: mtdb

-- Connect to the database
-- mysql -u azham -pDBAzham231 mtdb

-- Create enum for Status (MySQL doesn't have native ENUMs like PostgreSQL)
CREATE TABLE IF NOT EXISTS `certificate_status_enum` (
  `value` VARCHAR(10) NOT NULL,
  PRIMARY KEY (`value`)
);

-- Populate the status enum values
INSERT IGNORE INTO `certificate_status_enum` (`value`) VALUES ('ACTIVE'), ('INACTIVE');

-- Create certificate template table
CREATE TABLE IF NOT EXISTS `cert_template` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `templateName` VARCHAR(255) NOT NULL,
  `basePdfPath` VARCHAR(1000) NULL,
  `configuration` JSON NOT NULL,
  `status` VARCHAR(10) NOT NULL DEFAULT 'ACTIVE',
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `createdBy` INT NOT NULL,
  `updatedBy` INT NULL,
  PRIMARY KEY (`id`),
  INDEX `idx_cert_template_name` (`templateName`),
  INDEX `idx_cert_template_status` (`status`),
  INDEX `idx_cert_template_createdAt` (`createdAt`),
  CONSTRAINT `fk_cert_template_createdBy` FOREIGN KEY (`createdBy`) REFERENCES `user` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_cert_template_updatedBy` FOREIGN KEY (`updatedBy`) REFERENCES `user` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_cert_template_status` FOREIGN KEY (`status`) REFERENCES `certificate_status_enum` (`value`) ON DELETE RESTRICT ON UPDATE CASCADE
);

-- Create certificate table
CREATE TABLE IF NOT EXISTS `certificate` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `templateId` INT NOT NULL,
  `recipientName` VARCHAR(255) NOT NULL,
  `recipientEmail` VARCHAR(255) NULL,
  `recipientType` VARCHAR(50) NOT NULL,
  `contestName` VARCHAR(255) NULL,
  `awardTitle` VARCHAR(255) NULL,
  `uniqueCode` VARCHAR(50) NOT NULL,
  `filePath` VARCHAR(1000) NULL,
  `status` VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
  `issuedAt` DATETIME NULL,
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `createdBy` INT NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `unique_certificate_code` (`uniqueCode`),
  INDEX `idx_certificate_templateId` (`templateId`),
  INDEX `idx_certificate_recipientName` (`recipientName`),
  INDEX `idx_certificate_recipientEmail` (`recipientEmail`),
  INDEX `idx_certificate_status` (`status`),
  INDEX `idx_certificate_createdAt` (`createdAt`),
  CONSTRAINT `fk_certificate_templateId` FOREIGN KEY (`templateId`) REFERENCES `cert_template` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_certificate_createdBy` FOREIGN KEY (`createdBy`) REFERENCES `user` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
);

-- Add user relation columns (optional - only if you want to directly add these to the user table)
-- Note: This is not a standard approach in MySQL, and you might want to just use the foreign key relations instead
-- ALTER TABLE `user` ADD COLUMN IF NOT EXISTS `created_templates` JSON NULL;
-- ALTER TABLE `user` ADD COLUMN IF NOT EXISTS `updated_templates` JSON NULL;
-- ALTER TABLE `user` ADD COLUMN IF NOT EXISTS `created_certificates` JSON NULL;
