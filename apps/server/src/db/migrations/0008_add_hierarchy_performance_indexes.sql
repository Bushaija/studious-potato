-- Migration: Add indexes for district-based role hierarchy performance optimization
-- Date: 2025-10-31
-- Description: Add performance indexes for DAF/DG user lookups and facility hierarchy queries
--              to support district-based approval workflows

-- Index 1: Composite index on users table for DAF/DG role lookups
-- This enables efficient filtering of DAF and DG users by facility and active status
-- Used when routing approvals to find eligible approvers at a specific hospital
CREATE INDEX IF NOT EXISTS idx_users_role_facility_active 
  ON users(role, facility_id, is_active)
  WHERE role IN ('daf', 'dg');

-- Index 2: Composite index on financial_reports for queue queries
-- This enables efficient filtering of reports by facility and status for approval queues
-- Used by DAF and DG users to retrieve their pending approval queues
CREATE INDEX IF NOT EXISTS idx_financial_reports_facility_status 
  ON financial_reports(facility_id, status);

-- Add comments for documentation
COMMENT ON INDEX idx_users_role_facility_active IS 'Partial index for DAF/DG user lookups by facility and active status (approval routing)';
COMMENT ON INDEX idx_financial_reports_facility_status IS 'Composite index for facility and status filtering (approval queue queries)';

-- Verification: Check existing indexes on facilities table
-- The following indexes should already exist from previous migrations:
-- - idx_facilities_parent (on parent_facility_id) - for finding child facilities
-- - idx_facilities_district_type (on district_id, facility_type) - for district-scoped queries
-- These indexes are defined in the schema and migration 0003_add_multi_scope_indexes.sql
