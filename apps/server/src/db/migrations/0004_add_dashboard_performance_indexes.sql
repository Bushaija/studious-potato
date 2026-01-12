-- Migration: Add indexes for dashboard performance optimization
-- Date: 2025-10-26
-- Description: Add performance indexes for dashboard queries to optimize budget aggregation,
--              program distribution, and approval tracking across province, district, and facility levels

-- Index on projects for efficient facility and reporting period lookups with active status filter
-- This supports queries that need to find active projects for specific facilities and periods
CREATE INDEX IF NOT EXISTS idx_projects_facility_period_active 
  ON projects(facility_id, reporting_period_id) 
  WHERE status = 'ACTIVE';

-- Index on schema_form_data_entries for efficient entity type, facility, and period lookups
-- This supports dashboard queries that aggregate planning/execution data by facility
CREATE INDEX IF NOT EXISTS idx_schema_entries_entity_facility_period 
  ON schema_form_data_entries(entity_type, facility_id, reporting_period_id);

-- Index on schema_form_data_entries for efficient project and entity type lookups
-- This supports queries that need to find all planning or execution entries for specific projects
CREATE INDEX IF NOT EXISTS idx_schema_entries_project_entity 
  ON schema_form_data_entries(project_id, entity_type);

-- Partial index on schema_form_data_entries for approval status filtering
-- This supports approval tracking queries that filter by status
-- Using partial index to only index relevant statuses for better performance
CREATE INDEX IF NOT EXISTS idx_schema_entries_approval_status_filtered 
  ON schema_form_data_entries(approval_status) 
  WHERE approval_status IN ('APPROVED', 'PENDING', 'REJECTED');

-- Add comments for documentation
COMMENT ON INDEX idx_projects_facility_period_active IS 'Partial index for active projects by facility and reporting period (dashboard queries)';
COMMENT ON INDEX idx_schema_entries_entity_facility_period IS 'Composite index for entity type, facility, and period lookups (budget aggregation)';
COMMENT ON INDEX idx_schema_entries_project_entity IS 'Composite index for project and entity type lookups (project-level queries)';
COMMENT ON INDEX idx_schema_entries_approval_status_filtered IS 'Partial index for approval status filtering (approval tracking queries)';
