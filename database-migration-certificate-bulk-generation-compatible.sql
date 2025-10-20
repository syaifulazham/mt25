-- ============================================================================
-- Certificate Bulk Generation Feature - Database Migration Script
-- Date: October 21, 2025
-- Compatible with MySQL 5.7+ (without IF NOT EXISTS syntax)
-- Description: Add new fields to certificate table for enhanced bulk generation
-- ============================================================================

USE mt25_db;

-- ============================================================================
-- Method 1: Direct ALTER TABLE (Use if columns don't exist yet)
-- ============================================================================

-- Add recipientEmail field
ALTER TABLE certificate
ADD COLUMN recipientEmail VARCHAR(255) NULL
AFTER recipientName;

-- Add team_name field
ALTER TABLE certificate
ADD COLUMN team_name VARCHAR(255) NULL
AFTER contingent_name;

-- Add contestName field
ALTER TABLE certificate
ADD COLUMN contestName VARCHAR(255) NULL
AFTER ic_number;

-- Add issuedAt field
ALTER TABLE certificate
ADD COLUMN issuedAt DATETIME NULL
AFTER status;

-- ============================================================================
-- Create indexes
-- ============================================================================

-- Index for recipientEmail (ignore error if already exists)
CREATE INDEX idx_certificate_recipientEmail ON certificate(recipientEmail);

-- Index for ic_number (ignore error if already exists)
CREATE INDEX idx_certificate_ic_number ON certificate(ic_number);

-- ============================================================================
-- Verify the changes
-- ============================================================================

-- Display certificate table structure
DESCRIBE certificate;

-- Check specific columns
SELECT 
    COLUMN_NAME,
    DATA_TYPE,
    IS_NULLABLE,
    COLUMN_KEY
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'certificate'
    AND COLUMN_NAME IN ('recipientEmail', 'team_name', 'contestName', 'issuedAt')
ORDER BY ORDINAL_POSITION;

-- Check indexes
SELECT 
    INDEX_NAME,
    COLUMN_NAME,
    NON_UNIQUE
FROM INFORMATION_SCHEMA.STATISTICS
WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'certificate'
    AND INDEX_NAME IN ('idx_certificate_recipientEmail', 'idx_certificate_ic_number')
ORDER BY INDEX_NAME, SEQ_IN_INDEX;

-- Count total certificates
SELECT 
    COUNT(*) as total_certificates,
    SUM(CASE WHEN filePath IS NOT NULL THEN 1 ELSE 0 END) as generated_certificates,
    SUM(CASE WHEN filePath IS NULL THEN 1 ELSE 0 END) as pending_certificates
FROM certificate;

-- ============================================================================
-- Optional: Update existing records (if needed)
-- ============================================================================

-- Update existing certificates to set default values if needed
-- UPDATE certificate 
-- SET issuedAt = createdAt 
-- WHERE issuedAt IS NULL AND filePath IS NOT NULL;

-- ============================================================================
-- ROLLBACK SCRIPT (Use only if needed to revert changes)
-- ============================================================================

-- ALTER TABLE certificate DROP COLUMN recipientEmail;
-- ALTER TABLE certificate DROP COLUMN team_name;
-- ALTER TABLE certificate DROP COLUMN contestName;
-- ALTER TABLE certificate DROP COLUMN issuedAt;
-- DROP INDEX idx_certificate_recipientEmail ON certificate;
-- DROP INDEX idx_certificate_ic_number ON certificate;

-- ============================================================================
-- END OF MIGRATION SCRIPT
-- ============================================================================
