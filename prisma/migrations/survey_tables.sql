-- SQL script to create survey tables in sync with Prisma schema

-- Create survey table
CREATE TABLE IF NOT EXISTS survey (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'draft',
  startDate DATETIME NULL,
  endDate DATETIME NULL,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_survey_status (status)
);

-- Create survey_question table
CREATE TABLE IF NOT EXISTS survey_question (
  id INT AUTO_INCREMENT PRIMARY KEY,
  surveyId INT NOT NULL,
  question TEXT NOT NULL,
  questionType VARCHAR(50) NOT NULL DEFAULT 'text',
  options JSON NULL,
  isRequired BOOLEAN NOT NULL DEFAULT TRUE,
  displayOrder INT NOT NULL DEFAULT 0,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (surveyId) REFERENCES survey(id) ON DELETE CASCADE,
  INDEX idx_survey_question_survey (surveyId),
  INDEX idx_survey_question_order (surveyId, displayOrder)
);

-- Create survey_contestants_composition table
CREATE TABLE IF NOT EXISTS survey_contestants_composition (
  id INT AUTO_INCREMENT PRIMARY KEY,
  surveyId INT NOT NULL,
  contestantId INT NOT NULL,
  FOREIGN KEY (surveyId) REFERENCES survey(id) ON DELETE CASCADE,
  FOREIGN KEY (contestantId) REFERENCES contestant(id) ON DELETE CASCADE,
  UNIQUE KEY uk_survey_contestant (surveyId, contestantId),
  INDEX idx_survey_composition_survey (surveyId),
  INDEX idx_survey_composition_contestant (contestantId)
);

-- Create survey_answer table
CREATE TABLE IF NOT EXISTS survey_answer (
  id INT AUTO_INCREMENT PRIMARY KEY,
  surveyId INT NOT NULL,
  questionId INT NOT NULL,
  contestantId INT NOT NULL,
  answer JSON NULL,
  submittedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (surveyId) REFERENCES survey(id) ON DELETE CASCADE,
  FOREIGN KEY (questionId) REFERENCES survey_question(id) ON DELETE CASCADE,
  FOREIGN KEY (contestantId) REFERENCES contestant(id) ON DELETE CASCADE,
  INDEX idx_survey_answer_survey (surveyId),
  INDEX idx_survey_answer_question (questionId),
  INDEX idx_survey_answer_contestant (contestantId),
  INDEX idx_survey_answer_survey_contestant (surveyId, contestantId)
);

-- Create survey_submission_status table
CREATE TABLE IF NOT EXISTS survey_submission_status (
  id INT AUTO_INCREMENT PRIMARY KEY,
  surveyId INT NOT NULL,
  contestantId INT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'not_started',
  startedAt DATETIME NULL,
  completedAt DATETIME NULL,
  lastUpdatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (surveyId) REFERENCES survey(id) ON DELETE CASCADE,
  FOREIGN KEY (contestantId) REFERENCES contestant(id) ON DELETE CASCADE,
  UNIQUE KEY uk_survey_submission_status (surveyId, contestantId),
  INDEX idx_survey_submission_survey (surveyId),
  INDEX idx_survey_submission_contestant (contestantId),
  INDEX idx_survey_submission_status (status)
);

-- Create a view to get survey completion statistics
CREATE OR REPLACE VIEW survey_completion_stats AS
SELECT 
  s.id AS surveyId,
  s.name AS surveyName,
  s.status AS surveyStatus,
  COUNT(DISTINCT scc.contestantId) AS totalAssigned,
  COUNT(DISTINCT CASE WHEN sss.status = 'completed' THEN scc.contestantId END) AS completed,
  COUNT(DISTINCT CASE WHEN sss.status = 'in_progress' THEN scc.contestantId END) AS inProgress,
  COUNT(DISTINCT CASE WHEN sss.status = 'not_started' OR sss.status IS NULL THEN scc.contestantId END) AS notStarted
FROM 
  survey s
LEFT JOIN 
  survey_contestants_composition scc ON s.id = scc.surveyId
LEFT JOIN 
  survey_submission_status sss ON s.id = sss.surveyId AND scc.contestantId = sss.contestantId
GROUP BY 
  s.id, s.name, s.status;

-- Create triggers to maintain submission status when contestants are assigned/unassigned
DELIMITER //

-- Trigger to initialize submission status when contestants are assigned
CREATE TRIGGER IF NOT EXISTS after_survey_contestant_insert
AFTER INSERT ON survey_contestants_composition
FOR EACH ROW
BEGIN
  INSERT INTO survey_submission_status (surveyId, contestantId, status, lastUpdatedAt)
  VALUES (NEW.surveyId, NEW.contestantId, 'not_started', NOW())
  ON DUPLICATE KEY UPDATE lastUpdatedAt = NOW();
END //

-- Trigger to remove submission status when contestants are unassigned
CREATE TRIGGER IF NOT EXISTS after_survey_contestant_delete
AFTER DELETE ON survey_contestants_composition
FOR EACH ROW
BEGIN
  DELETE FROM survey_submission_status 
  WHERE surveyId = OLD.surveyId AND contestantId = OLD.contestantId;
END //

DELIMITER ;
