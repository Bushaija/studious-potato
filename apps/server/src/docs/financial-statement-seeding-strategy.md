## Harden seeding and ID-only data flow for financial statements

### Context
- Generated statements showed zeros or wrong totals due to inconsistent IDs across seeds and reliance on runtime code/name heuristics.
- Goal: Make seeds the single source of truth and switch runtime aggregation to IDs-only. Ensure statements generate deterministically from execution (and planning only for Budget vs Actual) with proper annual/quarterly handling.

### Scope: Files and modules involved
- `src/db/seeds/modules/events.ts` (canonical event codes)
- `src/db/seeds/modules/execution-categories-activities.ts` (dynamic activities and categories)
- `src/db/seeds/modules/configurable-event-mappings.ts` (activityId/categoryId → eventId mappings)
- `src/db/seeds/data/statement-templates.ts` (template source data referencing event codes)
- `src/db/seeds/modules/statements.seeder.ts` (loads templates into `statement_templates` with event IDs)
- Runtime (for awareness):
  - `src/api/routes/financial-reports/data-collection.service.ts` (aggregation)
  - `src/lib/statement-engine/core/*` (generator, line processor, formula engine)

### Design principles
- Prefer stable identifiers over names/codes at runtime
  - Execution payload items include `activityId` (and `categoryId` when applicable).
  - `configurable_event_mappings` keyed by ids only.
- Canonicalize codes once at seed-time
  - Keep facility-specific `dynamic_activities.code` but do not rely on code matching at runtime.
- Event resolution uses IDs end-to-end
  - `statement_templates.event_mappings` store event IDs (not codes).
  - Engine indexes events by both code and id, but computes with ids primarily.
- Formalize execution payload schema
  - `activities: [{ activityId, q1, q2, q3, q4, amount? }]` with `quarter` at entry level.
  - Validate payload: reject items missing `activityId` or numeric fields.
- Mapper is the single source of truth
  - No fallback summations or heuristics in production paths.
- Period-aware aggregation
  - Use `reporting_periods.period_type` to select the appropriate quarter slice or annual sum.
- Version and test seeds
  - Version `statement_templates` and `configurable_event_mappings` and provide integration tests.
- Observability
  - Emit concise metrics and provide a diagnostics endpoint for matched activities, unmapped items, per-event totals, and per-line values.

### Required changes by file (seeding layer)

1) `src/db/seeds/modules/events.ts`
- Ensure each event has a canonical, stable `code` (e.g., `OTHER_REVENUE`, `TRANSFERS_PUBLIC_ENTITIES`, `GOODS_SERVICES`).
- Do not change codes lightly; add new codes if needed.

2) `src/db/seeds/modules/execution-categories-activities.ts`
- Ensure `dynamic_activities` are unique per `(project_type, facility_type, module_type, code)`.
- Keep facility-specific `code` (e.g., `MAL_EXEC_HEALTH_CENTER_A_1`).
- Optionally store `canonical_code` in `metadata` for human readability only.

3) `src/db/seeds/modules/configurable-event-mappings.ts`
- Mappings MUST be by ID only:
  - `activity_id` (or `category_id`) → `event_id`
  - Include `project_type`, `facility_type`, `module_type` in scoping if present.
- Remove or avoid any code/name-based mappings or inference.
- Verify correctness for all activities that contribute to: Revenues, Expenses, Assets, Liabilities, Cash Flow, Net Assets Changes.

4) `src/db/seeds/data/statement-templates.ts`
- Author templates using event CODES in source for readability.
- The seeder must resolve codes → event IDs during insertion.
- Keep formulas on total lines (e.g., `TOTAL_REVENUE`, `TOTAL_EXPENSES`, `SURPLUS_DEFICIT`).

5) `src/db/seeds/modules/statements.seeder.ts`
- Resolve `eventCodes[]` → event IDs at seed time. Do NOT allow null IDs; fail fast if code is missing.
- Store `event_mappings` as event IDs in `statement_templates`.
- Keep `calculation_formula` for headers/totals; no `event_mappings` on those lines.

