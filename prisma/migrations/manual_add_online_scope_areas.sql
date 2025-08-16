-- Manual migration to add online scope areas to existing enum
-- This is safe to run on production as it only adds new enum values

ALTER TABLE `event` MODIFY COLUMN `scopeArea` ENUM('NATIONAL', 'ZONE', 'STATE', 'OPEN', 'DISTRICT', 'ONLINE_NATIONAL', 'ONLINE_ZONE', 'ONLINE_STATE', 'ONLINE_OPEN') NOT NULL DEFAULT 'OPEN';
