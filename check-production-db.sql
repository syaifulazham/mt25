-- ============================================
-- PRODUCTION DATABASE CHECK SCRIPT
-- Run this on production to diagnose issues
-- ============================================

-- 1. Check if TRAINERS enum exists in cert_template
SHOW COLUMNS FROM cert_template LIKE 'targetType';

-- 2. Check if certificate table has required columns
DESCRIBE certificate;

-- 3. Check if any trainers exist
SELECT COUNT(*) as trainer_count FROM attendanceManager;

-- 4. Check if there are any certificates with recipientType = 'TRAINER'
SELECT COUNT(*) as trainer_cert_count 
FROM certificate 
WHERE recipientType = 'TRAINER';

-- 5. Check cert_template for TRAINERS type
SELECT id, templateName, targetType, status 
FROM cert_template 
WHERE targetType = 'TRAINERS';

-- 6. Verify table structure matches
SELECT TABLE_NAME, COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_DEFAULT
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME IN ('certificate', 'cert_template', 'attendanceManager', 'manager')
ORDER BY TABLE_NAME, ORDINAL_POSITION;
