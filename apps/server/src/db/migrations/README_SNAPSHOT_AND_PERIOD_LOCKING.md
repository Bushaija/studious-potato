# Migration 0007: Snapshot and Period Locking Features

## Overview

This migration adds support for immutable financial report snapshots and period locking to prevent back-dating of approved financial data.

## Changes

### 1. Extended financial_reports Table

Added columns to support snapshot functionality:
- `snapshot_checksum` (varchar(64)): SHA-256 hash of snapshot data for integrity validation
- `snapshot_timestamp` (timestamp): When the snapshot was captured
- `source_data_version` (varchar(20)): Version identifier for source data
- `is_outdated` (boolean): Flag indicating if source data has changed after snapshot

### 2. New report_versions Table

Stores historical versions of financial reports:
- Tracks version numbers (e.g., "1.0", "1.1")
- Stores complete snapshot data for each version
- Includes checksum for integrity validation
- Records who created each version and when
- Supports version comparison and audit trail

### 3. New period_locks Table

Manages period locking to prevent back-dating:
- Locks reporting periods after report approval
- Tracks who locked/unlocked periods and when
- Stores reasons for lock/unlock actions
- Unique constraint on period/project/facility combination

### 4. New period_lock_audit_log Table

Comprehensive audit trail for period lock operations:
- Records all lock/unlock actions
- Logs attempted edits on locked periods
- Stores metadata for additional context
- Supports compliance and security requirements

### 5. Performance Indexes

Added indexes for frequently queried fields:
- Snapshot timestamp and outdated flag on financial_reports
- Report ID and version lookups on report_versions
- Period lock lookups (composite index for common query pattern)
- Audit log queries by period, user, and timestamp

## Running the Migration

```bash
# Run the migration
psql -U your_username -d your_database -f apps/server/src/db/migrations/0007_add_snapshot_and_period_locking.sql
```

Or use your migration runner:

```bash
npm run migrate
```

## Rollback

To rollback this migration:

```sql
-- Drop indexes
DROP INDEX IF EXISTS idx_period_lock_audit_log_action;
DROP INDEX IF EXISTS idx_period_lock_audit_log_performed_at;
DROP INDEX IF EXISTS idx_period_lock_audit_log_performed_by;
DROP INDEX IF EXISTS idx_period_lock_audit_log_period_lock_id;
DROP INDEX IF EXISTS idx_period_locks_lookup;
DROP INDEX IF EXISTS idx_period_locks_locked_at;
DROP INDEX IF EXISTS idx_period_locks_is_locked;
DROP INDEX IF EXISTS idx_period_locks_facility_id;
DROP INDEX IF EXISTS idx_period_locks_project_id;
DROP INDEX IF EXISTS idx_period_locks_reporting_period_id;
DROP INDEX IF EXISTS idx_report_versions_snapshot_timestamp;
DROP INDEX IF EXISTS idx_report_versions_version_number;
DROP INDEX IF EXISTS idx_report_versions_report_id;
DROP INDEX IF EXISTS idx_financial_reports_is_outdated;
DROP INDEX IF EXISTS idx_financial_reports_snapshot_timestamp;

-- Drop tables
DROP TABLE IF EXISTS period_lock_audit_log;
DROP TABLE IF EXISTS period_locks;
DROP TABLE IF EXISTS report_versions;

-- Remove columns from financial_reports
ALTER TABLE financial_reports DROP COLUMN IF EXISTS is_outdated;
ALTER TABLE financial_reports DROP COLUMN IF EXISTS source_data_version;
ALTER TABLE financial_reports DROP COLUMN IF EXISTS snapshot_timestamp;
ALTER TABLE financial_reports DROP COLUMN IF EXISTS snapshot_checksum;
```

## Testing

After running the migration, verify:

1. All tables were created successfully:
```sql
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('report_versions', 'period_locks', 'period_lock_audit_log');
```

2. All indexes were created:
```sql
SELECT indexname FROM pg_indexes 
WHERE tablename IN ('financial_reports', 'report_versions', 'period_locks', 'period_lock_audit_log')
ORDER BY tablename, indexname;
```

3. Foreign key constraints are in place:
```sql
SELECT conname, conrelid::regclass, confrelid::regclass 
FROM pg_constraint 
WHERE contype = 'f' 
AND conrelid::regclass::text IN ('report_versions', 'period_locks', 'period_lock_audit_log');
```

## Related Requirements

This migration implements the database schema requirements for:
- Requirements 1.1-1.5: Snapshot creation and storage
- Requirements 6.1-6.4: Period locking mechanism
- Requirements 9.1-9.5: Audit trail for period locks
