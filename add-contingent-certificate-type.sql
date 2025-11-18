-- Migration: Add CONTINGENT to CertTemplateTargetType enum
-- Date: 2025-01-18
-- Description: Adds 'CONTINGENT' value to the cert_template targetType enum

-- Add CONTINGENT to the enum
ALTER TABLE cert_template 
MODIFY COLUMN targetType ENUM(
  'GENERAL',
  'EVENT_PARTICIPANT',
  'EVENT_WINNER',
  'NON_CONTEST_PARTICIPANT',
  'QUIZ_PARTICIPANT',
  'QUIZ_WINNER',
  'TRAINERS',
  'CONTINGENT'
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
  'CONTINGENT'
) NOT NULL;
