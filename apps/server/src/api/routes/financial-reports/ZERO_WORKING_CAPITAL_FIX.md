# Fix: Zero Working Capital Change Issue

## Problem Identified

When testing the endpoint with receivables that stayed the same between periods (8 in both 2024-25 and 2025-26), the response incorrectly showed:

```json
{
  "currentPeriodValue": 8,  // ❌ Should be 0 (the change)
  "previousPeriodValue": 8,  // ❌ Should be 0
  "metadata": {
    "isComputed": false  // ❌ Should be true
  }
}
```

**Expected behavior:** The line should show `0` (the change/adjustment), not `8` (the raw balance).

## Root Cause

The original logic had a flaw:

```typescript
// OLD LOGIC (BROKEN)
if (statementCode === 'CASH_FLOW' && workingCapitalResult) {
  if (templateLine.lineCode === 'CHANGES_RECEIVABLES') {
    currentPeriodValue = workingCapitalResult.receivablesChange.cashFlowAdjustment;
    previousPeriodValue = 0;
  }
}

// Only calculate if not already set by working capital logic
if (currentPeriodValue === 0 && previousPeriodValue === 0) {
  // Falls through to event mapping logic
  // Sums up raw event data (8 + 8 = 8)
}
```

**The Problem:** When the working capital adjustment is `0` (a valid computed value), the condition `currentPeriodValue === 0 && previousPeriodValue === 0` evaluates to `true`, causing the code to fall through to the event mapping logic, which then incorrectly sums up the raw balance sheet data.

## The Fix

Added a flag to track whether working capital was computed, and applied it to both current and previous period calculations:

### Current Period Fix
```typescript
// NEW LOGIC (FIXED)
let isWorkingCapitalComputed = false;

if (statementCode === 'CASH_FLOW' && workingCapitalResult) {
  if (templateLine.lineCode === 'CHANGES_RECEIVABLES') {
    currentPeriodValue = workingCapitalResult.receivablesChange.cashFlowAdjustment;
    previousPeriodValue = 0;
    isWorkingCapitalComputed = true; // ✅ Mark as computed
  }
}

// Only calculate if not already set by working capital logic
if (!isWorkingCapitalComputed) {
  // Now correctly skips event mapping when working capital is computed
}
```

### Previous Period Fix
```typescript
// Previous period calculation
if (periodComparison) {
  if (isWorkingCapitalComputed) {
    // ✅ Skip event mapping for working capital lines
    // Keep previousPeriodValue as 0 (set above)
  } else if (templateLine.calculationFormula || shouldComputeTotal(...)) {
    // Handle formulas
  } else {
    // Handle event mappings (only for non-working-capital lines)
  }
}
```

### Metadata Update
```typescript
metadata: {
  lineCode: templateLine.lineCode,
  eventCodes: templateLine.eventMappings || [],
  formula: templateLine.calculationFormula,
  isComputed: !!templateLine.calculationFormula || isWorkingCapitalComputed, // ✅ Include working capital flag
  displayOrder: templateLine.displayOrder
}
```

## Why This Matters

### Scenario: No Change in Receivables

**Given:**
- Receivables (2024-25): 8
- Receivables (2025-26): 8

**Calculation:**
```
Change = Current - Previous = 8 - 8 = 0
Cash Flow Adjustment = -(Change) = -(0) = 0
```

**Expected Result:**
- Line value: `0` (the adjustment)
- Display: `"0"`
- isComputed: `true`

**Before Fix:**
- Line value: `8` (raw balance - WRONG!)
- Display: `"8.00"`
- isComputed: `false`

**After Fix:**
- Line value: `0` (adjustment - CORRECT!)
- Display: `"0"`
- isComputed: `true`

## Impact on Cash Flow Calculation

### Before Fix (Incorrect)
```
Operating Cash Flow = Revenues - Expenses + Adjustments
                    = 250,000 - 180,000 + 8  // ❌ Wrong!
                    = 70,008
```

### After Fix (Correct)
```
Operating Cash Flow = Revenues - Expenses + Adjustments
                    = 250,000 - 180,000 + 0  // ✅ Correct!
                    = 70,000
```

## Test Coverage

Created `working-capital-zero-change.test.ts` with tests for:
- ✅ Zero change calculation
- ✅ Computed flag behavior
- ✅ Event data not used when computed
- ✅ Proper formatting of zero values
- ✅ Before/after comparison

## Files Modified

1. **apps/server/src/api/routes/financial-reports/financial-reports.handlers.ts**
   - Added `isWorkingCapitalComputed` flag
   - Updated condition from `if (currentPeriodValue === 0 && previousPeriodValue === 0)` to `if (!isWorkingCapitalComputed)`
   - Updated `metadata.isComputed` to include working capital flag

2. **apps/server/src/api/routes/financial-reports/working-capital-zero-change.test.ts** (NEW)
   - Comprehensive test coverage for zero change scenario

## Verification

After the fix, the endpoint should return:

```json
{
  "id": "CASH_FLOW_CHANGES_RECEIVABLES",
  "description": "Changes in receivables",
  "currentPeriodValue": 0,  // ✅ Correct: the change
  "previousPeriodValue": 0,  // ✅ Correct: not calculated (would need 2 periods back)
  "metadata": {
    "lineCode": "CHANGES_RECEIVABLES",
    "isComputed": true,  // ✅ Correct: marked as computed
    "eventCodes": [23]
  },
  "displayFormatting": {
    "currentPeriodDisplay": "0",  // ✅ Correct: shows zero
    "previousPeriodDisplay": "0",  // ✅ Correct: shows zero
    "showZeroValues": true,
    "negativeFormat": "parentheses",
    "isWorkingCapitalLine": true
  }
}
```

### Test Results (After Full Fix)

**First test (current period only fixed):**
```json
{
  "currentPeriodValue": 0,  // ✅ Fixed
  "previousPeriodValue": 8,  // ❌ Still showing raw balance
  "metadata": { "isComputed": true }  // ✅ Fixed
}
```

**After applying previous period fix:**
```json
{
  "currentPeriodValue": 0,  // ✅ Correct
  "previousPeriodValue": 0,  // ✅ Correct
  "metadata": { "isComputed": true }  // ✅ Correct
}
```

## Related Requirements

This fix ensures compliance with:
- **Requirement 1.1:** Calculate receivables change correctly
- **Requirement 1.2:** Calculate payables change correctly
- **Requirement 4.1:** Inject working capital adjustments into statement lines
- **Requirement 8.3:** Handle zero values according to showZeroValues option

## Testing Instructions

1. **Restart the server** to pick up the changes
2. **Make the same API call:**
   ```bash
   POST /api/financial-reports/generate-statement
   {
     "statementCode": "CASH_FLOW",
     "reportingPeriodId": 2,
     "projectType": "TB",
     "facilityId": 2,
     "includeComparatives": true
   }
   ```
3. **Verify the response:**
   - `currentPeriodValue` should be `0` (not `8`)
   - `metadata.isComputed` should be `true` (not `false`)
   - `displayFormatting.currentPeriodDisplay` should be `"0"` (not `"8.00"`)

## Summary

The fix ensures that **zero is treated as a valid computed value** for working capital adjustments, preventing the code from incorrectly falling through to event mapping logic. This is critical because:

1. Zero change is a valid and common scenario
2. The line should show the **change** (0), not the **balance** (8)
3. The line must be marked as **computed** to indicate it's a working capital adjustment
4. This affects the accuracy of the operating cash flow calculation
