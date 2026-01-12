# Execution Details Display Bug Fix

## Problem
The execution details page was displaying incorrect values for stock section items (Section D and E).

### Example:
- API returns: `"q2": 9440` for Payable 7
- UI displayed: `4720` (Q1 value) ❌

## Root Cause
**Location**: `apps/client/features/execution/components/v2/table.tsx` (Line ~606 and ~650)

```typescript
const displayValue = isCurrentQuarter ? (Number(value || 0) - openingBalance) : value;
```

The UI was **subtracting the opening balance** from the current quarter's value, which is incorrect for stock sections.

### Why This is Wrong:
1. **API returns cumulative values** for stock sections (D, E)
   - Q1 = 4720 (new amount)
   - Q2 = 9440 (Q1 + new amount) ✅ Correct cumulative value

2. **UI subtracts opening balance**:
   - Display = 9440 - 4720 = 4720 ❌ Wrong! Shows Q1 value instead of Q2

3. **This logic was meant for flow sections** where you want to show only the new amount per quarter, not cumulative

## Solution

### Option 1: Don't Subtract for Stock Sections
```typescript
// Determine if this is a stock section (D or E)
const isStockSection = item.id.includes('_D_') || item.id.includes('_E_');

const displayValue = isCurrentQuarter && !isStockSection 
  ? (Number(value || 0) - openingBalance) 
  : value;
```

### Option 2: Remove Opening Balance Subtraction Entirely
Since the API already returns correct cumulative values for stock sections, we might not need this subtraction at all:

```typescript
const displayValue = value; // API returns correct values
```

### Option 3: Check Section Type from Context
```typescript
// Get section from item ID
const section = item.id.split('_')[3]; // Extract section letter (D, E, etc.)
const isStockSection = section === 'D' || section === 'E';

const displayValue = isCurrentQuarter && !isStockSection
  ? (Number(value || 0) - openingBalance)
  : value;
```

## ✅ Fix Applied

Modified `apps/client/features/execution/components/v2/table.tsx` at two locations:

### Location 1: Display value (Line ~605)
```typescript
// Check if this is a stock section (D or E) - these show cumulative values
const isStockSection = item.id.includes('_D_') || item.id.includes('_E_');
// For stock sections, display cumulative value as-is
// For flow sections, subtract opening balance to show only new amount
const displayValue = isCurrentQuarter && !isStockSection 
  ? (Number(value || 0) - openingBalance) 
  : value;
```

### Location 2: Input field value (Line ~650)
```typescript
value={(() => {
  // Check if this is a stock section (D or E) - these show cumulative values
  const isStockSection = item.id.includes('_D_') || item.id.includes('_E_');
  // For stock sections, display cumulative value as-is
  // For flow sections, subtract opening balance to show only new amount
  return (isCurrentQuarter && !isStockSection 
    ? (Number(value || 0) - openingBalance) 
    : value) ?? "";
})()}
```

## Complete Fix Summary

### Two Issues Fixed:

1. **Display Logic (table.tsx)** - Lines ~605 and ~650
   - Added stock section detection to prevent incorrect opening balance subtraction
   - Stock sections (D, E) now display cumulative values correctly

2. **Cash at Bank Auto-Calculation (use-execution-form.ts)** - Line ~373
   - Changed from independent quarter calculation to cumulative calculation
   - Now correctly adds current quarter changes to previous quarter balance
   - This was the PRIMARY issue causing wrong values

## Impact
- **Sections Affected**: D (Financial Assets), specifically Cash at Bank
- **Items Affected**: Cash at Bank (auto-calculated field)
- **Severity**: High - Was displaying and calculating incorrect financial data
- **Data Integrity**: API data was correct, but client-side calculation was overwriting it

## Testing
1. View execution for Q2 with stock section data
2. Verify Q2 displays cumulative value (not Q1 value)
3. Example: If Q1=4720 and Q2=9440, verify UI shows 9440 (not 4720)

## Status
✅ **FIXED** - December 3, 2025

The root cause has been identified and fixed!

### Debug Logs Added:
1. **[SECTION D ITEM DEBUG]** - Logs raw item data from API at the start of rendering
2. **[VALUE SOURCE DEBUG]** - Logs where the value comes from (item vs formData) for each quarter
3. **[DISPLAY DEBUG]** - Logs the display value calculation including stock section detection
4. **[INPUT DEBUG]** - Logs the input field value calculation

### What to Check:
- Open browser console and filter for these debug tags
- Look for the problematic item (e.g., Cash at Bank, Payable 7)
- Verify:
  - **[TABLE BUILD DEBUG]**: What values are in `formData` when the table is built?
  - **[SECTION D ITEM DEBUG]**: What values does the `item` object have (q1, q2, q3, q4)?
  - **[VALUE SOURCE DEBUG]**: Where does the value come from (`valueFromItem` vs `valueFromFormData`)?
  - **[DISPLAY DEBUG]**: Is `isStockSection` correctly detecting Section D/E items?
  - **[INPUT DEBUG]**: What value is being set in the input field?

### Root Cause Identified:
1. **API returns correct cumulative values**: `HIV_EXEC_HOSPITAL_D_1` has `q2: 120400` ✅
2. **formData initially has correct values**: `{"q1": 60200, "q2": 120400}` ✅
3. **But a useEffect recalculates and overwrites the value**: The Cash at Bank auto-calculation was treating Q2 as a fresh calculation instead of cumulative ❌

**The Problem:**
The `useEffect` in `use-execution-form.ts` (line ~373) was calculating Cash at Bank as:
```typescript
calculatedCashAtBank = openingBalance + totalReceipts - totalPaidExpenses - ...
```

This treats each quarter independently, but **Cash at Bank is a stock (cumulative) value**, not a flow value!

**The Fix:**
Changed the calculation to be cumulative:
```typescript
// Get previous quarter's cash balance
const previousQuarterCash = previousQuarterKey 
  ? (Number(formData[cashAtBankCode]?.[previousQuarterKey]) || 0)
  : openingBalance;

// Calculate as cumulative: Previous Quarter + Current Quarter Changes
calculatedCashAtBank = previousQuarterCash + totalReceipts - totalPaidExpenses - ...
```

Now Q2 Cash = Q1 Cash + Q2 Receipts - Q2 Expenses, which gives the correct cumulative value!
