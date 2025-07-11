-- Create the eventAttendanceSync table
CREATE TABLE IF NOT EXISTS `eventAttendanceSync` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `eventId` INT NOT NULL,
  `status` VARCHAR(191) NOT NULL,
  `startTime` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `endTime` DATETIME(3) NULL,
  `totalContingents` INT NOT NULL,
  `totalTeams` INT NOT NULL,
  `completedCount` INT NOT NULL DEFAULT 0,
  `errorCount` INT NOT NULL DEFAULT 0,
  `note` VARCHAR(191) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  
  PRIMARY KEY (`id`),
  INDEX `eventAttendanceSync_eventId_idx` (`eventId`),
  CONSTRAINT `eventAttendanceSync_eventId_fkey` FOREIGN KEY (`eventId`) REFERENCES `event` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
