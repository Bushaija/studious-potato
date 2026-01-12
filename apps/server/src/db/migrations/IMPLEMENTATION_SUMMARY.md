# Database Schema Setup - Implementation Summary

## Task Completed: 1. Database Schema Setup

### Overview
Successfully implemented the database schema changes required for the Financial Report Snapshots and Period Locking feature. This includes new tables, columns, indexes, and relationships to support immutable report snapshots and period locking functionality.

## Files Created

### 1. Schema Definitions

#### `apps/server/src/db/schema/report-versions/schema.ts`
- Defines the `report_versions` table for storing historical versions of financial reports
- Includes fields for version number, snapshot data, checksum, timestamp, and creator
- Implements foreign keys to `financial_reports` and `users` tables
- Adds unique constraint on `report_id` and `version_number` combination

#### `apps/server/src/db/schema/period-locks/schema.ts`
- Defines the `period_locks` table for managing period locking
- Tracks lock status, who locked/unlocked, timestamps, and reasons
- Implements foreign keys to `reporting_periods`, `projects`, `facilities`, and `users` tables
- Adds unique constraint on `reporting_period_id`, `project_id`, and `facility_id` combination

#### `apps/server/src/db/schema/period-lock-audit-log/schema.ts`
- Defines the `period_lock_audit_log` table for comprehensive audit trail
- Records all lock/unlock actions and attempted edits on locked periods
- Implements foreign keys to `period_locks` and `users` tables
- Supports metadata storage for additional context

### 2. Migration Files

#### `apps/server/src/db/migrations/0007_add_snapshot_and_period_locking.sql`
Complete SQL migration that:
- Adds 4 new columns to `financial_reports` table:
  - `snapshot_checksum` (varchar(64))
  - `snapshot_timestamp` (timestamp)
  - `source_data_version` (varchar(20))
  - `is_outdated` (boolean)
- Creates 3 new tables:
  - `report_versions`
  - `period_locks`
  - `period_lock_audit_log`
- Adds all foreign key constraints with cascade delete where appropriate
- Adds unique constraints for data integrity
- Creates 15+ performance indexes for frequently queried fields

#### `apps/server/src/db/migrations/README_SNAPSHOT_AND_PERIOD_LOCKING.md`
Comprehensive documentation including:
- Overview of changes
- Detailed description of each table and column
- Instructions for running the migration
- Rollback procedures
- Testing verification queries
- Requirements mapping

#### `apps/server/src/db/migrations/run-snapshot-migration.ts`
Automated migration runner that:
- Executes the SQL migration
- Verifies all tables were created
- Verifies all columns were added
- Verifies all indexes were created
- Verifies all foreign key constraints
- Verifies all unique constraints
- Provides detailed success/failure reporting

### 3. Schema Updates

#### `apps/server/src/db/schema/financial-reports/schema.ts`
Updated to include new snapshot-related columns:
- `snapshotChecksum`
- `snapshotTimestamp`
- `sourceDataVersion`
- `isOutdated`

#### `apps/server/src/db/schema/index.ts`
Updated to export the three new schema modules:
- `report-versions/schema`
- `period-locks/schema`
- `period-lock-audit-log/schema`

### 4. Relations Updates

#### `apps/server/src/db/relations/index.ts`
Added comprehensive Drizzle ORM relations:

**New Relations:**
- `reportVersionsRelations` - Links versions to reports and creators
- `periodLocksRelations` - Links locks to periods, projects, facilities, and users
- `periodLockAuditLogRelations` - Links audit logs to locks and performers

**Updated Relations:**
- `financialReportsRelations` - Added `versions` relation
- `usersRelations` - Added relations for:
  - `createdVersions`
  - `lockedPeriods`
  - `unlockedPeriods`
  - `periodLockAudits`

## Database Schema Details

### New Tables

