-- Make certificate.createdBy nullable to support participant-generated certificates
-- This allows participants (from user_participant table) to generate certificates
-- without requiring a foreign key to the user table

-- Remove NOT NULL constraint from createdBy
ALTER TABLE certificate 
MODIFY COLUMN createdBy INT NULL;

-- Add comment to clarify usage
ALTER TABLE certificate 
MODIFY COLUMN createdBy INT NULL 
COMMENT 'References user.id (admin/operators). NULL for participant-generated certificates.';

-- Verify the change
SELECT 
    COLUMN_NAME,
    IS_NULLABLE,
    COLUMN_TYPE,
    COLUMN_COMMENT
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = 'mtdb' 
  AND TABLE_NAME = 'certificate' 
  AND COLUMN_NAME = 'createdBy';
