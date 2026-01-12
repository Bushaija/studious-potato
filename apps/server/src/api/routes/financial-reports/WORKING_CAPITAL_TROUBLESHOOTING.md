# Working Capital Calculation Troubleshooting Guide

## Issue: Getting 0 When There Should Be a Change

### Scenario
**Given:**
- 2025-26 Receivables: 16 (VAT refund: 12 + Other: 4)
- 2024-25 Receivables: 8 (VAT refund: 4 + Other: 4)

**Expected:**
- Change: 16 - 8 = 8
- Cash Flow Adjustment: -8

**Actual:**
- Getting: 0

### Possible Causes

#### 1. Working Capital Calculator Not Finding Data

The calculator queries `schema_form_data_entries` with these filters:
```sql
WHERE 
  project_id = ?
  AND reporting_period_id = ?
  AND entity_type = 'EXECUTION'
  AND facility_id IN (?)
  AND event_code IN ('ADVANCE_PAYMENTS', 'RECEIVABLES_EXCHANGE', 'RECEIVABLES_NON_EXCHANGE')
```

**Check:**
- Are receivables stored with `entity_type = 'EXECUTION'`?
- Are the event codes correct?
- Is the data linked through `configurable_event_mappings`?

#### 2. Event Mapping Issue

The query joins:
```
schema_form_data_entries 
→ configurable_event_mappings (on entity_id = activity_id)
→ events (on event_id = events.id)
```

**Check:**
- Does `configurable_event_mappings` have entries linking your activities to receivables events?
- Are the `activity_id` values correct?

#### 3. Previous Period Not Found

If the calculator can't find the previous period, it uses 0 as baseline.

**Check server logs for:**
```
[Working Capital] No previous period found
```

#### 4. Data in Wrong Period

**Check:**
- Is the data actually in the periods you're querying?
- Are `reporting_period_id` values correct?

## Diagnostic Queries

### Query 1: Check Raw Receivables Data

```sql
SELECT 
  sfde.id,
  sfde.reporting_period_id,
  sfde.facility_id,
  sfde.entity_type,
  sfde.entity_id,
  sfde.form_data->>'amount' as amount,
  cem.event_id,
  e.code as event_code,
  e.name as event_name
FROM schema_form_data_entries sfde
LEFT JOIN configurable_event_mappings cem ON sfde.entity_id = cem.activity_id
LEFT JOIN events e ON cem.event_id = e.id
WHERE 
  sfde.project_id = 2  -- Your project ID
  AND sfde.reporting_period_id IN (1, 2)  -- Current and previous periods
  AND sfde.facility_id = 2  -- Your facility ID
  AND sfde.entity_type = 'EXECUTION'
  AND e.code IN ('ADVANCE_PAYMENTS', 'RECEIVABLES_EXCHANGE', 'RECEIVABLES_NON_EXCHANGE')
ORDER BY sfde.reporting_period_id, e.code;
```

**Expected Result:**
Should show receivables data for both periods.

### Query 2: Check Event Mappings

```sql
SELECT 
  cem.id,
  cem.activity_id,
  cem.event_id,
  e.code as event_code,
  e.name as event_name
FROM configurable_event_mappings cem
JOIN events e ON cem.event_id = e.id
WHERE e.code IN ('ADVANCE_PAYMENTS', 'RECEIVABLES_EXCHANGE', 'RECEIVABLES_NON_EXCHANGE', 'PAYABLES')
ORDER BY e.code;
```

**Expected Result:**
Should show mappings for receivables and payables events.

### Query 3: Check Reporting Periods

```sql
SELECT 
  id,
  year,
  period_type,
  start_date,
  end_date
FROM reporting_periods
WHERE id IN (1, 2)
ORDER BY start_date;
```

**Expected Result:**
Should show both periods with correct dates.

### Query 4: Simulate Working Capital Query

