# Financial Reports Approval Workflow Migration

## Overview

This migration adds support for a 3-tier approval workflow (Accountant → DAF → DG) for financial reports.

## Migration File

`0005_add_financial_reports_approval_workflow.sql`

## Changes

### 1. Extended `financial_reports` Table

Added new columns:
- `daf_id` - DAF approver user ID (foreign key to users)
- `daf_approved_at` - DAF approval timestamp
- `daf_comment` - DAF approval/rejection comment
- `dg_id` - DG approver user ID (foreign key to users)
- `dg_approved_at` - DG approval timestamp
- `dg_comment` - DG approval/rejection comment
- `final_pdf_url` - URL to generated PDF snapshot
- `locked` - Boolean flag to prevent editing during approval

### 2. Updated `report_status` Enum

Added new status values:
- `pending_daf_approval` - Report submitted and awaiting DAF review
- `rejected_by_daf` - Report rejected by DAF
- `approved_by_daf` - Report approved by DAF, awaiting DG review
- `rejected_by_dg` - Report rejected by DG
- `fully_approved` - Report fully approved by DG

### 3. New `financial_report_workflow_logs` Table

Created audit trail table with columns:
- `id` - Serial primary key
- `report_id` - Foreign key to financial_reports
- `action` - Workflow action (submitted, daf_approved, daf_rejected, etc.)
- `actor_id` - Foreign key to users (who performed the action)
- `comment` - Optional comment for the action
- `timestamp` - When the action occurred

### 4. Indexes

Added indexes for performance:
- `idx_financial_report_workflow_logs_report_id` - For querying logs by report
- `idx_financial_report_workflow_logs_timestamp` - For chronological queries
- `idx_financial_report_workflow_logs_actor_id` - For querying by actor
- `idx_financial_reports_status` - For filtering reports by status
- `idx_financial_reports_locked` - For filtering locked reports
- `idx_financial_reports_daf_id` - For querying by DAF approver
- `idx_financial_reports_dg_id` - For querying by DG approver

## Running the Migration

### Option 1: Using Drizzle Kit (Recommended)

```bash
cd apps/server
npm run db:push
```

This will apply all pending migrations including this one.

### Option 2: Manual SQL Execution

If you need to run the migration manually:

```bash
psql -U your_username -d your_database -f src/db/migrations/0005_add_financial_reports_approval_workflow.sql
```

## Verification

After running the migration, verify the changes:

```sql
-- Check new columns in financial_reports
\d financial_reports

-- Check new enum values
SELECT unnest(enum_range(NULL::report_status));

-- Check new workflow logs table
\d financial_report_workflow_logs

-- Check indexes
\di financial_report_workflow_logs*
\di idx_financial_reports_*
```

## Rollback

If you need to rollback this migration:

```sql
-- Drop indexes
DROP INDEX IF EXISTS idx_financial_report_workflow_logs_report_id;
DROP INDEX IF EXISTS idx_financial_report_workflow_logs_timestamp;
DROP INDEX IF EXISTS idx_financial_report_workflow_logs_actor_id;
DROP INDEX IF EXISTS idx_financial_reports_status;
DROP INDEX IF EXISTS idx_financial_reports_locked;
DROP INDEX IF EXISTS idx_financial_reports_daf_id;
DROP INDEX IF EXISTS idx_financial_reports_dg_id;

-- Drop workflow logs table
DROP TABLE IF EXISTS financial_report_workflow_logs;

-- Remove columns from financial_reports
ALTER TABLE financial_reports
DROP COLUMN IF EXISTS daf_id,
DROP COLUMN IF EXISTS daf_approved_at,
DROP COLUMN IF EXISTS daf_comment,
DROP COLUMN IF EXISTS dg_id,
DROP COLUMN IF EXISTS dg_approved_at,
DROP COLUMN IF EXISTS dg_comment,
DROP COLUMN IF EXISTS final_pdf_url,
DROP COLUMN IF EXISTS locked;

-- Note: PostgreSQL doesn't support removing enum values
-- You would need to recreate the enum type to remove values
```

## Related Files

### Schema Files
- `apps/server/src/db/schema/financial-reports/schema.ts` - Updated with new columns
- `apps/server/src/db/schema/financial-report-workflow-logs/schema.ts` - New workflow logs schema
- `apps/server/src/db/enum/schema.enum.ts` - Updated report_status enum

### Relations
- `apps/server/src/db/relations/index.ts` - Added workflow logs relations

### Types
- `apps/server/src/api/routes/financial-reports/financial-reports.types.ts` - Updated with workflow types

## Next Steps

After running this migration, you can proceed with:
1. Implementing the workflow service layer (Task 3)
2. Creating approval workflow API endpoints (Task 4)
3. Implementing PDF generation service (Task 5)
4. Building client interfaces (Tasks 8-11)
