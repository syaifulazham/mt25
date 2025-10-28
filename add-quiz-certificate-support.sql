-- Add Quiz Certificate Support
-- Adds QUIZ_PARTICIPANT and QUIZ_WINNER types to certificate templates

-- Add new enum values to CertTemplateTargetType
ALTER TABLE cert_template 
MODIFY COLUMN targetType ENUM(
  'GENERAL',
  'EVENT_PARTICIPANT',
  'EVENT_WINNER',
  'NON_CONTEST_PARTICIPANT',
  'QUIZ_PARTICIPANT',
  'QUIZ_WINNER'
) DEFAULT 'GENERAL';

-- Add quizId column to cert_template
ALTER TABLE cert_template
ADD COLUMN quizId INT NULL AFTER eventId,
ADD INDEX idx_cert_template_quizId (quizId),
ADD CONSTRAINT fk_cert_template_quiz 
  FOREIGN KEY (quizId) REFERENCES quiz(id) 
  ON DELETE SET NULL;

-- Verify the changes
DESCRIBE cert_template;
SHOW INDEX FROM cert_template WHERE Key_name = 'idx_cert_template_quizId';
