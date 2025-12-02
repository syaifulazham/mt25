-- List GENERAL certificate file paths for verification

-- Summary of GENERAL certificates
SELECT 
    '=== GENERAL Certificate Summary ===' as info;

SELECT 
    COUNT(*) as total_general_certs,
    SUM(CASE WHEN c.filePath IS NOT NULL THEN 1 ELSE 0 END) as with_filepath,
    SUM(CASE WHEN c.filePath IS NULL THEN 1 ELSE 0 END) as without_filepath,
    COUNT(DISTINCT c.filePath) as unique_filepaths
FROM certificate c
JOIN cert_template ct ON c.templateId = ct.id
WHERE ct.targetType = 'GENERAL';

-- Sample file paths (first 20)
SELECT 
    '\n=== Sample File Paths (first 20) ===' as info;

SELECT 
    c.id,
    c.filePath,
    c.status,
    c.recipientName,
    DATE(c.createdAt) as created_date
FROM certificate c
JOIN cert_template ct ON c.templateId = ct.id
WHERE ct.targetType = 'GENERAL'
  AND c.filePath IS NOT NULL
ORDER BY c.id
LIMIT 20;

-- Count by status
SELECT 
    '\n=== GENERAL Certificates by Status ===' as info;

SELECT 
    c.status,
    COUNT(*) as count,
    SUM(CASE WHEN c.filePath IS NOT NULL THEN 1 ELSE 0 END) as has_filepath,
    CONCAT(ROUND(SUM(CASE WHEN c.filePath IS NOT NULL THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 1), '%') as percentage
FROM certificate c
JOIN cert_template ct ON c.templateId = ct.id
WHERE ct.targetType = 'GENERAL'
GROUP BY c.status;

-- File path patterns
SELECT 
    '\n=== File Path Patterns ===' as info;

SELECT 
    SUBSTRING_INDEX(c.filePath, '/', 3) as path_prefix,
    COUNT(*) as count
FROM certificate c
JOIN cert_template ct ON c.templateId = ct.id
WHERE ct.targetType = 'GENERAL'
  AND c.filePath IS NOT NULL
GROUP BY path_prefix
ORDER BY count DESC
LIMIT 10;

-- Export file paths to file (run this separately if needed)
-- SELECT DISTINCT CONCAT('public', c.filePath) as full_path
-- FROM certificate c
-- JOIN cert_template ct ON c.templateId = ct.id
-- WHERE ct.targetType = 'GENERAL'
--   AND c.filePath IS NOT NULL
-- INTO OUTFILE '/tmp/general_cert_paths.txt';
