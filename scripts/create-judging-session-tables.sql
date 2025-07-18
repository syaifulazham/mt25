-- Create judgingSession table
CREATE TABLE IF NOT EXISTS `judgingSession` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `judgeId` INT NOT NULL,
  `attendanceTeamId` INT NOT NULL,
  `eventContestId` INT NOT NULL,
  `status` ENUM('IN_PROGRESS', 'COMPLETED') NOT NULL DEFAULT 'IN_PROGRESS',
  `startTime` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `endTime` DATETIME NULL,
  `totalScore` DECIMAL(10, 2) NULL,
  `comments` TEXT NULL,
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_judgingSession_judgeId` (`judgeId`),
  INDEX `idx_judgingSession_attendanceTeamId` (`attendanceTeamId`),
  INDEX `idx_judgingSession_eventContestId` (`eventContestId`),
  UNIQUE INDEX `unique_judge_team_contest` (`judgeId`, `attendanceTeamId`, `eventContestId`),
  CONSTRAINT `fk_judgingSession_judgeId`
    FOREIGN KEY (`judgeId`) 
    REFERENCES `user` (`id`) 
    ON DELETE RESTRICT 
    ON UPDATE RESTRICT,
  CONSTRAINT `fk_judgingSession_attendanceTeamId`
    FOREIGN KEY (`attendanceTeamId`) 
    REFERENCES `attendanceTeam` (`Id`) 
    ON DELETE CASCADE 
    ON UPDATE CASCADE,
  CONSTRAINT `fk_judgingSession_eventContestId`
    FOREIGN KEY (`eventContestId`) 
    REFERENCES `eventcontest` (`id`) 
    ON DELETE RESTRICT 
    ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create judgingSessionScore table
CREATE TABLE IF NOT EXISTS `judgingSessionScore` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `judgingSessionId` INT NOT NULL,
  `criterionId` INT NOT NULL,
  `score` DECIMAL(10, 2) NOT NULL,
  `comments` TEXT NULL,
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `criterionName` VARCHAR(255) NOT NULL,
  `criterionDescription` TEXT NULL,
  `criterionWeight` INT NOT NULL,
  `criterionType` VARCHAR(50) NOT NULL,
  `maxScore` INT NOT NULL DEFAULT 10,
  PRIMARY KEY (`id`),
  INDEX `idx_judgingSessionScore_judgingSessionId` (`judgingSessionId`),
  INDEX `idx_judgingSessionScore_criterionId` (`criterionId`),
  CONSTRAINT `fk_judgingSessionScore_judgingSessionId`
    FOREIGN KEY (`judgingSessionId`) 
    REFERENCES `judgingSession` (`id`) 
    ON DELETE CASCADE 
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
