-- Targeted cleanup: Remove only GENERAL certificate type PDFs
-- Preserve: EVENT_WINNER, TRAINERS, CONTINGENT certificates

-- Step 1: Backup current state
CREATE TABLE IF NOT EXISTS certificate_backup_general_20241202 AS 
SELECT * FROM certificate 
WHERE templateId IN (
  SELECT id FROM cert_template WHERE targetType = 'GENERAL'
);

-- Step 2: Get count before cleanup
SELECT 
    ct.targetType,
    COUNT(c.id) as total_certificates,
    SUM(CASE WHEN c.filePath IS NOT NULL THEN 1 ELSE 0 END) as has_pdf,
    SUM(CASE WHEN c.filePath IS NULL THEN 1 ELSE 0 END) as needs_regen
FROM certificate c
JOIN cert_template ct ON c.templateId = ct.id
GROUP BY ct.targetType
ORDER BY ct.targetType;

-- Step 3: Mark ONLY GENERAL certificates for regeneration
-- This preserves uniqueCode and serialNumber
UPDATE certificate c
JOIN cert_template ct ON c.templateId = ct.id
SET 
    c.filePath = NULL,
    c.status = 'LISTED',
    c.updatedAt = NOW()
WHERE ct.targetType = 'GENERAL'
  AND c.filePath IS NOT NULL;

-- Step 4: Verify results
SELECT 
    ct.targetType,
    COUNT(c.id) as total,
    SUM(CASE WHEN c.filePath IS NULL THEN 1 ELSE 0 END) as needs_regen,
    SUM(CASE WHEN c.filePath IS NOT NULL THEN 1 ELSE 0 END) as has_pdf,
    ROUND(SUM(CASE WHEN c.filePath IS NULL THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 2) as regen_percentage
FROM certificate c
JOIN cert_template ct ON c.templateId = ct.id
GROUP BY ct.targetType
ORDER BY ct.targetType;

-- Step 5: Get list of GENERAL certificate file paths for deletion script
SELECT DISTINCT c.filePath
FROM certificate c
JOIN cert_template ct ON c.templateId = ct.id
WHERE ct.targetType = 'GENERAL'
  AND c.filePath IS NOT NULL
INTO OUTFILE '/tmp/general_cert_files.txt'
LINES TERMINATED BY '\n';

-- Summary: What will be preserved
SELECT 
    'PRESERVED CERTIFICATE TYPES' as summary,
    COUNT(c.id) as total_certificates,
    SUM(CASE WHEN c.filePath IS NOT NULL THEN 1 ELSE 0 END) as with_pdf_files
FROM certificate c
JOIN cert_template ct ON c.templateId = ct.id
WHERE ct.targetType IN ('EVENT_WINNER', 'TRAINERS', 'CONTINGENT');

-- Summary: What will be deleted
SELECT 
    'GENERAL CERTIFICATES TO DELETE' as summary,
    COUNT(c.id) as total_certificates,
    SUM(CASE WHEN c.filePath IS NOT NULL THEN 1 ELSE 0 END) as pdf_files_to_delete
FROM certificate c
JOIN cert_template ct ON c.templateId = ct.id
WHERE ct.targetType = 'GENERAL';

-- Notes:
-- - Only GENERAL certificates are marked for regeneration
-- - EVENT_WINNER, TRAINERS, CONTINGENT certificates are untouched
-- - uniqueCode and serialNumber are preserved for all certificates
-- - Run the companion bash script to delete the actual PDF files
