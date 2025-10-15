-- ============================================================
-- Database Migration for Certificate Serial Number Tracking
-- Date: October 15, 2025
-- Description: Create certificate_serial table for tracking serial numbers
-- ============================================================

-- Create certificate_serial table
CREATE TABLE IF NOT EXISTS certificate_serial (
  id INT AUTO_INCREMENT PRIMARY KEY,
  year INT NOT NULL,
  templateId INT NOT NULL,
  targetType ENUM('GENERAL', 'EVENT_PARTICIPANT', 'EVENT_WINNER', 'NON_CONTEST_PARTICIPANT') NOT NULL,
  typeCode VARCHAR(10) NOT NULL,
  lastSequence INT NOT NULL DEFAULT 0,
  createdAt DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  -- Constraints and Indexes
  CONSTRAINT unique_year_type UNIQUE (year, targetType, templateId),
  CONSTRAINT fk_cert_serial_template FOREIGN KEY (templateId) REFERENCES cert_template(id) ON DELETE CASCADE,
  
  INDEX idx_year (year),
  INDEX idx_template (templateId),
  INDEX idx_type (targetType)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Verify the table was created
DESCRIBE certificate_serial;

-- Check initial data (should be empty)
SELECT COUNT(*) as record_count FROM certificate_serial;
