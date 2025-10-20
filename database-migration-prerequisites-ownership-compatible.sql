-- ============================================================================
-- Certificate Template Prerequisites & Certificate Ownership Migration
-- Date: October 21, 2025
-- Compatible with MySQL 5.7+ (without IF NOT EXISTS syntax)
-- ============================================================================

USE mt25_db;

-- ============================================================================
-- Method 1: Direct ALTER TABLE (Simple - Use if columns don't exist yet)
-- ============================================================================

-- Add prerequisites column to cert_template
ALTER TABLE cert_template
ADD COLUMN prerequisites JSON NULL
COMMENT 'Survey prerequisites for certificate generation in JSON format';

-- Add ownership column to certificate
ALTER TABLE certificate
ADD COLUMN ownership JSON NULL
COMMENT 'Ownership metadata including year, contingentId, and contestantId';

-- ============================================================================
-- Method 2: Safe ALTER with Error Handling (Use if you're not sure)
-- ============================================================================

-- This will show an error if column exists, but won't break anything
-- Just ignore the "Duplicate column name" error if it appears

-- For cert_template.prerequisites
SET @dbname = DATABASE();
SET @tablename = 'cert_template';
SET @columnname = 'prerequisites';
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (table_name = @tablename)
      AND (table_schema = @dbname)
      AND (column_name = @columnname)
  ) > 0,
  'SELECT 1',
  CONCAT('ALTER TABLE ', @tablename, ' ADD COLUMN ', @columnname, ' JSON NULL')
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- For certificate.ownership
SET @tablename = 'certificate';
SET @columnname = 'ownership';
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (table_name = @tablename)
      AND (table_schema = @dbname)
      AND (column_name = @columnname)
  ) > 0,
  'SELECT 1',
  CONCAT('ALTER TABLE ', @tablename, ' ADD COLUMN ', @columnname, ' JSON NULL')
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- ============================================================================
-- Verification
-- ============================================================================

-- Check if prerequisites column was added
SELECT 
    TABLE_NAME,
    COLUMN_NAME,
    DATA_TYPE,
    IS_NULLABLE,
    COLUMN_COMMENT
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'cert_template'
    AND COLUMN_NAME = 'prerequisites';

-- Check if ownership column was added
SELECT 
    TABLE_NAME,
    COLUMN_NAME,
    DATA_TYPE,
    IS_NULLABLE,
    COLUMN_COMMENT
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'certificate'
    AND COLUMN_NAME = 'ownership';

-- ============================================================================
-- Simple Rollback (if needed)
-- ============================================================================

-- ALTER TABLE cert_template DROP COLUMN prerequisites;
-- ALTER TABLE certificate DROP COLUMN ownership;
