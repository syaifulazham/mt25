-- Fix Serial Number Constraint
-- Change from globally unique to unique per template
-- This allows different templates to have the same serial numbers

-- Drop the existing unique constraint on serialNumber
ALTER TABLE certificate 
DROP INDEX unique_serial_number;

-- Add composite unique constraint on (templateId, serialNumber)
-- This ensures serial numbers are unique per template
ALTER TABLE certificate
ADD CONSTRAINT unique_serial_per_template UNIQUE (templateId, serialNumber);

-- Verify the changes
SHOW INDEX FROM certificate WHERE Key_name = 'unique_serial_per_template';
