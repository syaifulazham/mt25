-- ============================================================================
-- SIMPLE MIGRATION SCRIPT - Copy and Paste into MySQL
-- Compatible with MySQL 5.7+
-- ============================================================================

USE mt25_db;

-- ============================================================================
-- 1. CERT_TEMPLATE TABLE - Add prerequisites column
-- ============================================================================
ALTER TABLE cert_template
ADD COLUMN prerequisites JSON NULL;

-- ============================================================================
-- 2. CERTIFICATE TABLE - Add ownership column
-- ============================================================================
ALTER TABLE certificate
ADD COLUMN ownership JSON NULL;

-- ============================================================================
-- 3. CERTIFICATE TABLE - Add recipientEmail column
-- ============================================================================
ALTER TABLE certificate
ADD COLUMN recipientEmail VARCHAR(255) NULL
AFTER recipientName;

-- ============================================================================
-- 4. CERTIFICATE TABLE - Add team_name column
-- ============================================================================
ALTER TABLE certificate
ADD COLUMN team_name VARCHAR(255) NULL
AFTER contingent_name;

-- ============================================================================
-- 5. CERTIFICATE TABLE - Add contestName column
-- ============================================================================
ALTER TABLE certificate
ADD COLUMN contestName VARCHAR(255) NULL
AFTER ic_number;

-- ============================================================================
-- 6. CERTIFICATE TABLE - Add issuedAt column
-- ============================================================================
ALTER TABLE certificate
ADD COLUMN issuedAt DATETIME NULL
AFTER status;

-- ============================================================================
-- 7. CREATE INDEXES
-- ============================================================================
CREATE INDEX idx_certificate_recipientEmail ON certificate(recipientEmail);
CREATE INDEX idx_certificate_ic_number ON certificate(ic_number);

-- ============================================================================
-- 8. VERIFY ALL CHANGES
-- ============================================================================

-- Show cert_template columns
SELECT 'cert_template columns:' as info;
SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = 'mt25_db'
    AND TABLE_NAME = 'cert_template'
    AND COLUMN_NAME IN ('prerequisites');

-- Show certificate columns
SELECT 'certificate new columns:' as info;
SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = 'mt25_db'
    AND TABLE_NAME = 'certificate'
    AND COLUMN_NAME IN ('ownership', 'recipientEmail', 'team_name', 'contestName', 'issuedAt');

-- Show indexes
SELECT 'certificate indexes:' as info;
SHOW INDEXES FROM certificate WHERE Key_name IN ('idx_certificate_recipientEmail', 'idx_certificate_ic_number');

SELECT 'Migration Complete!' as status;
