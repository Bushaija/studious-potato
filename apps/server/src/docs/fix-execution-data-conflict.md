# Execution-Data 409 Conflict – Root Cause & Fix Proposal

## 1. Problem Statement
Users cannot save execution-data for every health facility; after the first facility submits a line item the UI starts returning:

```
POST /api/execution-data → 409 CONFLICT
{"error":"CONFLICT","message":"Execution data already exists for this reporting period and activity"}
```

As a result only one record per **activity** & **reporting period** is stored, independent of facility.

---

## 2. Current Database Design
```sql
CREATE TABLE execution_data (
  id                serial PRIMARY KEY,
  reporting_period_id integer REFERENCES reporting_periods(id),
  activity_id         integer REFERENCES activities(id),
  /* … amounts & meta … */
  CONSTRAINT execution_data_reporting_period_id_activity_id_key
    UNIQUE (reporting_period_id, activity_id)
);
```
The uniqueness rule omits `facility_id`, meaning two facilities cannot record the same activity in the same period.

---

## 3. Root Cause
The front-end intentionally creates **one row per** `(facility, activity, reportingPeriod)`.  The 409 is thrown by the backend guard in
`execution-data.handlers.ts` and finally by the unique index.

---

## 4. Proposed Fix
### 4.1 Database Changes
1. Add a `facility_id` column (+ FK).
2. Replace the existing unique key with a composite one that also includes `facility_id`.

```sql
-- Up migration
ALTER TABLE execution_data
  ADD COLUMN facility_id integer NOT NULL;

ALTER TABLE execution_data
  ADD CONSTRAINT execution_data_facility_id_fkey
      FOREIGN KEY (facility_id) REFERENCES facilities (id) ON DELETE CASCADE;

ALTER TABLE execution_data
  DROP CONSTRAINT execution_data_reporting_period_id_activity_id_key;

ALTER TABLE execution_data
  ADD CONSTRAINT execution_data_reporting_period_id_activity_id_facility_id_key
      UNIQUE (reporting_period_id, activity_id, facility_id);
```
*(Down migration reverses the above)*

### 4.2 Drizzle Schema Update
Add `facilityId` column and new `unique(…)` rule in `db/schema/execution-reports.ts`.

### 4.3 API / Handler Changes
* Validation schema: include `facilityId` as `z.number().int().positive()` in `CreateExecutionDataSchema` & `UpdateExecutionDataSchema`.
* Conflict check in `execution-data.handlers.ts`:
  ```ts
  const existing = await db.query.executionData.findFirst({
    where: and(
      eq(schema.executionData.reportingPeriodId, body.reportingPeriodId),
      eq(schema.executionData.activityId,        body.activityId),
      eq(schema.executionData.facilityId,        body.facilityId),
    ),
  });
  ```

### 4.4 Front-End Change
When building each execution row, include `facilityId` (available via `session.user.facilityId`) in the payload sent to `POST /execution-data`.

---

## 5. Migration Strategy
1. Deploy migration adding the new column & constraint.
2. Back-fill `facility_id` for existing rows, if any (can default to a known facility or split manually).
3. Release backend code changes (schema + handler).
4. Release frontend change to send `facilityId`.

---

## 6. Risks & Mitigations
| Risk | Mitigation |
|------|------------|
| Historical rows have no `facility_id` | Run a one-off script to assign them or allow column to be nullable temporarily. |
| Front-end & backend released out-of-order | Feature-flag the new API until both sides are deployed. |
| Increased unique key size | Index still selective; low impact on performance. |

---

## 7. Benefits
* Allows independent execution-data records per facility.
* Keeps data integrity by preventing duplicates **within** the same facility.
* Eliminates 409 errors blocking users.

---
**Please review and 👍 / request changes so we can schedule the migration.** 