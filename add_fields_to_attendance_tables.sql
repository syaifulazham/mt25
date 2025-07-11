-- Add fields to attendanceContingent table
ALTER TABLE attendanceContingent
ADD COLUMN zoneId INT NULL,
ADD COLUMN stateId INT NULL,
ADD COLUMN state VARCHAR(255) NULL,
ADD INDEX idx_stateId (stateId),
ADD INDEX idx_zoneId (zoneId);

-- Add fields to attendanceTeam table
ALTER TABLE attendanceTeam
ADD COLUMN zoneId INT NULL,
ADD COLUMN stateId INT NULL,
ADD COLUMN state VARCHAR(255) NULL,
ADD INDEX idx_stateId (stateId),
ADD INDEX idx_zoneId (zoneId);

-- Add fields to attendanceContestant table
ALTER TABLE attendanceContestant
ADD COLUMN zoneId INT NULL,
ADD COLUMN stateId INT NULL,
ADD COLUMN state VARCHAR(255) NULL,
ADD INDEX idx_stateId (stateId),
ADD INDEX idx_zoneId (zoneId);

-- Add fields to attendanceManager table
ALTER TABLE attendanceManager
ADD COLUMN zoneId INT NULL,
ADD COLUMN stateId INT NULL,
ADD COLUMN state VARCHAR(255) NULL,
ADD INDEX stateId_index (stateId),
ADD INDEX zoneId_index (zoneId);

-- Add fields to attendanceNonParticipant table
ALTER TABLE attendanceNonParticipant
ADD COLUMN zoneId INT NULL,
ADD COLUMN stateId INT NULL,
ADD COLUMN state VARCHAR(255) NULL,
ADD INDEX idx_eventId (eventId),
ADD INDEX idx_stateId (stateId),
ADD INDEX idx_zoneId (zoneId);
