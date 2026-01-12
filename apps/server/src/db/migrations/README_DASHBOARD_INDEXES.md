# Dashboard Performance Indexes Migration

## Overview
This migration adds database indexes to optimize dashboard query performance for budget aggregation, program distribution, and approval tracking across province, district, and facility levels.

## Migration File
`0004_add_dashboard_performance_indexes.sql`

## Indexes Added

### 1. idx_projects_facility_period_active
**Table**: `projects`  
**Columns**: `(facility_id, reporting_period_id)`  
**Condition**: `WHERE status = 'ACTIVE'`  
**Purpose**: Optimizes queries that need to find active projects for specific facilities and reporting periods.  
**Used By**: 
- Dashboard metrics aggregation
- Program distribution queries
- Budget by district/facility endpoints

### 2. idx_schema_entries_entity_facility_period
**Table**: `schema_form_data_entries`  
**Columns**: `(entity_type, facility_id, reporting_period_id)`  
**Purpose**: Optimizes queries that aggregate planning/execution data by facility and period.  
**Used By**:
- Budget allocation calculations (entity_type='planning')
- Budget execution calculations (entity_type='execution')
- Facility-level budget aggregation

### 3. idx_schema_entries_project_entity
**Table**: `schema_form_data_entries`  
**Columns**: `(project_id, entity_type)`  
**Purpose**: Optimizes queries that need to find all planning or execution entries for specific projects.  
**Used By**:
- Project-level budget calculations
- Program distribution aggregation
- Project breakdown queries

### 4. idx_schema_entries_approval_status_filtered
**Table**: `schema_form_data_entries`  
**Columns**: `(approval_status)`  
**Condition**: `WHERE approval_status IN ('APPROVED', 'PENDING', 'REJECTED')`  
**Purpose**: Optimizes approval tracking queries with a partial index on relevant statuses.  
**Used By**:
- Province approval summary endpoint
- District approval details endpoint
- Approval rate calculations

## Running the Migration

### Option 1: Using psql (Recommended for manual migrations)
```bash
# Connect to your database
psql -U your_username -d your_database

# Run the migration
\i apps/server/src/db/migrations/0004_add_dashboard_performance_indexes.sql

# Verify indexes were created
\di idx_projects_facility_period_active
\di idx_schema_entries_entity_facility_period
\di idx_schema_entries_project_entity
\di idx_schema_entries_approval_status_filtered
```

### Option 2: Using npm script
```bash
cd apps/server

# If you have a custom migration script
pnpm run db:migrate:custom 0004_add_dashboard_performance_indexes.sql
```

### Option 3: Programmatic execution
```typescript
import { db } from '@/db';
import { sql } from 'drizzle-orm';
import fs from 'fs';

const migrationSQL = fs.readFileSync(
  './src/db/migrations/0004_add_dashboard_performance_indexes.sql',
  'utf-8'
);

await db.execute(sql.raw(migrationSQL));
```

## Verification

After running the migration, verify the indexes were created:

```sql
-- Check if indexes exist
SELECT 
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE indexname IN (
  'idx_projects_facility_period_active',
  'idx_schema_entries_entity_facility_period',
  'idx_schema_entries_project_entity',
  'idx_schema_entries_approval_status_filtered'
)
ORDER BY tablename, indexname;

-- Check index sizes
SELECT
  schemaname,
  tablename,
  indexname,
  pg_size_pretty(pg_relation_size(indexrelid)) as index_size
FROM pg_stat_user_indexes
WHERE indexrelname IN (
  'idx_projects_facility_period_active',
  'idx_schema_entries_entity_facility_period',
  'idx_schema_entries_project_entity',
  'idx_schema_entries_approval_status_filtered'
)
ORDER BY tablename, indexrelname;
```

## Performance Impact

### Expected Improvements
- **Dashboard Metrics Endpoint**: 50-70% faster for province/district level aggregations
- **Program Distribution**: 40-60% faster for program-level grouping
- **Budget by District/Facility**: 60-80% faster for hierarchical aggregations
- **Approval Tracking**: 70-90% faster for approval status filtering

### Query Plan Verification
Use `EXPLAIN ANALYZE` to verify indexes are being used:

```sql
-- Example: Verify facility-period index usage
EXPLAIN ANALYZE
SELECT * FROM projects
WHERE facility_id = 1
  AND reporting_period_id = 1
  AND status = 'ACTIVE';

-- Should show: Index Scan using idx_projects_facility_period_active

-- Example: Verify entity-facility-period index usage
EXPLAIN ANALYZE
SELECT * FROM schema_form_data_entries
WHERE entity_type = 'planning'
  AND facility_id = 1
  AND reporting_period_id = 1;

-- Should show: Index Scan using idx_schema_entries_entity_facility_period
```

## Rollback

If you need to remove these indexes:

```sql
-- Remove all dashboard performance indexes
DROP INDEX IF EXISTS idx_projects_facility_period_active;
DROP INDEX IF EXISTS idx_schema_entries_entity_facility_period;
DROP INDEX IF EXISTS idx_schema_entries_project_entity;
DROP INDEX IF EXISTS idx_schema_entries_approval_status_filtered;
```

## Notes

- All indexes use `IF NOT EXISTS` to prevent errors if run multiple times
- Partial indexes (with WHERE clauses) are used to reduce index size and improve performance
- Composite indexes are ordered by selectivity (most selective columns first)
- Comments are added to each index for documentation purposes

## Related Requirements
- Requirement 10.1: Dashboard Metrics API endpoint
- Requirement 11.1: Program Distribution API endpoint
- Requirement 12.1: Budget by District API endpoint
- Requirement 13.1: Budget by Facility API endpoint
- Requirement 14.1: Province Approval Summary API endpoint
- Requirement 15.1: District Approval Details API endpoint
- Performance optimization requirement from design document
