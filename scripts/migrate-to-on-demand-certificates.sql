-- Migration Script: Enable On-Demand Certificate Generation
-- This script updates existing certificate records to support on-demand PDF generation
-- 
-- IMPORTANT: Run this only after verifying the on-demand system works correctly!
-- 
-- Usage:
--   1. Test the on-demand system first with new certificates
--   2. Create a database backup: mysqldump database_name > backup.sql
--   3. Run this script in stages (uncomment sections as needed)

-- ============================================================================
-- STAGE 1: Analysis - Check current certificate statistics
-- ============================================================================

-- Count total certificates
SELECT 
    COUNT(*) as total_certificates,
    COUNT(filePath) as with_files,
    COUNT(*) - COUNT(filePath) as without_files,
    ROUND(COUNT(filePath) * 100.0 / COUNT(*), 2) as percentage_with_files
FROM certificate;

-- Count by target type
SELECT 
    targetType,
    COUNT(*) as total,
    COUNT(filePath) as with_files,
    COUNT(*) - COUNT(filePath) as without_files
FROM certificate
GROUP BY targetType
ORDER BY total DESC;

-- Count by status
SELECT 
    status,
    COUNT(*) as total,
    COUNT(filePath) as with_files
FROM certificate
GROUP BY status
ORDER BY total DESC;

-- Check for orphaned file references (files that don't exist)
-- Note: This requires manual verification on the file system
SELECT 
    id,
    recipientName,
    filePath,
    status,
    createdAt
FROM certificate
WHERE filePath IS NOT NULL
ORDER BY createdAt DESC
LIMIT 20;

-- ============================================================================
-- STAGE 2: Backup - Create backup table (RECOMMENDED)
-- ============================================================================

-- Create backup table with all current data
-- Uncomment to execute:
/*
CREATE TABLE certificate_backup_before_migration AS 
SELECT * FROM certificate;

-- Verify backup
SELECT COUNT(*) FROM certificate_backup_before_migration;
*/

-- ============================================================================
-- STAGE 3: Test Migration - Update a small sample first
-- ============================================================================

-- Test with 10 certificates first
-- Uncomment to execute:
/*
UPDATE certificate 
SET filePath = NULL
WHERE id IN (
    SELECT id FROM certificate 
    WHERE filePath IS NOT NULL 
    LIMIT 10
);

-- Verify these certificates still work (test downloads manually)
SELECT id, recipientName, uniqueCode, filePath, status
FROM certificate
WHERE filePath IS NULL
LIMIT 10;
*/

-- ============================================================================
-- STAGE 4: Full Migration - Update all certificates
-- ============================================================================

-- WARNING: This will set filePath = NULL for ALL certificates
-- Only run after thoroughly testing Stage 3!
-- Uncomment to execute:
/*
UPDATE certificate 
SET filePath = NULL
WHERE filePath IS NOT NULL;

-- Verify migration
SELECT 
    COUNT(*) as total_migrated,
    COUNT(*) - COUNT(filePath) as now_on_demand
FROM certificate;
*/

-- ============================================================================
-- STAGE 5: Cleanup - Remove backup table (Optional)
-- ============================================================================

-- Only after confirming everything works perfectly
-- Uncomment to execute:
/*
DROP TABLE IF EXISTS certificate_backup_before_migration;
*/

-- ============================================================================
-- ROLLBACK SCRIPT - Restore from backup if needed
-- ============================================================================

-- If something goes wrong, restore from backup
-- Uncomment to execute:
/*
UPDATE certificate c
INNER JOIN certificate_backup_before_migration b ON c.id = b.id
SET c.filePath = b.filePath
WHERE b.filePath IS NOT NULL;

-- Verify rollback
SELECT COUNT(*) as restored FROM certificate WHERE filePath IS NOT NULL;
*/

-- ============================================================================
-- VERIFICATION QUERIES - Run after migration
-- ============================================================================

-- Check migration status
SELECT 
    'Total Certificates' as metric,
    COUNT(*) as count
FROM certificate

UNION ALL

SELECT 
    'On-Demand (filePath = NULL)' as metric,
    COUNT(*) as count
FROM certificate
WHERE filePath IS NULL

UNION ALL

SELECT 
    'Legacy (filePath set)' as metric,
    COUNT(*) as count
FROM certificate
WHERE filePath IS NOT NULL;

-- Check by certificate type
SELECT 
    targetType,
    COUNT(*) as total,
    SUM(CASE WHEN filePath IS NULL THEN 1 ELSE 0 END) as on_demand,
    SUM(CASE WHEN filePath IS NOT NULL THEN 1 ELSE 0 END) as legacy
FROM certificate
GROUP BY targetType;

-- Check recent certificates
SELECT 
    id,
    recipientName,
    targetType,
    CASE 
        WHEN filePath IS NULL THEN 'On-Demand'
        ELSE 'Legacy'
    END as generation_mode,
    status,
    createdAt
FROM certificate
ORDER BY createdAt DESC
LIMIT 20;

-- ============================================================================
-- NOTES:
-- ============================================================================
-- 
-- 1. TESTING BEFORE MIGRATION:
--    - Generate a few new certificates (should have filePath = NULL)
--    - Download them to verify on-demand generation works
--    - Test bulk downloads
--    - Test all certificate types (school, state, online, national, quiz)
--
-- 2. RECOMMENDED MIGRATION APPROACH:
--    - Stage 1: Analyze current data
--    - Stage 2: Create backup
--    - Stage 3: Test with small sample (10-20 certificates)
--    - Verify downloads work correctly
--    - Stage 4: Full migration if testing successful
--    - Clean up physical files using cleanup-certificate-files.js script
--
-- 3. BENEFITS OF GRADUAL MIGRATION:
--    - New certificates automatically use on-demand generation
--    - Old certificates with files continue to work
--    - No disruption to users
--    - Can migrate in batches
--
-- 4. BACKWARD COMPATIBILITY:
--    - System checks filePath first
--    - If NULL or file missing → generates on-demand
--    - If file exists → uses physical file
--    - Fully backward compatible
--
-- 5. STORAGE CLEANUP:
--    After migration, use the cleanup script to remove physical files:
--    node scripts/cleanup-certificate-files.js --backup
--
-- ============================================================================
