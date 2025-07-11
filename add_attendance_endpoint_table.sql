-- Add attendance_endpoint table without risking existing data
CREATE TABLE IF NOT EXISTS `attendance_endpoint` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `eventId` INT NOT NULL,
  `endpointhash` VARCHAR(191) NOT NULL,
  `passcode` VARCHAR(191) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `attendance_endpoint_endpointhash_key` (`endpointhash`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
