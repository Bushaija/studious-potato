-- Migration: Enhance statement_templates table for dynamic statement generation
-- Date: 2024-01-15
-- Description: Add columns, validation rules, and statement metadata fields

-- Add new columns to statement_templates table
ALTER TABLE statement_templates 
ADD COLUMN IF NOT EXISTS columns jsonb NOT NULL DEFAULT '[]',
ADD COLUMN IF NOT EXISTS validation_rules jsonb NOT NULL DEFAULT '[]',
ADD COLUMN IF NOT EXISTS statement_metadata jsonb NOT NULL DEFAULT '{}';

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_statement_templates_code ON statement_templates(statement_code);
CREATE INDEX IF NOT EXISTS idx_statement_templates_active ON statement_templates(is_active);
CREATE INDEX IF NOT EXISTS idx_statement_templates_parent ON statement_templates(parent_line_id);

-- Add comments for documentation
COMMENT ON COLUMN statement_templates.columns IS 'Column definitions for the statement (Description, Note, Current FY, Prior FY, etc.)';
COMMENT ON COLUMN statement_templates.validation_rules IS 'Statement validation rules (e.g., Assets = Liabilities + Equity)';
COMMENT ON COLUMN statement_templates.statement_metadata IS 'Statement-level configuration (display options, formatting, etc.)';

-- Update existing records to have proper default values
UPDATE statement_templates 
SET 
  columns = '[]'::jsonb,
  validation_rules = '[]'::jsonb,
  statement_metadata = '{}'::jsonb
WHERE columns IS NULL OR validation_rules IS NULL OR statement_metadata IS NULL;
