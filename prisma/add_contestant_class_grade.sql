-- SQL Migration to add contestant_class_grade field to targetgroup table
-- Safe to run on production without data loss

ALTER TABLE targetgroup ADD COLUMN contestant_class_grade VARCHAR(255) NULL;
