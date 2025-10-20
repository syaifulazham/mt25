-- Add prerequisites column to cert_template table
-- This column stores prerequisite conditions in JSON format
-- Example: [{"prerequisite": "survey", "id": 1}, {"prerequisite": "survey", "id": 2}]

USE mtdb;

-- Add the prerequisites column
ALTER TABLE cert_template 
ADD COLUMN prerequisites JSON NULL 
COMMENT 'Array of prerequisite conditions in JSON format. Example: [{"prerequisite": "survey", "id": 1}]'
AFTER winnerRangeEnd;

-- Verify the change
DESCRIBE cert_template;

-- Show the new column details
SELECT 
    COLUMN_NAME,
    COLUMN_TYPE,
    IS_NULLABLE,
    COLUMN_DEFAULT,
    COLUMN_COMMENT
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = 'mtdb' 
  AND TABLE_NAME = 'cert_template' 
  AND COLUMN_NAME = 'prerequisites';

-- Example of inserting data with prerequisites
-- UPDATE cert_template 
-- SET prerequisites = '[{"prerequisite": "survey", "id": 1}, {"prerequisite": "survey", "id": 2}]'
-- WHERE id = 1;

-- Example of querying prerequisites
-- SELECT id, templateName, prerequisites 
-- FROM cert_template 
-- WHERE prerequisites IS NOT NULL;
