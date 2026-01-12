-- Migration: Add indexes for approval workflow performance optimization
-- Date: 2024-10-23
-- Description: Add performance indexes for approval status and reviewed_by fields on schema_form_data_entries and approval_audit_log tables

-- Add indexes for approval status and reviewed_by fields on schema_form_data_entries
CREATE INDEX IF NOT EXISTS idx_schema_form_data_entries_approval_status 
  ON schema_form_data_entries(approval_status);

CREATE INDEX IF NOT EXISTS idx_schema_form_data_entries_reviewed_by 
  ON schema_form_data_entries(reviewed_by);

CREATE INDEX IF NOT EXISTS idx_schema_form_data_entries_reviewed_at 
  ON schema_form_data_entries(reviewed_at);

-- Add composite index for approval workflow queries
CREATE INDEX IF NOT EXISTS idx_schema_form_data_entries_approval_workflow 
  ON schema_form_data_entries(approval_status, reviewed_by, reviewed_at);

-- Add indexes for approval_audit_log table for performance
CREATE INDEX IF NOT EXISTS idx_approval_audit_log_planning_id 
  ON approval_audit_log(planning_id);

CREATE INDEX IF NOT EXISTS idx_approval_audit_log_action_by 
  ON approval_audit_log(action_by);

CREATE INDEX IF NOT EXISTS idx_approval_audit_log_action_at 
  ON approval_audit_log(action_at);

CREATE INDEX IF NOT EXISTS idx_approval_audit_log_new_status 
  ON approval_audit_log(new_status);

-- Add composite index for audit trail queries
CREATE INDEX IF NOT EXISTS idx_approval_audit_log_planning_timeline 
  ON approval_audit_log(planning_id, action_at DESC);

-- Add comments for documentation
COMMENT ON INDEX idx_schema_form_data_entries_approval_status IS 'Index for filtering plans by approval status';
COMMENT ON INDEX idx_schema_form_data_entries_reviewed_by IS 'Index for finding plans reviewed by specific users';
COMMENT ON INDEX idx_schema_form_data_entries_reviewed_at IS 'Index for sorting plans by review date';
COMMENT ON INDEX idx_schema_form_data_entries_approval_workflow IS 'Composite index for approval workflow queries';
COMMENT ON INDEX idx_approval_audit_log_planning_id IS 'Index for finding audit entries by plan ID';
COMMENT ON INDEX idx_approval_audit_log_action_by IS 'Index for finding audit entries by user';
COMMENT ON INDEX idx_approval_audit_log_action_at IS 'Index for sorting audit entries by timestamp';
COMMENT ON INDEX idx_approval_audit_log_new_status IS 'Index for filtering audit entries by status';
COMMENT ON INDEX idx_approval_audit_log_planning_timeline IS 'Composite index for audit trail timeline queries';