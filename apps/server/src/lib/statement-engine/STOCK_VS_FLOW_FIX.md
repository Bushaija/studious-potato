# Stock vs Flow Section Fix - Balance Sheet Issue

## Problem
Cash and cash equivalents, Advance payments, and Payables were showing **incorrect values** on the balance sheet:
- **Expected**: Latest quarter value (e.g., Q2 = 30,000)
- **Actual**: Sum of all quarters (e.g., Q1 + Q2 = 80,000)

## Root Cause
The data aggregation engine in `processExecutionJsonStructure()` was checking for `activity.subSection` to determine if an activity belongs to a stock section (D, E) or flow section (A, B, G). However, `subSection` doesn't exist in the JSON data structure - it needs to be **extracted from the activity code**.

## Solution
Modified `apps/server/src/lib/statement-engine/engines/data-aggregation-engine.ts`:

### 1. Added `extractSectionFromCode()` helper method
```typescript
/**
 * Extract section letter from activity code
 * Examples:
 *   "HIV_EXEC_HOSPITAL_D_1" -> "D"
 *   "MAL_EXEC_HEALTH_CENTER_E_3" -> "E"
 *   "TB_EXEC_HOSPITAL_A_2" -> "A"
 */
private extractSectionFromCode(code: string): string | null {
  if (!code) return null;
  
  const parts = code.split('_');
  const execIndex = parts.findIndex(p => p === 'EXEC');
  
  if (execIndex === -1) return null;
  
  // Find the first single-letter part after 'EXEC' that matches A-G
  for (let i = execIndex + 1; i < parts.length; i++) {
    if (parts[i].length === 1 && /[A-G]/.test(parts[i])) {
      return parts[i];
    }
  }
  
  return null;
}
```

### 2. Updated amount calculation logic (lines 656-676)
**Before:**
```typescript
const subSection = activity.subSection; // ❌ This doesn't exist!

if (subSection === 'D' || subSection === 'E') {
  totalAmount = Number(activity.cumulative_balance) || 0;
} else {
  totalAmount = (Number(activity.q1) || 0) + (Number(activity.q2) || 0) + 
               (Number(activity.q3) || 0) + (Number(activity.q4) || 0);
}
```

**After:**
```typescript
// Extract section from activity code
const section = this.extractSectionFromCode(activityCode);

if (section === 'D' || section === 'E') {
  // Stock sections: Use cumulative_balance (latest quarter)
  totalAmount = Number(activity.cumulative_balance) || 0;
} else {
  // Flow sections: Sum all quarters
  totalAmount = (Number(activity.q1) || 0) + (Number(activity.q2) || 0) + 
               (Number(activity.q3) || 0) + (Number(activity.q4) || 0);
}
```

**Note:** Debug console.log statements were removed after verification to reduce log noise.

## Impact

### Stock Sections (D, E) - Balance Sheet Items
Now correctly use **cumulative_balance** (latest quarter value):
- **D. Financial Assets**
  - Cash and cash equivalents (CASH_EQUIVALENTS_END)
  - Advance payments (ADVANCE_PAYMENTS)
- **E. Financial Liabilities**
  - Payables (PAYABLES)

### Flow Sections (A, B, G) - Income Statement Items
Continue to sum all quarters (unchanged):
- **A. Receipts** - Revenue items
- **B. Expenditures** - Expense items
- **G. Closing Balance** - Equity changes

## Example
Given execution data:
- Cash at Bank: Q1 = 50,000, Q2 = 30,000, cumulative_balance = 30,000

**Before Fix:**
- Balance Sheet shows: 80,000 (Q1 + Q2) ❌

**After Fix:**
- Balance Sheet shows: 30,000 (cumulative_balance) ✅

## Testing
To verify the fix:
1. Enter execution data with different quarterly values for Cash at Bank
2. Generate balance sheet (Assets & Liabilities statement)
3. Verify "Cash and cash equivalents" shows the latest quarter value, not the sum
4. Run the unit tests: `npm test -- stock-vs-flow.test.ts`

## Related Files
- `apps/server/src/lib/statement-engine/engines/data-aggregation-engine.ts` - **Main fix** (added extractSectionFromCode method)
- `apps/server/src/lib/statement-engine/utils/section-amount-calculator.ts` - **Also fixed** (added extractSectionFromCode helper)
- `apps/server/src/api/routes/execution/execution.helpers.ts` - Original parseCode logic (reference)
- `apps/server/src/lib/statement-engine/docs/STOCK_VS_FLOW_SECTIONS.md` - Documentation

## Additional Fixes
Also updated `section-amount-calculator.ts` to:
1. Make `subSection` optional in `ActivityData` interface
2. Add `extractSectionFromCode()` helper function
3. Auto-extract section from code if not provided in `calculateSectionAmount()` and `validateActivityData()`

## Date
December 3, 2025
