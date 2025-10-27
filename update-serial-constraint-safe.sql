-- Update Serial Number Constraint (Safe Version)
-- Handles cases where constraints may or may not exist

-- Check and drop unique_serial_per_template if it exists
SET @constraint_exists = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'certificate'
    AND CONSTRAINT_NAME = 'unique_serial_per_template'
);

SET @sql1 = IF(@constraint_exists > 0,
  'ALTER TABLE certificate DROP INDEX unique_serial_per_template',
  'SELECT "unique_serial_per_template does not exist, skipping" as message'
);

PREPARE stmt1 FROM @sql1;
EXECUTE stmt1;
DEALLOCATE PREPARE stmt1;

-- Check and drop unique_serial_number if it exists
SET @constraint_exists2 = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'certificate'
    AND CONSTRAINT_NAME = 'unique_serial_number'
);

SET @sql2 = IF(@constraint_exists2 > 0,
  'ALTER TABLE certificate DROP INDEX unique_serial_number',
  'SELECT "unique_serial_number does not exist, skipping" as message'
);

PREPARE stmt2 FROM @sql2;
EXECUTE stmt2;
DEALLOCATE PREPARE stmt2;

-- Add simple unique constraint (only if it doesn't exist)
SET @constraint_exists3 = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'certificate'
    AND CONSTRAINT_NAME = 'unique_serial_number'
);

SET @sql3 = IF(@constraint_exists3 = 0,
  'ALTER TABLE certificate ADD CONSTRAINT unique_serial_number UNIQUE (serialNumber)',
  'SELECT "unique_serial_number already exists, skipping" as message'
);

PREPARE stmt3 FROM @sql3;
EXECUTE stmt3;
DEALLOCATE PREPARE stmt3;

-- Verify the changes
SHOW INDEX FROM certificate WHERE Column_name = 'serialNumber';
