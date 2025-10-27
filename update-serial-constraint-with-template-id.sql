-- Update Serial Number Constraint
-- Serial numbers now include template ID in the format: MT25/PART/T2/000001
-- This makes them globally unique, so we can use a simple unique constraint

-- Drop the composite constraint (templateId, serialNumber)
ALTER TABLE certificate 
DROP INDEX unique_serial_per_template;

-- Add simple unique constraint since serial numbers now include template ID
ALTER TABLE certificate
ADD CONSTRAINT unique_serial_number UNIQUE (serialNumber);

-- Verify the changes
SHOW INDEX FROM certificate WHERE Column_name = 'serialNumber';
