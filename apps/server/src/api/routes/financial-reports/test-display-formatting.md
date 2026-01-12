# Testing Display Formatting - Manual Test Guide

## Overview
This guide provides instructions for manually testing the display formatting implementation for working capital lines in Cash Flow Statements.

## Prerequisites
1. Server must be running
2. Database must be seeded with test data
3. Valid authentication token

## Test Scenarios

### Scenario 1: Cash Flow Statement with Working Capital Changes

**Endpoint:** `POST /api/financial-reports/generate-statement`

**Request Body:**
```json
{
  "statementCode": "CASH_FLOW",
  "reportingPeriodId": 1,
  "projectType": "HEALTH",
  "facilityId": 1,
  "includeComparatives": true
}
```

**Expected Response Structure:**
```json
{
  "statement": {
    "statementCode": "CASH_FLOW",
    "lines": [
      {
        "id": "CASH_FLOW_CHANGES_RECEIVABLES",
        "description": "Changes in receivables",
        "currentPeriodValue": -10000,
        "previousPeriodValue": -8000,
        "formatting": {
          "indentLevel": 3,
          "bold": false,
          "italic": true
        },
        "displayFormatting": {
          "currentPeriodDisplay": "(10000.00)",
          "previousPeriodDisplay": "(8000.00)",
          "showZeroValues": true,
          "negativeFormat": "parentheses",
          "isWorkingCapitalLine": true
        },
        "metadata": {
          "lineCode": "CHANGES_RECEIVABLES",
          "isComputed": true
        }
      },
      {
        "id": "CASH_FLOW_CHANGES_PAYABLES",
        "description": "Changes in payables",
        "currentPeriodValue": -7000,
        "previousPeriodValue": 5000,
        "formatting": {
          "indentLevel": 3,
          "bold": false,
          "italic": true
        },
        "displayFormatting": {
          "currentPeriodDisplay": "(7000.00)",
          "previousPeriodDisplay": "5000.00",
          "showZeroValues": true,
          "negativeFormat": "parentheses",
          "isWorkingCapitalLine": true
        },
        "metadata": {
          "lineCode": "CHANGES_PAYABLES",
          "isComputed": true
        }
      }
    ],
    "metadata": {
      "workingCapital": {
        "receivables": {
          "currentBalance": 50000,
          "previousBalance": 40000,
          "change": 10000,
          "cashFlowAdjustment": -10000
        },
        "payables": {
          "currentBalance": 18000,
          "previousBalance": 25000,
          "change": -7000,
          "cashFlowAdjustment": -7000
        }
      }
    }
  }
}
```

## Verification Checklist

### ✅ Display Formatting (Requirement 8.1, 8.2, 8.3)
- [ ] `displayFormatting` object is present in working capital lines
- [ ] `isWorkingCapitalLine` is `true` for CHANGES_RECEIVABLES and CHANGES_PAYABLES
- [ ] Negative values display with parentheses format: `(10000.00)`
- [ ] Positive values display without parentheses: `5000.00`
- [ ] Zero values display as `"0"` when `showZeroValues` is `true`
- [ ] `negativeFormat` is set to `"parentheses"`

### ✅ Indentation (Requirement 8.1)
- [ ] Working capital lines have `indentLevel: 3`
- [ ] Indentation is consistent with other adjustment lines

### ✅ Numeric Values
- [ ] `currentPeriodValue` contains the raw numeric value (e.g., `-10000`)
- [ ] `previousPeriodValue` contains the raw numeric value
- [ ] Values are rounded to 2 decimal places

### ✅ Metadata
- [ ] `workingCapital` object is present in statement metadata
- [ ] Contains `receivables` and `payables` details
- [ ] `cashFlowAdjustment` values match the line values

## cURL Command Example

```bash
curl -X POST http://localhost:3000/api/financial-reports/generate-statement \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "statementCode": "CASH_FLOW",
    "reportingPeriodId": 1,
    "projectType": "HEALTH",
    "facilityId": 1,
    "includeComparatives": true
  }'
```

## PowerShell Command Example

```powershell
$headers = @{
    "Content-Type" = "application/json"
    "Authorization" = "Bearer YOUR_TOKEN_HERE"
}

$body = @{
    statementCode = "CASH_FLOW"
    reportingPeriodId = 1
    projectType = "HEALTH"
    facilityId = 1
    includeComparatives = $true
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:3000/api/financial-reports/generate-statement" `
    -Method Post `
    -Headers $headers `
    -Body $body
```

## Validation Steps

1. **Check Line Structure:**
   ```javascript
   const receivablesLine = response.statement.lines.find(
     l => l.metadata.lineCode === 'CHANGES_RECEIVABLES'
   );
   
   console.log('Display Formatting:', receivablesLine.displayFormatting);
   // Should show: { currentPeriodDisplay: "(10000.00)", ... }
   ```

2. **Verify Indentation:**
   ```javascript
   console.log('Indent Level:', receivablesLine.formatting.indentLevel);
   // Should be: 3
   ```

3. **Check Metadata:**
   ```javascript
   console.log('Working Capital:', response.statement.metadata.workingCapital);
   // Should show receivables and payables details
   ```

## Expected Formatting Examples

| Scenario | Numeric Value | Display Value | Format |
|----------|--------------|---------------|--------|
| Negative receivables | -10000 | (10000.00) | Parentheses |
| Positive receivables | 5000 | 5000.00 | Plain |
| Zero receivables | 0 | 0 | Plain |
| Negative payables | -7000 | (7000.00) | Parentheses |
| Positive payables | 3000 | 3000.00 | Plain |

## Troubleshooting

### Issue: displayFormatting is undefined
**Solution:** Ensure you're testing with a CASH_FLOW statement and the working capital calculator is running successfully.

### Issue: Values not formatted with parentheses
**Solution:** Check that `negativeFormat` is set to `"parentheses"` in the displayFormatting object.

### Issue: Indentation level is not 3
**Solution:** Verify the template definition in `statement-templates.ts` has `level: 3` for working capital lines.

### Issue: workingCapital metadata is missing
**Solution:** Ensure the working capital calculator is enabled and running for the CASH_FLOW statement.

## Success Criteria

The implementation is successful if:
1. ✅ All working capital lines have `displayFormatting` metadata
2. ✅ Negative values display with parentheses
3. ✅ Indentation level is 3
4. ✅ Working capital metadata is included in response
5. ✅ Both numeric and display values are present
6. ✅ Tests pass without errors

## Next Steps

After verifying the endpoint:
1. Test with different scenarios (zero values, large numbers, etc.)
2. Verify the formatting in the UI when displaying the statement
3. Implement PDF export using the display formatting
4. Implement CSV/Excel export using the export preparation function
