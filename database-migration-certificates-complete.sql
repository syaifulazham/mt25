-- ============================================================
-- Complete Database Migration for Certificate System
-- Date: October 15, 2025
-- Description: All required tables and columns for certificate management
-- ============================================================

-- ============================================================
-- 1. Certificate Status Enum Table
-- ============================================================
CREATE TABLE IF NOT EXISTS certificate_status_enum (
  value VARCHAR(10) PRIMARY KEY
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert required status values
INSERT IGNORE INTO certificate_status_enum (value) VALUES ('ACTIVE');
INSERT IGNORE INTO certificate_status_enum (value) VALUES ('INACTIVE');
INSERT IGNORE INTO certificate_status_enum (value) VALUES ('DRAFT');

SELECT '✓ certificate_status_enum table ready' as status;
SELECT * FROM certificate_status_enum;

-- ============================================================
-- 2. Add serialNumber column to certificate table
-- ============================================================
-- Check if column exists first
SET @column_exists = (
  SELECT COUNT(*) 
  FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'certificate' 
    AND COLUMN_NAME = 'serialNumber'
);

-- Add column only if it doesn't exist
SET @sql = IF(@column_exists = 0,
  'ALTER TABLE certificate ADD COLUMN serialNumber VARCHAR(50) NULL AFTER uniqueCode',
  'SELECT "serialNumber column already exists" as message'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add unique constraint if column was just added or if constraint doesn't exist
SET @constraint_exists = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'certificate'
    AND CONSTRAINT_NAME = 'unique_serial_number'
);

SET @sql = IF(@constraint_exists = 0 AND @column_exists = 0,
  'ALTER TABLE certificate ADD CONSTRAINT unique_serial_number UNIQUE (serialNumber)',
  'SELECT "unique_serial_number constraint exists or will be added separately" as message'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SELECT '✓ certificate.serialNumber column ready' as status;

-- ============================================================
-- 3. Create certificate_serial table for serial number tracking
-- ============================================================
CREATE TABLE IF NOT EXISTS certificate_serial (
  id INT AUTO_INCREMENT PRIMARY KEY,
  year INT NOT NULL,
  templateId INT NOT NULL,
  targetType ENUM('GENERAL', 'EVENT_PARTICIPANT', 'EVENT_WINNER', 'NON_CONTEST_PARTICIPANT') NOT NULL,
  typeCode VARCHAR(10) NOT NULL,
  lastSequence INT NOT NULL DEFAULT 0,
  createdAt DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  -- Constraints
  CONSTRAINT unique_year_type UNIQUE (year, targetType, templateId),
  CONSTRAINT fk_cert_serial_template FOREIGN KEY (templateId) REFERENCES cert_template(id) ON DELETE CASCADE,
  
  -- Indexes
  INDEX idx_year (year),
  INDEX idx_template (templateId),
  INDEX idx_type (targetType)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SELECT '✓ certificate_serial table ready' as status;

-- ============================================================
-- 4. Verification Queries
-- ============================================================
SELECT 'Database Migration Complete!' as status;

-- Show certificate table structure
SELECT '=== certificate table structure ===' as info;
DESCRIBE certificate;

-- Show certificate_serial table structure  
SELECT '=== certificate_serial table structure ===' as info;
DESCRIBE certificate_serial;

-- Show status enum values
SELECT '=== certificate_status_enum values ===' as info;
SELECT * FROM certificate_status_enum;

-- Show record counts
SELECT '=== Record Counts ===' as info;
SELECT 
  (SELECT COUNT(*) FROM certificate) as certificate_count,
  (SELECT COUNT(*) FROM certificate_serial) as serial_tracking_count,
  (SELECT COUNT(*) FROM certificate_status_enum) as status_enum_count;
