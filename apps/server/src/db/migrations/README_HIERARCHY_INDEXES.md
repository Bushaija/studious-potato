# Hierarchy Performance Indexes Migration

## Overview

This migration adds database indexes to optimize performance for the district-based role hierarchy and approval system. These indexes support efficient DAF/DG user lookups and facility hierarchy queries required for the approval workflow.

## Migration File

- **File**: `0008_add_hierarchy_performance_indexes.sql`
- **Date**: 2025-10-31
- **Requirements**: 2.1, 3.1, 6.1, 6.2

## Indexes Created

### 1. Users Table - DAF/DG Role Lookup Index

```sql
CREATE INDEX IF NOT EXISTS idx_users_role_facility_active 
  ON users(role, facility_id, is_active)
  WHERE role IN ('daf', 'dg');
```

**Purpose**: Enables efficient filtering of DAF and DG users by facility and active status.

**Use Cases**:
- Finding DAF users at a specific hospital for approval routing
- Finding DG users at a specific hospital for final approval
- Filtering active approvers during workflow transitions

**Query Pattern**:
```sql
SELECT * FROM users 
WHERE role = 'daf' 
  AND facility_id = 1 
  AND is_active = true;
```

**Performance Impact**: 
- Partial index (only indexes DAF/DG roles) for minimal storage overhead
- Composite index covers all columns in typical approval routing queries
- Eliminates full table scans when finding approvers

### 2. Financial Reports - Facility Status Index

```sql
CREATE INDEX IF NOT EXISTS idx_financial_reports_facility_status 
  ON financial_reports(facility_id, status);
```

**Purpose**: Enables efficient filtering of reports by facility and status for approval queues.

**Use Cases**:
- DAF queue: Finding reports with status 'pending_daf_approval' for accessible facilities
- DG queue: Finding reports with status 'approved_by_daf' for accessible facilities
- Facility-specific report filtering

**Query Pattern**:
```sql
SELECT * FROM financial_reports 
WHERE facility_id IN (1, 2, 3, 4) 
  AND status = 'pending_daf_approval'
ORDER BY submitted_at ASC;
```

**Performance Impact**:
- Composite index supports both facility and status filtering in a single lookup
- Significantly improves approval queue query performance
- Reduces query time for large report datasets

## Existing Indexes Verified

The migration also verifies that the following indexes exist from previous migrations:

### 3. Facilities - Parent Facility Index

```sql
-- From schema definition or migration 0003
CREATE INDEX idx_facilities_parent ON facilities(parent_facility_id);
-- OR
CREATE INDEX idx_facilities_parent_facility_id ON facilities(parent_facility_id);
```

**Purpose**: Enables efficient lookup of child health centers for a parent hospital.

**Use Cases**:
- Finding all health centers that belong to a hospital
- Computing accessible facility IDs for hospital users
- Hierarchy traversal queries

### 4. Facilities - District Type Index

```sql
-- From schema definition or migration 0003
CREATE INDEX idx_facilities_district_type ON facilities(district_id, facility_type);
-- OR
CREATE INDEX idx_facilities_district_facility_type ON facilities(district_id, facility_type);
```

**Purpose**: Enables efficient filtering of facilities by district and type.

**Use Cases**:
- Finding all hospitals in a district
- Finding all health centers in a district
- District-scoped facility queries

## Running the Migration

### Option 1: Using the Migration Runner

```bash
tsx apps/server/src/db/migrations/run-migration.ts 0008_add_hierarchy_performance_indexes.sql
```

### Option 2: Using Drizzle Kit

```bash
cd apps/server
pnpm drizzle-kit push
```

### Option 3: Manual Execution

Connect to your PostgreSQL database and execute the SQL file directly:

```bash
psql -d your_database -f apps/server/src/db/migrations/0008_add_hierarchy_performance_indexes.sql
```

## Verifying the Migration

Run the verification script to check that all required indexes exist:

```bash
tsx apps/server/src/db/migrations/verify-hierarchy-indexes.ts
```

Expected output:
```
Verifying hierarchy performance indexes...

Expected Indexes:
=================

✓ FOUND idx_users_role_facility_active
  Table: users
  Description: Partial index for DAF/DG user lookups by facility and active status
  Definition: CREATE INDEX idx_users_role_facility_active ON public.users USING btree (role, facility_id, is_active) WHERE (role = ANY (ARRAY['daf'::user_role, 'dg'::user_role]))

✓ FOUND idx_financial_reports_facility_status
  Table: financial_reports
  Description: Composite index for facility and status filtering
  Definition: CREATE INDEX idx_financial_reports_facility_status ON public.financial_reports USING btree (facility_id, status)

✓ FOUND idx_facilities_parent
  Table: facilities
  Description: Index for finding child facilities of a parent hospital
  Definition: CREATE INDEX idx_facilities_parent ON public.facilities USING btree (parent_facility_id)

✓ FOUND idx_facilities_district_type
  Table: facilities
  Description: Composite index for district-type queries
  Definition: CREATE INDEX idx_facilities_district_type ON public.facilities USING btree (district_id, facility_type)

==================================================
✓ All required indexes are present
```

## Performance Expectations

### Before Indexes

- DAF user lookup: Full table scan (~100-1000ms for large user tables)
- Approval queue query: Sequential scan with status filter (~500-2000ms)
- Hierarchy queries: Multiple sequential scans

### After Indexes

- DAF user lookup: Index scan (~1-10ms)
- Approval queue query: Index scan with facility filter (~10-50ms)
- Hierarchy queries: Index-only scans (~5-20ms)

### Expected Improvements

- **DAF/DG User Lookups**: 10-100x faster
- **Approval Queue Queries**: 10-50x faster
- **Facility Hierarchy Queries**: 5-20x faster

## Rollback

If you need to remove these indexes:

```sql
-- Remove new indexes
DROP INDEX IF EXISTS idx_users_role_facility_active;
DROP INDEX IF EXISTS idx_financial_reports_facility_status;
```

**Note**: Do not remove the facilities indexes as they are used by other features.

## Related Files

- **Migration**: `apps/server/src/db/migrations/0008_add_hierarchy_performance_indexes.sql`
- **Verification Script**: `apps/server/src/db/migrations/verify-hierarchy-indexes.ts`
- **Schema Definitions**:
  - `apps/server/src/db/schema/users/schema.ts`
  - `apps/server/src/db/schema/financial-reports/schema.ts`
  - `apps/server/src/db/schema/facilities/schema.ts`

## Requirements Addressed

- **Requirement 2.1**: Facility hierarchy access control queries
- **Requirement 3.1**: District-based approval workflow routing
- **Requirement 6.1**: DAF approval queue performance
- **Requirement 6.2**: DG approval queue performance

## Next Steps

After running this migration:

1. Verify indexes are created successfully
2. Monitor query performance in production
3. Adjust index strategy if needed based on actual query patterns
4. Consider adding additional indexes for specific use cases

## Notes

- All indexes use `IF NOT EXISTS` to prevent errors on re-run
- Partial index on users table minimizes storage overhead
- Composite indexes are ordered for optimal query performance
- Existing facilities indexes are verified but not recreated
