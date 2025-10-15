-- ============================================================
-- Database Migration for Certificate Status Enum
-- Date: October 15, 2025
-- Description: Ensure required status values exist in certificate_status_enum table
-- ============================================================

-- Create certificate_status_enum table if it doesn't exist
CREATE TABLE IF NOT EXISTS certificate_status_enum (
  value VARCHAR(10) PRIMARY KEY
);

-- Insert required status values (ignore if they already exist)
INSERT IGNORE INTO certificate_status_enum (value) VALUES ('ACTIVE');
INSERT IGNORE INTO certificate_status_enum (value) VALUES ('INACTIVE');
INSERT IGNORE INTO certificate_status_enum (value) VALUES ('DRAFT');

-- Verify the values
SELECT * FROM certificate_status_enum;

-- Check if FK constraint exists on cert_template
SHOW CREATE TABLE cert_template;