```sql
-- Current Period (2025-26)
SELECT 
  e.code as event_code,
  COALESCE(SUM(CAST(sfde.form_data->>'amount' AS NUMERIC)), 0) as total_amount
FROM schema_form_data_entries sfde
INNER JOIN configurable_event_mappings cem ON sfde.entity_id = cem.activity_id
INNER JOIN events e ON cem.event_id = e.id
WHERE 
  sfde.project_id = 2
  AND sfde.reporting_period_id = 2  -- Current period
  AND sfde.entity_type = 'EXECUTION'
  AND e.code IN ('ADVANCE_PAYMENTS', 'RECEIVABLES_EXCHANGE', 'RECEIVABLES_NON_EXCHANGE')
  AND sfde.facility_id = 2
GROUP BY e.code;

-- Previous Period (2024-25)
SELECT 
  e.code as event_code,
  COALESCE(SUM(CAST(sfde.form_data->>'amount' AS NUMERIC)), 0) as total_amount
FROM schema_form_data_entries sfde
INNER JOIN configurable_event_mappings cem ON sfde.entity_id = cem.activity_id
INNER JOIN events e ON cem.event_id = e.id
WHERE 
  sfde.project_id = 2
  AND sfde.reporting_period_id = 1  -- Previous period
  AND sfde.entity_type = 'EXECUTION'
  AND e.code IN ('ADVANCE_PAYMENTS', 'RECEIVABLES_EXCHANGE', 'RECEIVABLES_NON_EXCHANGE')
  AND sfde.facility_id = 2
GROUP BY e.code;
```

**Expected Result:**
- Current period: Total should be 16
- Previous period: Total should be 8

## Server Log Analysis

### Look for these log messages:

```
[WorkingCapitalCalculator] Calculating working capital changes for period X
[WorkingCapitalCalculator] Effective facility IDs: X
[WorkingCapitalCalculator] Querying balance sheet data: period=X, project=X, facilities=X, events=...
[WorkingCapitalCalculator] Balance sheet data retrieved: X event codes, total: X
[WorkingCapitalCalculator] Working capital changes calculated: Receivables: X → X, Payables: X → X
```

### Key values to check:

1. **"Balance sheet data retrieved: X event codes, total: X"**
   - Should show total: 16 for current period
   - Should show total: 8 for previous period

2. **"Working capital changes calculated: Receivables: X → X"**
   - First X should be the change (8)
   - Second X should be the cash flow adjustment (-8)

## Common Issues and Solutions

### Issue 1: No Data Found

**Symptom:** Logs show "total: 0"

**Solutions:**
1. Check if data exists in `schema_form_data_entries`
2. Verify `entity_type = 'EXECUTION'`
3. Check `configurable_event_mappings` links activities to events
4. Verify event codes match exactly

### Issue 2: Wrong Event Codes

**Symptom:** Data exists but calculator doesn't find it

**Solutions:**
1. Check what event codes your receivables data uses
2. Update `RECEIVABLES_EVENT_CODES` constant if needed
3. Verify event codes in the `events` table

### Issue 3: Missing Event Mappings

**Symptom:** Data exists but join returns no results

**Solutions:**
1. Create entries in `configurable_event_mappings`
2. Link `activity_id` to correct `event_id`
3. Ensure mappings exist for all receivables/payables activities

### Issue 4: Previous Period Not Found

**Symptom:** Warning "No previous period found"

**Solutions:**
1. Check `reporting_periods` table has previous period
2. Verify period dates are sequential
3. Check `period_type` matches between periods

## Next Steps

1. **Check Server Logs**
   - Look for `[WorkingCapitalCalculator]` messages
   - Note the totals being calculated

2. **Run Diagnostic Queries**
   - Start with Query 4 to simulate the calculator
   - If no results, work backwards through Queries 1-3

3. **Verify Data Structure**
   - Confirm receivables data is in `schema_form_data_entries`
   - Verify event mappings exist
   - Check entity_type is 'EXECUTION'

4. **Report Findings**
   - Share query results
   - Share relevant server logs
   - We can then identify the exact issue

## Expected Working Scenario

When everything is working correctly:

```
[WorkingCapitalCalculator] Querying balance sheet data: period=2, project=2, facilities=2, events=ADVANCE_PAYMENTS,RECEIVABLES_EXCHANGE,RECEIVABLES_NON_EXCHANGE
[WorkingCapitalCalculator] Balance sheet data retrieved: 2 event codes, total: 16

[WorkingCapitalCalculator] Querying balance sheet data: period=1, project=2, facilities=2, events=ADVANCE_PAYMENTS,RECEIVABLES_EXCHANGE,RECEIVABLES_NON_EXCHANGE
[WorkingCapitalCalculator] Balance sheet data retrieved: 2 event codes, total: 8

[WorkingCapitalCalculator] Working capital changes calculated: Receivables: 8 → -8, Payables: 0 → 0
```

Then the API response should show:
```json
{
  "currentPeriodValue": -8,
  "displayFormatting": {
    "currentPeriodDisplay": "(8.00)"
  }
}
```
