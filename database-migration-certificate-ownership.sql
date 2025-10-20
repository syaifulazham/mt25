-- Add ownership column to certificate table
-- This column stores ownership information in JSON format
-- Example: {"year": 2025, "contingentId": 212, "contestantId": 6501}

USE mtdb;

-- Add the ownership column
ALTER TABLE certificate 
ADD COLUMN ownership JSON NULL 
COMMENT 'Ownership information in JSON format. Example: {"year": 2025, "contingentId": 212, "contestantId": 6501}'
AFTER updatedAt;

-- Verify the change
DESCRIBE certificate;

-- Show the new column details
SELECT 
    COLUMN_NAME,
    COLUMN_TYPE,
    IS_NULLABLE,
    COLUMN_DEFAULT,
    COLUMN_COMMENT
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = 'mtdb' 
  AND TABLE_NAME = 'certificate' 
  AND COLUMN_NAME = 'ownership';

-- Example of how to query certificates by ownership
-- Find certificates for a specific year
SELECT id, recipientName, uniqueCode, ownership
FROM certificate
WHERE ownership IS NOT NULL
  AND JSON_EXTRACT(ownership, '$.year') = 2025
LIMIT 10;

-- Find certificates for a specific contingent
SELECT id, recipientName, uniqueCode, ownership
FROM certificate
WHERE ownership IS NOT NULL
  AND JSON_EXTRACT(ownership, '$.contingentId') = 212
LIMIT 10;

-- Find certificates for a specific contestant
SELECT id, recipientName, uniqueCode, ownership
FROM certificate
WHERE ownership IS NOT NULL
  AND JSON_EXTRACT(ownership, '$.contestantId') = 6501
LIMIT 10;

-- Count certificates by year
SELECT 
    JSON_EXTRACT(ownership, '$.year') as year,
    COUNT(*) as certificate_count
FROM certificate
WHERE ownership IS NOT NULL
GROUP BY JSON_EXTRACT(ownership, '$.year')
ORDER BY year DESC;

-- Count certificates by contingent for a specific year
SELECT 
    JSON_EXTRACT(ownership, '$.contingentId') as contingentId,
    COUNT(*) as certificate_count
FROM certificate
WHERE ownership IS NOT NULL
  AND JSON_EXTRACT(ownership, '$.year') = 2025
GROUP BY JSON_EXTRACT(ownership, '$.contingentId')
ORDER BY certificate_count DESC;