#### report_versions
| Column | Type | Description |
|--------|------|-------------|
| id | serial | Primary key |
| report_id | integer | Foreign key to financial_reports |
| version_number | varchar(20) | Version identifier (e.g., "1.0", "1.1") |
| snapshot_data | jsonb | Complete snapshot of report data |
| snapshot_checksum | varchar(64) | SHA-256 hash for integrity |
| snapshot_timestamp | timestamp | When snapshot was captured |
| created_by | integer | Foreign key to users |
| created_at | timestamp | Record creation timestamp |
| changes_summary | text | Description of changes |

**Constraints:**
- Unique: (report_id, version_number)
- Foreign keys: report_id → financial_reports.id, created_by → users.id

#### period_locks
| Column | Type | Description |
|--------|------|-------------|
| id | serial | Primary key |
| reporting_period_id | integer | Foreign key to reporting_periods |
| project_id | integer | Foreign key to projects |
| facility_id | integer | Foreign key to facilities |
| is_locked | boolean | Current lock status |
| locked_by | integer | Foreign key to users |
| locked_at | timestamp | When period was locked |
| locked_reason | text | Reason for locking |
| unlocked_by | integer | Foreign key to users |
| unlocked_at | timestamp | When period was unlocked |
| unlocked_reason | text | Reason for unlocking |

**Constraints:**
- Unique: (reporting_period_id, project_id, facility_id)
- Foreign keys: Multiple to reporting_periods, projects, facilities, users

#### period_lock_audit_log
| Column | Type | Description |
|--------|------|-------------|
| id | serial | Primary key |
| period_lock_id | integer | Foreign key to period_locks |
| action | varchar(20) | Action type (LOCKED, UNLOCKED, EDIT_ATTEMPTED) |
| performed_by | integer | Foreign key to users |
| performed_at | timestamp | When action was performed |
| reason | text | Reason for action |
| metadata | jsonb | Additional context |

**Constraints:**
- Foreign keys: period_lock_id → period_locks.id, performed_by → users.id

### Indexes Created

**financial_reports:**
- `idx_financial_reports_snapshot_timestamp`
- `idx_financial_reports_is_outdated`

**report_versions:**
- `idx_report_versions_report_id`
- `idx_report_versions_version_number`
- `idx_report_versions_snapshot_timestamp`

**period_locks:**
- `idx_period_locks_reporting_period_id`
- `idx_period_locks_project_id`
- `idx_period_locks_facility_id`
- `idx_period_locks_is_locked`
- `idx_period_locks_locked_at`
- `idx_period_locks_lookup` (composite: reporting_period_id, project_id, facility_id, is_locked)

**period_lock_audit_log:**
- `idx_period_lock_audit_log_period_lock_id`
- `idx_period_lock_audit_log_performed_by`
- `idx_period_lock_audit_log_performed_at`
- `idx_period_lock_audit_log_action`

## Requirements Satisfied

This implementation satisfies the following requirements from the specification:

- **1.1-1.5**: Snapshot creation and storage infrastructure
- **6.1-6.4**: Period locking mechanism database structure
- **9.1-9.5**: Audit trail for period lock operations

## Running the Migration

### Option 1: Using the migration runner script
```bash
cd apps/server
npx tsx src/db/migrations/run-snapshot-migration.ts
```

### Option 2: Direct SQL execution
```bash
psql -U your_username -d your_database -f apps/server/src/db/migrations/0007_add_snapshot_and_period_locking.sql
```

## Verification

After running the migration, the runner script will automatically verify:
1. All 3 new tables were created
2. All 4 new columns were added to financial_reports
3. All 15+ indexes were created
4. All foreign key constraints are in place
5. All unique constraints are in place

## Next Steps

With the database schema in place, the next tasks can proceed:
- Task 2: Implement Snapshot Service
- Task 3: Implement Period Lock Service
- Task 4: Implement Version Service

## Notes

- All foreign keys use CASCADE delete where appropriate to maintain referential integrity
- Indexes are optimized for common query patterns identified in the design document
- The schema supports the complete workflow from snapshot creation through version comparison
- Audit logging is comprehensive to support compliance requirements
