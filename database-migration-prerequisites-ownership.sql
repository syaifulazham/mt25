-- ============================================================================
-- Certificate Template Prerequisites & Certificate Ownership Migration
-- Date: October 21, 2025
-- Description: Add prerequisites column to cert_template and ownership to certificate
-- ============================================================================

-- Use the correct database
USE mt25_db;

-- ============================================================================
-- 1. Add prerequisites column to cert_template table
-- ============================================================================

-- Add prerequisites field (JSON) - stores survey prerequisites
-- Example: [{"prerequisite": "survey", "id": 1}, {"prerequisite": "survey", "id": 2}]
ALTER TABLE cert_template
ADD COLUMN IF NOT EXISTS prerequisites JSON NULL
COMMENT 'Survey prerequisites for certificate generation in JSON format';

-- ============================================================================
-- 2. Add ownership column to certificate table
-- ============================================================================

-- Add ownership field (JSON) - stores ownership metadata
-- Example: {"year": 2025, "contingentId": 123, "contestantId": 6501}
ALTER TABLE certificate
ADD COLUMN IF NOT EXISTS ownership JSON NULL
COMMENT 'Ownership metadata including year, contingentId, and contestantId';

-- ============================================================================
-- 3. Verify the changes
-- ============================================================================

-- Display cert_template table structure (check for prerequisites column)
SELECT 
    COLUMN_NAME,
    DATA_TYPE,
    IS_NULLABLE,
    COLUMN_COMMENT
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = 'mt25_db'
    AND TABLE_NAME = 'cert_template'
    AND COLUMN_NAME = 'prerequisites';

-- Display certificate table structure (check for ownership column)
SELECT 
    COLUMN_NAME,
    DATA_TYPE,
    IS_NULLABLE,
    COLUMN_COMMENT
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = 'mt25_db'
    AND TABLE_NAME = 'certificate'
    AND COLUMN_NAME = 'ownership';

-- ============================================================================
-- 4. Sample data queries
-- ============================================================================

-- Count templates with prerequisites
SELECT 
    COUNT(*) as total_templates,
    SUM(CASE WHEN prerequisites IS NOT NULL THEN 1 ELSE 0 END) as templates_with_prerequisites,
    SUM(CASE WHEN prerequisites IS NULL THEN 1 ELSE 0 END) as templates_without_prerequisites
FROM cert_template;

-- Count certificates with ownership data
SELECT 
    COUNT(*) as total_certificates,
    SUM(CASE WHEN ownership IS NOT NULL THEN 1 ELSE 0 END) as certificates_with_ownership,
    SUM(CASE WHEN ownership IS NULL THEN 1 ELSE 0 END) as certificates_without_ownership
FROM certificate;

-- ============================================================================
-- 5. Example data for testing (optional - commented out)
-- ============================================================================

-- Example: Add prerequisites to a template
-- UPDATE cert_template 
-- SET prerequisites = JSON_ARRAY(
--     JSON_OBJECT('prerequisite', 'survey', 'id', 1),
--     JSON_OBJECT('prerequisite', 'survey', 'id', 2)
-- )
-- WHERE id = 1;

-- Example: Add ownership to a certificate
-- UPDATE certificate 
-- SET ownership = JSON_OBJECT(
--     'year', YEAR(CURDATE()),
--     'contingentId', 123,
--     'contestantId', 6501
-- )
-- WHERE id = 1;

-- ============================================================================
-- ROLLBACK SCRIPT (Use only if needed to revert changes)
-- ============================================================================

-- WARNING: Uncomment and run these commands ONLY if you need to rollback
-- This will permanently delete the columns and their data!

-- ALTER TABLE cert_template DROP COLUMN IF EXISTS prerequisites;
-- ALTER TABLE certificate DROP COLUMN IF EXISTS ownership;

-- ============================================================================
-- END OF MIGRATION SCRIPT
-- ============================================================================
