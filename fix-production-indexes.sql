-- ============================================
-- FIX PRODUCTION INDEXES
-- Run this if the main deployment script fails on indexes
-- ============================================

-- Drop and recreate indexes (safer than ADD INDEX IF NOT EXISTS)

-- 1. Drop existing indexes if they exist (ignore errors if they don't exist)
ALTER TABLE certificate DROP INDEX IF EXISTS idx_recipient_type;
ALTER TABLE certificate DROP INDEX IF EXISTS idx_ic_number;
ALTER TABLE certificate DROP INDEX IF EXISTS idx_trainer_certificates;

-- 2. Add indexes
ALTER TABLE certificate ADD INDEX idx_recipient_type (recipientType);
ALTER TABLE certificate ADD INDEX idx_ic_number (ic_number);
ALTER TABLE certificate ADD INDEX idx_trainer_certificates (ic_number, recipientType, templateId);

-- 3. Verify
SHOW INDEX FROM certificate WHERE Key_name IN ('idx_recipient_type', 'idx_ic_number', 'idx_trainer_certificates');
