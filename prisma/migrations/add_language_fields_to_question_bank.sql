-- Add language fields to question_bank table
ALTER TABLE question_bank 
ADD COLUMN main_lang VARCHAR(10) NULL,
ADD COLUMN alt_lang VARCHAR(10) NULL,
ADD COLUMN alt_question TEXT NULL;

-- Add indexes for language fields for better query performance
CREATE INDEX idx_question_bank_main_lang ON question_bank(main_lang);
CREATE INDEX idx_question_bank_alt_lang ON question_bank(alt_lang);
