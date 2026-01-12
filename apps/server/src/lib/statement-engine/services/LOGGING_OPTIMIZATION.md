# Carryforward Service Logging Optimization

## Problem
The CarryforwardService was generating excessive log output when processing statements for multiple facilities without previous period data:

**Before:**
```
[12:56:07] INFO: No execution data found for: period=1, facility=1, project=HIV
[12:56:07] WARN: No execution data found for facility 1 (butaro) in previous period
[12:56:07] INFO: No execution data found for: period=1, facility=2, project=HIV
[12:56:07] WARN: No execution data found for facility 2 (kivuye) in previous period
... (repeated for all 19 facilities)
```

This created **38 log lines per facility** (19 facilities × 2 logs = 38 lines), making it difficult to identify actual issues.

## Solution
Reduced logging verbosity by changing individual facility warnings to debug level, keeping only summary warnings:

### Changes Made

#### 1. Individual Facility Missing Data (Line ~1395)
**Before:**
```typescript
this.logger.warn(
  `No execution data found for facility ${facilityId} (${facilityName}) in previous period`
);
```

**After:**
```typescript
this.logger.debug(
  `No execution data found for facility ${facilityId} (${facilityName}) in previous period`
);
```

#### 2. Execution Data Not Found (Line ~617)
**Before:**
```typescript
this.logger.info(
  `No execution data found for: period=${previousPeriodId}, ` +
  `facility=${facilityId}, project=${projectType}`
);
```

**After:**
```typescript
this.logger.debug(
  `No execution data found for: period=${previousPeriodId}, ` +
  `facility=${facilityId}, project=${projectType}`
);
```

## Result

**After optimization:**
```
[12:56:07] INFO: Getting beginning cash via carryforward for period 2
[12:56:07] INFO: Found previous period: id=1, year=2025, type=ANNUAL, endDate=2025-06-30
[12:56:07] INFO: Aggregated beginning cash: 0 from 19 facilities. Found data for 0 facilities. Missing data for 19 facilities.
[12:56:07] WARN: Missing previous period statements for 19 out of 19 facilities: butaro (ID: 1), kivuye (ID: 2), ... [full list]
[12:56:07] WARN: Previous period ending cash is zero
```

**Reduction:** From ~38 log lines to ~5 log lines (87% reduction)

## Logging Levels

### INFO Level (Visible in production)
- High-level operation start/completion
- Summary statistics (e.g., "Aggregated beginning cash from X facilities")
- Successful carryforward operations

### WARN Level (Visible in production)
- Summary warnings (e.g., "Missing data for X facilities")
- Zero ending cash (may indicate missing data)
- Override detection (manual entry differs from carryforward)

### DEBUG Level (Only in development)
- Individual facility processing
- Individual facility missing data
- Detailed calculation steps
- Query execution details

## Benefits

1. **Cleaner Production Logs**: Only actionable warnings and summaries
2. **Easier Debugging**: Enable debug level when investigating specific facility issues
3. **Better Performance**: Reduced I/O from excessive logging
4. **Maintained Traceability**: All information still available at debug level

## When to Enable Debug Logging

Enable debug logging when:
- Investigating why a specific facility has missing data
- Debugging carryforward calculation issues
- Troubleshooting database query performance

Set environment variable:
```bash
LOG_LEVEL=debug npm run dev
```

Or in code:
```typescript
logger.level = 'debug';
```

## Date
December 3, 2025


## Phase 2 Optimization (Further Reduction)

### Additional Changes Made

#### 3. "Found previous period" (Line ~519)
Changed from INFO to DEBUG level - only needed for debugging

#### 4. "Aggregated beginning cash" (Line ~1414)
Only logged at INFO level if there's actual data (totalBeginningCash > 0)
If all facilities missing, logged at DEBUG level

#### 5. "Missing previous period statements" (Line ~1434)
Only logged at WARN level if some (not all) facilities are missing
If all facilities missing, logged at DEBUG level with simplified message

#### 6. "Previous period ending cash is zero" (Line ~362, ~1763)
Changed from WARN to DEBUG level - common for first period, not an error

### Result After Phase 2

**Before Phase 2:**
```
[13:43:35] INFO: Found previous period: id=1, year=2025, type=ANNUAL, endDate=2025-06-30
[13:43:35] INFO: Aggregated beginning cash: 0 from 19 facilities. Found data for 0 facilities. Missing data for 19 facilities.
[13:43:35] WARN: Missing previous period statements for 19 out of 19 facilities: butaro (ID: 1), kivuye (ID: 2), ... [full list]
[13:43:35] WARN: Previous period ending cash is zero
```

**After Phase 2:**
```
[13:43:35] INFO: Getting beginning cash via carryforward for period 2
```

**Total Reduction:** From ~38 log lines to ~1 log line (97% reduction)

### Rationale

When **all facilities** are missing previous period data (common for first reporting period):
- This is **expected behavior**, not an error
- Logging 19 facility names is noise, not actionable information
- Users don't need to see this every time they generate a statement
- Debug logs still available for troubleshooting

When **some facilities** are missing data:
- This **is actionable** - indicates partial data issues
- WARN level appropriate to alert users
- Facility names help identify which ones need attention

## Updated: December 3, 2025
