-- SQL script to create the eventcontestteam table
CREATE TABLE IF NOT EXISTS `eventcontestteam` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `eventcontestId` INT NOT NULL,
  `teamId` INT NOT NULL,
  `teamPriority` INT NOT NULL DEFAULT 0,
  `status` VARCHAR(191) NOT NULL DEFAULT 'PENDING',
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  
  PRIMARY KEY (`id`),
  INDEX `eventcontestteam_eventcontestId_idx` (`eventcontestId`),
  INDEX `eventcontestteam_teamId_idx` (`teamId`),
  
  CONSTRAINT `eventcontestteam_eventcontestId_fkey` FOREIGN KEY (`eventcontestId`) REFERENCES `eventcontest` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `eventcontestteam_teamId_fkey` FOREIGN KEY (`teamId`) REFERENCES `team` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
);

-- Add an index for faster lookup of team registrations
-- Note: Using simple CREATE INDEX without any conditional statements for compatibility
CREATE INDEX `eventcontestteam_eventcontest_team_idx` ON `eventcontestteam` (`eventcontestId`, `teamId`);
