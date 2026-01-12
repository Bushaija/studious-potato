# Stock vs Flow Sections in Financial Statements

## Overview

Financial statement sections are categorized as either **Stock** or **Flow** sections, which determines how their values should be calculated from quarterly data.

## Section Types

### Stock Sections (Balance Sheet Items)
- **Section D**: Financial Assets
- **Section E**: Financial Liabilities

**Characteristics:**
- Represent balances at a point in time
- Values should use `cumulative_balance` (latest reported quarter balance)
- NOT summed across quarters

**Examples:**
- Cash at bank: $10,000 in Q2 means $10,000 balance at end of Q2
- Payables: $5,000 in Q3 means $5,000 owed at end of Q3

### Flow Sections (Income Statement Items)
- **Section A**: Receipts/Revenue
- **Section B**: Expenditures/Expenses  
- **Section G**: Equity Changes

**Characteristics:**
- Represent flows over time
- Values should sum all quarters (Q1 + Q2 + Q3 + Q4)
- Cumulative over the reporting period

**Examples:**
- Revenue: $1,000 in Q1 + $2,000 in Q2 = $3,000 total revenue
- Expenses: $500 in Q1 + $800 in Q2 = $1,300 total expenses

## Implementation

### Data Structure
```json
{
  "MAL_EXEC_HEALTH_CENTER_D_1": {
    "q1": 0,
    "q2": 7425438,
    "q3": 10000,
    "q4": 0,
    "cumulative_balance": 0,  // ← Use this for D/E sections
    "subSection": "D"
  },
  "MAL_EXEC_HEALTH_CENTER_A_2": {
    "q1": 0,
    "q2": 16449864,
    "q3": 0,
    "q4": 0,
    "cumulative_balance": 16449864,  // ← Don't use this for A/B/G
    "subSection": "A"  // ← Sum quarters for A/B/G sections
  }
}
```

### Code Logic
```typescript
if (subSection === 'D' || subSection === 'E') {
  // Stock sections: Use cumulative_balance
  totalAmount = Number(activity.cumulative_balance) || 0;
} else {
  // Flow sections: Sum all quarters
  totalAmount = (Number(activity.q1) || 0) + (Number(activity.q2) || 0) + 
               (Number(activity.q3) || 0) + (Number(activity.q4) || 0);
}
```

## Event Mappings

### Section D (Financial Assets)
- Cash at bank → `CASH_EQUIVALENTS_END`
- Petty cash → `CASH_EQUIVALENTS_END`
- Receivables (VAT refund) → `ADVANCE_PAYMENTS`
- Other Receivables → `ADVANCE_PAYMENTS`

### Section E (Financial Liabilities)
- Salaries on borrowed funds (BONUS) → `PAYABLES`
- Payable - Maintenance & Repairs → `PAYABLES`
- Payable - Office suppliers → `PAYABLES`
- Payable - Transportation fees → `PAYABLES`
- VAT refund to RBC → `PAYABLES`

## Impact on Financial Statements

This fix ensures:
1. **Balance Sheet accuracy**: Assets and liabilities show correct balances
2. **Income Statement accuracy**: Revenue and expenses show correct totals
3. **Accounting equation balance**: Assets = Liabilities + Equity
4. **Quarterly reporting consistency**: Stock vs flow treatment matches accounting principles

## Before vs After

### Before (Incorrect)
```
D. Financial Assets: $17,646,836 (sum of all quarters)
E. Financial Liabilities: $7,183,969 (sum of all quarters)
```

### After (Correct)
```
D. Financial Assets: $0 (cumulative_balance at latest quarter)
E. Financial Liabilities: $20,000 (cumulative_balance at latest quarter)
```

This ensures financial statements reflect actual balances rather than incorrect quarterly sums.