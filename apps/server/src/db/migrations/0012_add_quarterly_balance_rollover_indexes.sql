-- Migration: Add indexes for quarterly balance rollover performance optimization
-- Date: 2025-11-18
-- Description: Add composite index on schema_form_data_entries table for efficient previous quarter lookup
--              This index optimizes the query pattern used in fetchPreviousQuarterExecution function
--              which looks up execution records by project, facility, reporting period, and quarter

-- Composite index for efficient previous quarter execution lookup
-- This supports the query pattern: WHERE project_id = ? AND facility_id = ? AND reporting_period_id = ? AND entity_type = 'execution'
-- The JSONB expression index allows efficient filtering by quarter in the form_data
CREATE INDEX IF NOT EXISTS idx_schema_entries_quarter_lookup 
  ON schema_form_data_entries(
    project_id, 
    facility_id, 
    reporting_period_id, 
    entity_type,
    ((form_data->'context'->>'quarter'))
  );

-- Add comment for documentation
COMMENT ON INDEX idx_schema_entries_quarter_lookup IS 'Composite index for quarterly balance rollover - optimizes previous quarter execution lookup by project, facility, period, entity type, and quarter';
