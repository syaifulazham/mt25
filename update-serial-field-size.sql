-- Update serialNumber field size
-- New format MT25/PART/T13/000001 is longer than old format MT25/PART/000001
-- Increase from VARCHAR(50) to VARCHAR(60) to accommodate longer template IDs

ALTER TABLE certificate 
MODIFY COLUMN serialNumber VARCHAR(60) NULL;

-- Verify the change
DESCRIBE certificate;
