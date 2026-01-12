-- Migration: Add Section X (Miscellaneous Adjustments) for double-entry Other Receivables
-- This migration adds Section X category and activities to support proper double-entry accounting
-- for Other Receivables, ensuring Cash at Bank is automatically reduced when receivables are recorded.

-- Note: This migration does not modify existing data. The seed file will populate Section X.
-- Section D "Other Receivables" will be updated in the seed to mark it as computed.

-- Add comment to document the new section
COMMENT ON TABLE schema_activity_categories IS 
'Activity categories for execution forms. Section X (Miscellaneous Adjustments) added for double-entry Other Receivables tracking.';
