-- ============================================
-- OPTIONAL: Add updatedBy column to certificate table
-- This is not critical for the feature to work
-- ============================================

-- Check if column exists
SELECT COLUMN_NAME 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() 
  AND TABLE_NAME = 'certificate' 
  AND COLUMN_NAME = 'updatedBy';

-- Add updatedBy column if it doesn't exist
ALTER TABLE certificate 
ADD COLUMN IF NOT EXISTS updatedBy INT DEFAULT NULL
AFTER createdBy;

-- Add foreign key constraint (optional)
-- ALTER TABLE certificate 
-- ADD CONSTRAINT fk_certificate_updated_by
-- FOREIGN KEY (updatedBy) REFERENCES user_organizer(id)
-- ON DELETE SET NULL;

-- Verify
DESCRIBE certificate;

SELECT 'updatedBy column added successfully!' AS status;
