-- ============================================================
-- Database Migration for Certificate Serial Number
-- Date: October 15, 2025
-- Description: Add serialNumber column to certificate table
-- ============================================================

-- Add serialNumber column to certificate table
ALTER TABLE certificate
ADD COLUMN serialNumber VARCHAR(50) NULL
AFTER uniqueCode;

-- Add unique index for serialNumber
ALTER TABLE certificate
ADD CONSTRAINT unique_serial_number UNIQUE (serialNumber);

-- Verify the changes
DESCRIBE certificate;

-- Check existing certificates (should show NULL for serialNumber)
SELECT id, recipientName, uniqueCode, serialNumber, status, createdAt
FROM certificate
ORDER BY id DESC
LIMIT 10;
