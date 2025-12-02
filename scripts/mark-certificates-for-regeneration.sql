-- Mark GENERAL certificates ONLY for on-demand regeneration
-- Preserves: EVENT_WINNER, TRAINERS, CONTINGENT certificates
-- This updates database records to indicate PDFs should be regenerated when requested

-- Step 1: Backup current state (GENERAL only)
CREATE TABLE IF NOT EXISTS certificate_backup_20241202 AS 
SELECT c.* 
FROM certificate c
JOIN cert_template ct ON c.templateId = ct.id
WHERE ct.targetType = 'GENERAL';

-- Step 2: Mark ONLY GENERAL certificates for regeneration (set filePath to NULL, status to LISTED)
-- This preserves uniqueCode and serialNumber for regeneration
UPDATE certificate c
JOIN cert_template ct ON c.templateId = ct.id
SET 
    c.filePath = NULL,
    c.status = 'LISTED',
    c.updatedAt = NOW()
WHERE ct.targetType = 'GENERAL'
  AND c.filePath IS NOT NULL;

-- Step 3: Check results
SELECT 
    status,
    COUNT(*) as count,
    SUM(CASE WHEN filePath IS NULL THEN 1 ELSE 0 END) as needs_regeneration
FROM certificate
GROUP BY status;

-- Step 4: Show certificates by template type
SELECT 
    ct.targetType,
    COUNT(c.id) as total,
    SUM(CASE WHEN c.filePath IS NULL THEN 1 ELSE 0 END) as needs_regen,
    SUM(CASE WHEN c.filePath IS NOT NULL THEN 1 ELSE 0 END) as has_pdf,
    CASE 
        WHEN ct.targetType = 'GENERAL' THEN 'Marked for regen'
        ELSE 'Preserved'
    END as action
FROM certificate c
JOIN cert_template ct ON c.templateId = ct.id
GROUP BY ct.targetType
ORDER BY ct.targetType;

-- Notes:
-- - Only GENERAL certificates are marked for regeneration
-- - EVENT_WINNER, TRAINERS, CONTINGENT certificates are untouched
-- - uniqueCode and serialNumber are preserved for all certificates
-- - GENERAL certificates can be regenerated using existing APIs
-- - After deleting GENERAL PDF files, they will be regenerated on first request
-- - GENERAL PDF files can be safely deleted after this update
