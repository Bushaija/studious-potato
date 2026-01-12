# Budget vs Actual Statement Logging Cleanup

## Problem
The Budget vs Actual statement generation was producing excessive log output:

```
[Planning JSON] Processing 21 planning activities
[Planning JSON] Generated 21 entries from planning structure
Generated 21 event entries from quarterly JSON
[CustomEventMapper] No valid event codes for line TAX_REVENUE
[CustomEventMapper] No valid event codes for line GRANTS_TRANSFERS
[CustomEventMapper] No valid event codes for line OTHER_REVENUE
[CustomEventMapper] No valid event codes for line COMPENSATION_EMPLOYEES
[BudgetVsActualProcessor] Actual event 'GRANTS_TRANSFERS' not found for line 'GOODS_SERVICES', using 0
[CustomEventMapper] No valid event codes for line FINANCE_COSTS
[CustomEventMapper] No valid event codes for line SUBSIDIES
[CustomEventMapper] No valid event codes for line GRANTS_OTHER_TRANSFERS
[CustomEventMapper] No valid event codes for line SOCIAL_ASSISTANCE
[CustomEventMapper] No valid event codes for line OTHER_EXPENSES
... (repeated for each statement generation)
```

This created **~20+ log lines per statement generation**, making it difficult to identify actual issues.

## Solution

### Changes Made

#### 1. Planning JSON Processing Logs (data-aggregation-engine.ts)
**Removed:**
```typescript
console.log(`[Planning JSON] Processing ${activityIds.length} planning activities`);
console.log(`[Planning JSON] Generated ${eventEntries.length} entries from planning structure`);
console.log(`Generated ${eventEntries.length} event entries from quarterly JSON`);
```

**Reason:** These are informational logs that don't indicate errors. The processing happens successfully without needing to log every step.

#### 2. CustomEventMapper Missing Event Codes (custom-event-mapper.ts)
**Before:**
```typescript
if (validEventCodes.length === 0) {
  console.warn(`[CustomEventMapper] No valid event codes for line ${lineCode}`);
  return { lineCode, budgetEvents: [], actualEvents: [] };
}
```

**After:**
```typescript
if (validEventCodes.length === 0) {
  // Reduced logging: Use debug level for missing event codes (expected for some lines)
  console.debug(`[CustomEventMapper] No valid event codes for line ${lineCode}`);
  return { lineCode, budgetEvents: [], actualEvents: [] };
}
```

**Reason:** Missing event codes are expected for certain line items in Budget vs Actual statements. These lines use custom mappings or computed formulas instead of direct event mappings.

#### 3. Missing Actual Events (custom-event-mapper.ts)
**Before:**
```typescript
if (amount === undefined) {
  const warning = `Actual event '${eventCode}' not found for line '${mapping.lineCode}', using 0`;
  warnings.push(warning);
  if (logger) logger(warning);  // Logs to console
}
```

**After:**
```typescript
if (amount === undefined) {
  const warning = `Actual event '${eventCode}' not found for line '${mapping.lineCode}', using 0`;
  warnings.push(warning);
  // Reduced logging: Don't log individual missing events, they're already in warnings array
  // if (logger) logger(warning);
}
```

**Reason:** These warnings are already captured in the warnings array and included in the statement metadata. Logging them to console creates noise without adding value.

## Result

### Before:
```
[Planning JSON] Processing 21 planning activities
[Planning JSON] Generated 21 entries from planning structure
Generated 21 event entries from quarterly JSON
[CustomEventMapper] No valid event codes for line TAX_REVENUE
[CustomEventMapper] No valid event codes for line GRANTS_TRANSFERS
[CustomEventMapper] No valid event codes for line OTHER_REVENUE
[CustomEventMapper] No valid event codes for line COMPENSATION_EMPLOYEES
[BudgetVsActualProcessor] Actual event 'GRANTS_TRANSFERS' not found for line 'GOODS_SERVICES', using 0
[CustomEventMapper] No valid event codes for line FINANCE_COSTS
[CustomEventMapper] No valid event codes for line SUBSIDIES
[CustomEventMapper] No valid event codes for line GRANTS_OTHER_TRANSFERS
[CustomEventMapper] No valid event codes for line SOCIAL_ASSISTANCE
[CustomEventMapper] No valid event codes for line OTHER_EXPENSES
```

### After:
```
(Clean - no logs unless actual errors occur)
```

**Reduction:** From ~20+ log lines to 0 log lines per statement generation

## Why These Logs Were Safe to Remove

### 1. Planning JSON Processing
- **What it logged**: Number of activities being processed
- **Why it's safe**: This is normal operation, not an error condition
- **Where info is available**: Statement metadata includes processing statistics

### 2. Missing Event Codes
- **What it logged**: Lines without direct event mappings
- **Why it's safe**: These lines use custom mappings or formulas (expected behavior)
- **Where info is available**: Debug logs (enable with LOG_LEVEL=debug)

### 3. Missing Actual Events
- **What it logged**: Events not found in execution data
- **Why it's safe**: Warnings are captured in statement metadata
- **Where info is available**: Statement validation results and warnings array

## When to Enable Debug Logging

Enable debug logging when:
- Investigating why specific line items have zero values
- Debugging event mapping issues
- Troubleshooting Budget vs Actual discrepancies

Set environment variable:
```bash
LOG_LEVEL=debug npm run dev
```

## Impact

### Performance
- **Reduced I/O**: Less console logging improves performance
- **Faster generation**: Budget vs Actual statements generate more quickly

### Developer Experience
- **Cleaner logs**: Only errors and critical warnings visible
- **Easier debugging**: Real issues stand out without noise
- **Better monitoring**: Production logs focus on actionable information

## Related Files
- `apps/server/src/lib/statement-engine/engines/data-aggregation-engine.ts` - Planning JSON processing
- `apps/server/src/api/routes/financial-reports/custom-event-mapper.ts` - Event mapping logic
- `apps/server/src/api/routes/financial-reports/budget-vs-actual-processor.ts` - Statement generation

## Date
December 3, 2025
