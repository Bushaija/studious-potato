-- Migration: Add index for approval status filtering
-- Date: 2025-10-28
-- Description: Add performance index on approval_status column for budget calculation queries
--              that filter planning entries by approval status (APPROVED only)
--              Note: Migration 0004 added a partial index for APPROVED/PENDING/REJECTED statuses.
--              This migration adds a full index to optimize all approval status queries.

-- Full index on schema_form_data_entries.approval_status for efficient filtering
-- This supports budget calculation queries that filter by approvalStatus = 'APPROVED'
-- and other approval workflow queries across all statuses
CREATE INDEX IF NOT EXISTS idx_schema_entries_approval_status 
  ON schema_form_data_entries(approval_status);

-- Add comment for documentation
COMMENT ON INDEX idx_schema_entries_approval_status IS 'Index for approval status filtering in budget calculations and approval workflows';
