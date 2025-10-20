-- ============================================================================
-- Certificate Bulk Generation Feature - Database Migration Script
-- Date: October 21, 2025
-- Description: Add new fields to certificate table for enhanced bulk generation
-- ============================================================================

-- Use the correct database
USE mt25_db;

-- ============================================================================
-- 1. Add new columns to certificate table (if they don't exist)
-- ============================================================================

-- Add recipientEmail field
ALTER TABLE certificate
ADD COLUMN IF NOT EXISTS recipientEmail VARCHAR(255) NULL
AFTER recipientName;

-- Add team_name field
ALTER TABLE certificate
ADD COLUMN IF NOT EXISTS team_name VARCHAR(255) NULL
AFTER contingent_name;

-- Add contestName field
ALTER TABLE certificate
ADD COLUMN IF NOT EXISTS contestName VARCHAR(255) NULL
AFTER ic_number;

-- Add issuedAt field
ALTER TABLE certificate
ADD COLUMN IF NOT EXISTS issuedAt DATETIME NULL
AFTER status;

-- ============================================================================
-- 2. Create indexes for new fields (if they don't exist)
-- ============================================================================

-- Index for recipientEmail
CREATE INDEX IF NOT EXISTS idx_certificate_recipientEmail ON certificate(recipientEmail);

-- Index for ic_number (if not exists - used frequently for lookups)
CREATE INDEX IF NOT EXISTS idx_certificate_ic_number ON certificate(ic_number);

-- ============================================================================
-- 3. Verify the changes
-- ============================================================================

-- Display certificate table structure
DESCRIBE certificate;

-- Count total certificates
SELECT 
    COUNT(*) as total_certificates,
    SUM(CASE WHEN filePath IS NOT NULL THEN 1 ELSE 0 END) as generated_certificates,
    SUM(CASE WHEN filePath IS NULL THEN 1 ELSE 0 END) as pending_certificates
FROM certificate;

-- ============================================================================
-- 4. Optional: Update existing records (if needed)
-- ============================================================================

-- Update existing certificates to set default values if needed
-- UPDATE certificate 
-- SET issuedAt = createdAt 
-- WHERE issuedAt IS NULL AND filePath IS NOT NULL;

-- ============================================================================
-- ROLLBACK SCRIPT (Use only if needed to revert changes)
-- ============================================================================

-- WARNING: Uncomment and run these commands ONLY if you need to rollback

-- ALTER TABLE certificate DROP COLUMN IF EXISTS recipientEmail;
-- ALTER TABLE certificate DROP COLUMN IF EXISTS team_name;
-- ALTER TABLE certificate DROP COLUMN IF EXISTS contestName;
-- ALTER TABLE certificate DROP COLUMN IF EXISTS issuedAt;
-- DROP INDEX IF EXISTS idx_certificate_recipientEmail ON certificate;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Check if columns exist
SELECT 
    COLUMN_NAME,
    DATA_TYPE,
    IS_NULLABLE,
    COLUMN_DEFAULT,
    COLUMN_KEY
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = 'mt25_db'
    AND TABLE_NAME = 'certificate'
    AND COLUMN_NAME IN ('recipientEmail', 'team_name', 'contestName', 'issuedAt')
ORDER BY ORDINAL_POSITION;

-- Check indexes
SELECT 
    INDEX_NAME,
    COLUMN_NAME,
    NON_UNIQUE
FROM INFORMATION_SCHEMA.STATISTICS
WHERE TABLE_SCHEMA = 'mt25_db'
    AND TABLE_NAME = 'certificate'
ORDER BY INDEX_NAME, SEQ_IN_INDEX;

-- ============================================================================
-- END OF MIGRATION SCRIPT
-- ============================================================================
