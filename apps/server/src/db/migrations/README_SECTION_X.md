# Section X (Miscellaneous Adjustments) Migration

## Overview

This migration adds Section X "Miscellaneous Adjustments" to the execution form to support proper double-entry accounting for "Other Receivables". This ensures that when accountants record miscellaneous receivables, the system automatically reduces Cash at Bank, maintaining accurate financial statements.

## Changes Made

### 1. Database Migration (0011_add_section_x_miscellaneous_adjustments.sql)

- Added documentation comment to `schema_activity_categories` table
- No schema changes required (existing structure supports Section X)

### 2. Seed File Updates (execution-categories-activities.ts)

#### Added Section X Category
- Code: `X`
- Name: `X. Miscellaneous Adjustments`
- Display Order: `2.5` (positioned between Section B and Section C)
- Added for all project types: HIV, Malaria, TB
- Added for all facility types: hospital, health_center

#### Added Section X Activity
- Activity Name: `Other Receivable`
- Activity Type: `MISCELLANEOUS_ADJUSTMENT`
- Display Order: `1`
- Applicable To: `both` (hospital and health_center)
- Added to all three project types (HIV, Malaria, TB)

#### Updated Section D "Other Receivables"
- Changed Name: `Other Receivables` → `Other Receivables (auto from Miscellaneous)`
- Changed Activity Type: `ASSET` → `COMPUTED_ASSET`
- Added Computation Rules:
  ```typescript
  {
    formula: 'X_OTHER_RECEIVABLE',
    description: 'Automatically calculated from Miscellaneous Adjustments'
  }
  ```

## Activity Codes

Section X activities follow the standard naming convention:

```
{PROJECT}_EXEC_{FACILITY}_X_1

Examples:
- HIV_EXEC_HOSPITAL_X_1
- HIV_EXEC_HEALTH_CENTER_X_1
- MAL_EXEC_HOSPITAL_X_1
- MAL_EXEC_HEALTH_CENTER_X_1
- TB_EXEC_HOSPITAL_X_1
- TB_EXEC_HEALTH_CENTER_X_1
```

## Running the Migration

### Option 1: Full Seed (Recommended for Development)

```bash
cd apps/server
npm run db:seed
```

This will seed all data including Section X.

### Option 2: Execution-Only Seed

```bash
cd apps/server
npm run db:seed execution
```

This seeds only execution-related data.

### Option 3: Test Script

To verify Section X seed data without affecting other data:

```bash
cd apps/server
npx tsx src/scripts/test-section-x-seed.ts
```

## Verification

After running the seed, verify Section X was created:

```sql
-- Check Section X categories
SELECT 
    project_type,
    facility_type,
    code,
    name,
    display_order
FROM schema_activity_categories
WHERE code LIKE '%_EXEC_X'
ORDER BY project_type, facility_type;

-- Check Section X activities
SELECT 
    da.project_type,
    da.facility_type,
    da.code,
    da.name,
    da.activity_type
FROM dynamic_activities da
JOIN schema_activity_categories sac ON da.category_id = sac.id
WHERE sac.code LIKE '%_EXEC_X'
ORDER BY da.project_type, da.facility_type;

-- Verify Section D "Other Receivables" is now computed
SELECT 
    da.project_type,
    da.facility_type,
    da.name,
    da.activity_type,
    da.computation_rules
FROM dynamic_activities da
JOIN schema_activity_categories sac ON da.category_id = sac.id
WHERE sac.code LIKE '%_EXEC_D'
AND da.name LIKE '%Other Receivables%'
ORDER BY da.project_type, da.facility_type;
```

Expected results:
- 6 Section X categories (3 projects × 2 facility types)
- 6 Section X activities (3 projects × 2 facility types)
- 6 updated "Other Receivables" activities with `COMPUTED_ASSET` type

## Next Steps

After running this migration and seed:

1. **Frontend Implementation**: Update the execution form to:
   - Display Section X in the form
   - Create `useMiscellaneousAdjustments` hook
   - Update `useExpenseCalculations` to include Other Receivable adjustment
   - Add auto-calculation logic for Section D "Other Receivables"
   - Add validation to prevent negative Cash at Bank

2. **Testing**: Verify that:
   - Section X appears in the execution form
   - Entering an amount in Section X reduces Cash at Bank
   - Section D "Other Receivables" mirrors the Section X value
   - Form saves and loads correctly

## Rollback

If you need to rollback this change:

```sql
-- Remove Section X activities
DELETE FROM dynamic_activities da
USING schema_activity_categories sac
WHERE da.category_id = sac.id
AND sac.code LIKE '%_EXEC_X';

-- Remove Section X categories
DELETE FROM schema_activity_categories
WHERE code LIKE '%_EXEC_X';

-- Revert Section D "Other Receivables" to manual entry
UPDATE dynamic_activities da
SET 
    name = 'Other Receivables',
    activity_type = 'ASSET',
    computation_rules = NULL
FROM schema_activity_categories sac
WHERE da.category_id = sac.id
AND sac.code LIKE '%_EXEC_D'
AND da.name LIKE '%Other Receivables%';
```

## Related Files

- Migration: `apps/server/src/db/migrations/0011_add_section_x_miscellaneous_adjustments.sql`
- Seed: `apps/server/src/db/seeds/modules/execution-categories-activities.ts`
- Test Script: `apps/server/src/scripts/test-section-x-seed.ts`
- Design Doc: `.kiro/specs/miscellaneous-adjustments-other-receivables/design.md`
- Requirements: `.kiro/specs/miscellaneous-adjustments-other-receivables/requirements.md`
