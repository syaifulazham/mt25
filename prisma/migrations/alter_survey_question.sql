-- SQL script to alter survey_question table to add new fields for question types
-- Run this if you've already created the tables and just need to add these columns

-- Check if columns exist before adding them
SET @columnExists = 0;
SELECT COUNT(*) INTO @columnExists FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'survey_question' AND COLUMN_NAME = 'questionType';

-- Add questionType column if it doesn't exist
SET @query = IF(@columnExists = 0, 
    'ALTER TABLE survey_question ADD COLUMN questionType VARCHAR(50) NOT NULL DEFAULT \'text\' AFTER question',
    'SELECT \'Column questionType already exists\' AS message');
PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Check if options column exists
SET @columnExists = 0;
SELECT COUNT(*) INTO @columnExists FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'survey_question' AND COLUMN_NAME = 'options';

-- Add options column if it doesn't exist
SET @query = IF(@columnExists = 0, 
    'ALTER TABLE survey_question ADD COLUMN options JSON NULL AFTER questionType',
    'SELECT \'Column options already exists\' AS message');
PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Check if displayOrder column exists
SET @columnExists = 0;
SELECT COUNT(*) INTO @columnExists FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'survey_question' AND COLUMN_NAME = 'displayOrder';

-- Add displayOrder column if it doesn't exist
SET @query = IF(@columnExists = 0, 
    'ALTER TABLE survey_question ADD COLUMN displayOrder INT NOT NULL DEFAULT 0',
    'SELECT \'Column displayOrder already exists\' AS message');
PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Rename index if needed
SET @indexExists = 0;
SELECT COUNT(*) INTO @indexExists FROM INFORMATION_SCHEMA.STATISTICS 
WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'survey_question' AND INDEX_NAME = 'idx_survey_question';

-- Rename the index if it exists
SET @query = IF(@indexExists > 0, 
    'ALTER TABLE survey_question DROP INDEX idx_survey_question, ADD INDEX idx_survey_question_survey (surveyId)',
    'SELECT \'Index idx_survey_question does not exist\' AS message');
PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Create order index if needed
SET @orderIndexExists = 0;
SELECT COUNT(*) INTO @orderIndexExists FROM INFORMATION_SCHEMA.STATISTICS 
WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'survey_question' AND INDEX_NAME = 'idx_survey_question_order';

-- Create the order index if it doesn't exist
SET @query = IF(@orderIndexExists = 0, 
    'ALTER TABLE survey_question ADD INDEX idx_survey_question_order (surveyId, displayOrder)',
    'SELECT \'Index idx_survey_question_order already exists\' AS message');
PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
