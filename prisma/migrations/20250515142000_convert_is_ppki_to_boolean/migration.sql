-- Convert is_ppki from VARCHAR to BOOLEAN
-- In MySQL, BOOLEAN is implemented as TINYINT(1) where 0=false and 1=true

-- Add a temporary boolean column
ALTER TABLE `contestant` ADD COLUMN `is_ppki_bool` TINYINT(1) NOT NULL DEFAULT 0;

-- Update the temporary column based on the string values
UPDATE `contestant` SET `is_ppki_bool` = CASE WHEN `is_ppki` = '0' THEN 0 ELSE 1 END;

-- Drop the original string column
ALTER TABLE `contestant` DROP COLUMN `is_ppki`;

-- Add the new boolean column with the correct name
ALTER TABLE `contestant` ADD COLUMN `is_ppki` TINYINT(1) NOT NULL DEFAULT 0;

-- Copy values from temporary column to new column
UPDATE `contestant` SET `is_ppki` = `is_ppki_bool`;

-- Drop the temporary column
ALTER TABLE `contestant` DROP COLUMN `is_ppki_bool`;
