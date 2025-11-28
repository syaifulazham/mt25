-- Migration: Add SCHOOL_WINNER to CertTemplateTargetType enum
-- Date: 2025-01-28
-- Description: Adds 'SCHOOL_WINNER' value to the cert_template and certificate_serial targetType enum
-- This supports school-level winner certificates with rank-based achievement titles

-- Add SCHOOL_WINNER to the cert_template table enum
ALTER TABLE cert_template 
MODIFY COLUMN targetType ENUM(
  'GENERAL',
  'EVENT_PARTICIPANT',
  'EVENT_WINNER',
  'NON_CONTEST_PARTICIPANT',
  'QUIZ_PARTICIPANT',
  'QUIZ_WINNER',
  'TRAINERS',
  'CONTINGENT',
  'SCHOOL_WINNER'
) NOT NULL DEFAULT 'GENERAL';

-- Update certificate_serial table targetType enum as well
ALTER TABLE certificate_serial
MODIFY COLUMN targetType ENUM(
  'GENERAL',
  'EVENT_PARTICIPANT',
  'EVENT_WINNER',
  'NON_CONTEST_PARTICIPANT',
  'QUIZ_PARTICIPANT',
  'QUIZ_WINNER',
  'TRAINERS',
  'CONTINGENT',
  'SCHOOL_WINNER'
) NOT NULL;

-- Verification queries (optional - you can run these to verify)
-- SELECT COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS 
-- WHERE TABLE_NAME = 'cert_template' AND COLUMN_NAME = 'targetType';

-- SELECT COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS 
-- WHERE TABLE_NAME = 'certificate_serial' AND COLUMN_NAME = 'targetType';
