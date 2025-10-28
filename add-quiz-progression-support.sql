-- Add Quiz Progression Support
-- Adds nextQuizId to quiz table and creates quiz_progression table

-- Add nextQuizId column to quiz table
ALTER TABLE quiz
ADD COLUMN nextQuizId INT NULL AFTER contestId,
ADD INDEX idx_quiz_nextQuizId (nextQuizId),
ADD CONSTRAINT fk_quiz_next_quiz 
  FOREIGN KEY (nextQuizId) REFERENCES quiz(id) 
  ON DELETE SET NULL;

-- Create quiz_progression table
CREATE TABLE IF NOT EXISTS quiz_progression (
  id INT PRIMARY KEY AUTO_INCREMENT,
  quizId INT NOT NULL,
  nextQuizId INT NOT NULL,
  contingentId INT NOT NULL,
  contestantId INT NOT NULL,
  progressedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_progression_quizId (quizId),
  INDEX idx_progression_nextQuizId (nextQuizId),
  INDEX idx_progression_contingentId (contingentId),
  INDEX idx_progression_contestantId (contestantId),
  INDEX idx_progression_contestant_quiz (contestantId, quizId),
  
  CONSTRAINT fk_progression_quiz 
    FOREIGN KEY (quizId) REFERENCES quiz(id) 
    ON DELETE CASCADE,
  CONSTRAINT fk_progression_next_quiz 
    FOREIGN KEY (nextQuizId) REFERENCES quiz(id) 
    ON DELETE CASCADE,
  CONSTRAINT fk_progression_contingent 
    FOREIGN KEY (contingentId) REFERENCES contingent(id) 
    ON DELETE CASCADE,
  CONSTRAINT fk_progression_contestant 
    FOREIGN KEY (contestantId) REFERENCES contestant(id) 
    ON DELETE CASCADE,
    
  -- Prevent duplicate progression records
  UNIQUE KEY unique_contestant_quiz_progression (contestantId, quizId, nextQuizId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Verify the changes
DESCRIBE quiz;
DESCRIBE quiz_progression;
SHOW INDEX FROM quiz WHERE Key_name = 'idx_quiz_nextQuizId';
