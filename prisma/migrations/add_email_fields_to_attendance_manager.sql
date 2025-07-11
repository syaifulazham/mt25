-- Add email and email_status columns to attendanceManager table
ALTER TABLE `attendanceManager` 
ADD COLUMN `email` VARCHAR(255) NULL AFTER `contestGroup`,
ADD COLUMN `email_status` VARCHAR(50) NULL AFTER `email`;
