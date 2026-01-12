-- Migration: Add payable mapping support to schema_activity_categories
-- This migration adds a payable_activity_id field to enable database-driven expense-to-payable mapping

-- Add payable_activity_id column to schema_activity_categories
-- This column references the payable activity (Section E) that an expense (Section B) maps to
ALTER TABLE schema_activity_categories 
ADD COLUMN payable_activity_id INTEGER;

-- Add foreign key constraint to ensure referential integrity
ALTER TABLE schema_activity_categories
ADD CONSTRAINT fk_payable_activity
FOREIGN KEY (payable_activity_id) 
REFERENCES schema_activity_categories(id)
ON DELETE SET NULL;

-- Add index for performance on payable lookups
CREATE INDEX idx_schema_activity_categories_payable_id 
ON schema_activity_categories(payable_activity_id);

-- Add comment to document the field
COMMENT ON COLUMN schema_activity_categories.payable_activity_id IS 
'References the Section E payable activity that this Section B expense maps to. NULL for non-expense activities or expenses without payables (e.g., transfers).';
