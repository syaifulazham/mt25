-- ============================================
-- FIX: Add TRAINERS to certificate_serial targetType enum
-- ============================================

-- Check current enum values first
SHOW COLUMNS FROM certificate_serial LIKE 'targetType';

-- Update the enum to include TRAINERS
ALTER TABLE certificate_serial 
MODIFY COLUMN targetType ENUM(
  'GENERAL',
  'EVENT_PARTICIPANT',
  'EVENT_WINNER',
  'NON_CONTEST_PARTICIPANT',
  'QUIZ_PARTICIPANT',
  'QUIZ_WINNER',
  'TRAINERS'
) DEFAULT NULL;

-- Verify the change
SHOW COLUMNS FROM certificate_serial LIKE 'targetType';

SELECT 'certificate_serial targetType enum updated successfully!' AS status;