### Runtime alignment (for reference)
- Data collection must:
  - Require `activityId` in execution items; ignore items without it (and surface diagnostics).
  - Use `reporting_periods.period_type` to select quarterly vs annual amounts:
    - Annual = sum of `q1+q2+q3+q4` (or `amount` if provided)
    - Quarterly = the specific quarter (`q1` for Q1, etc.)
  - Aggregate strictly via `configurable_event_mappings` by `activity_id` → `event_id`.
- Statement engine must:
  - Index event summaries by code and id; map line `event_mappings` (IDs) to totals.
  - Evaluate formulas and support aggregation methods like `DIFF`.

### Acceptance criteria
- Given execution entry with items carrying correct `activityId`, the following REV_EXP example computes exactly:
  - Transfers from public entities = 4
  - Other revenue = 4
  - Goods and services = 44
  - Grants and other transfers = 4
  - TOTAL REVENUE = 8, TOTAL EXPENSES = 48, SURPLUS/DEFICIT = -40
- Budget vs Actual uses planning + execution; other statements use execution only.
- Quarterly periods pick only the matching quarter; annual sums all quarters.
- No runtime code/name matching paths are executed in production.

### SQL sanity checks (post-seed)
```sql
-- Events
SELECT id, code FROM events WHERE code IN (
  'OTHER_REVENUE','TRANSFERS_PUBLIC_ENTITIES','GRANTS_TRANSFERS','GOODS_SERVICES'
);

-- Activities for a program/facility
SELECT id, name, code, facility_type
FROM dynamic_activities
WHERE project_type='Malaria' AND module_type='execution' AND facility_type='health_center';

-- Mappings must be ID-only and correct
SELECT cem.activity_id, cem.event_id, e.code
FROM configurable_event_mappings cem
JOIN events e ON e.id = cem.event_id
WHERE cem.is_active = true
ORDER BY cem.activity_id;

-- Statement template lines use event IDs (not codes) in event_mappings
SELECT id, statement_code, line_code, event_mappings
FROM statement_templates
WHERE statement_code IN ('REV_EXP','ASSETS_LIAB','CASH_FLOW','NET_ASSETS_CHANGES','BUDGET_VS_ACTUAL')
ORDER BY statement_code, display_order;
```

### Example execution payload (IDs-only)
```json
{
  "quarter": "Q1",
  "activities": [
    { "activityId": 94,  "q1": 4, "q2": 0, "q3": 0, "q4": 0 },
    { "activityId": 95,  "q1": 4, "q2": 0, "q3": 0, "q4": 0 },
    { "activityId": 107, "q1": 4, "q2": 0, "q3": 0, "q4": 0 }
  ]
}
```

### Migration and cleanup steps
1) Backfill existing `schema_form_data_entries` execution items to include `activityId` by joining their code→`dynamic_activities.id` (scoped by program/facility).
2) Normalize `configurable_event_mappings` so each relevant activity is mapped to the correct `event_id` (disable wrong rows instead of overwriting when in doubt).
3) Reseed `statement_templates` ensuring all `event_mappings` are event IDs.
4) Remove runtime code-matching fallbacks once data is clean.

### Tests (must-have)
- Unit tests: code→id resolution in seeders, template code→id resolution, mapping integrity.
- Integration tests per statement type:
  - Given synthetic execution entries (IDs-only), expect per-event totals and per-line values to match known outputs for annual and quarterly periods.
- Regression: ensure BUDGET_VS_ACTUAL aggregates planning + execution correctly.

### Deliverables checklist
- [ ] Events seeded with canonical codes
- [ ] Activities seeded uniquely per (program, facility, module) with stable codes
- [ ] Configurable mappings use IDs-only; validated for target statements
- [ ] Statement templates stored with event IDs in `event_mappings`
- [ ] Data migration script backfilled `activityId` in existing execution entries
- [ ] Aggregation enforces IDs-only and period-aware selection
- [ ] Diagnostics/metrics available to inspect matched vs unmapped items
- [ ] Integration tests green for all statements (annual and quarterly)


