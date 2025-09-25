-- Add class_grade_array column to targetgroup table
ALTER TABLE targetgroup ADD COLUMN class_grade_array JSON DEFAULT NULL;
