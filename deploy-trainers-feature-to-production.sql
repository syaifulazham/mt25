-- ============================================
-- TRAINERS FEATURE DEPLOYMENT TO PRODUCTION
-- Date: 2025-11-15
-- IMPORTANT: Review and test on staging before production!
-- ============================================

-- Start transaction for safety
START TRANSACTION;

-- 1. Backup current enum values (for rollback if needed)
-- Run this first to see current values:
-- SHOW COLUMNS FROM cert_template LIKE 'targetType';

-- 2. Add TRAINERS to cert_template targetType enum
-- Note: This will fail if TRAINERS already exists (which is safe)
ALTER TABLE cert_template 
MODIFY COLUMN targetType ENUM(
  'GENERAL', 
  'EVENT_PARTICIPANT', 
  'EVENT_WINNER', 
  'NON_CONTEST_PARTICIPANT', 
  'QUIZ_PARTICIPANT', 
  'QUIZ_WINNER',
  'TRAINERS'
) DEFAULT NULL;

-- 3. Ensure certificate table has recipientType column
-- Check first: SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='certificate' AND COLUMN_NAME='recipientType';
ALTER TABLE certificate 
ADD COLUMN IF NOT EXISTS recipientType VARCHAR(50) DEFAULT NULL
AFTER recipientName;

-- 4. Ensure certificate table has recipientEmail column
ALTER TABLE certificate 
ADD COLUMN IF NOT EXISTS recipientEmail VARCHAR(255) DEFAULT NULL
AFTER recipientType;

-- 5. Ensure certificate table has filePath column
ALTER TABLE certificate 
ADD COLUMN IF NOT EXISTS filePath VARCHAR(1000) DEFAULT NULL
AFTER serialNumber;

-- 6. Ensure certificate table has updatedBy column
ALTER TABLE certificate 
ADD COLUMN IF NOT EXISTS updatedBy INT DEFAULT NULL
AFTER createdBy;

-- 7. Add indexes for performance (IF NOT EXISTS doesn't work in MySQL for indexes)
-- Check existing indexes first: SHOW INDEX FROM certificate;

-- Add recipientType index (skip if error means it exists)
ALTER TABLE certificate 
ADD INDEX idx_recipient_type (recipientType);

-- Add ic_number index (skip if error means it exists)
ALTER TABLE certificate 
ADD INDEX idx_ic_number (ic_number);

-- Add composite index for trainer queries (skip if error means it exists)
ALTER TABLE certificate 
ADD INDEX idx_trainer_certificates (ic_number, recipientType, templateId);

-- 8. Update certificate status enum to include READY
ALTER TABLE certificate 
MODIFY COLUMN status ENUM(
  'GENERATED', 
  'READY',
  'SENT', 
  'DOWNLOADED',
  'PENDING',
  'FAILED'
) DEFAULT 'GENERATED';

-- 9. Verify changes
SELECT 'Checking cert_template targetType enum...' AS status;
SHOW COLUMNS FROM cert_template LIKE 'targetType';

SELECT 'Checking certificate table structure...' AS status;
DESCRIBE certificate;

SELECT 'Checking certificate indexes...' AS status;
SHOW INDEX FROM certificate;

-- If everything looks good, commit the transaction
-- COMMIT;

-- If there are issues, rollback
-- ROLLBACK;

-- ============================================
-- MANUAL REVIEW REQUIRED
-- ============================================
-- After running this script:
-- 1. Review the output of the verification queries
-- 2. If everything is correct, run: COMMIT;
-- 3. If there are issues, run: ROLLBACK;
-- ============================================
