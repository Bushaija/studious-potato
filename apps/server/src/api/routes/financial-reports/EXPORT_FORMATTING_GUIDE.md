# Financial Statement Export Formatting Guide

## Overview

This document describes the formatting requirements for exporting financial statements to PDF, CSV, and Excel formats, with special attention to working capital lines in Cash Flow Statements.

**Related Task:** Task 7 - Update statement display formatting  
**Requirements:** 8.1, 8.2, 8.3, 8.4, 8.5

## Display Formatting

### Working Capital Lines

Working capital lines (`CHANGES_RECEIVABLES` and `CHANGES_PAYABLES`) in Cash Flow Statements require special formatting:

1. **Indentation Level:** Level 3 (defined in template)
2. **Negative Value Formatting:** Parentheses or minus sign
3. **Zero Value Handling:** Display "0" or "-" based on `showZeroValues` option

### Statement Line Structure

Each statement line includes a `displayFormatting` property with the following structure:

```typescript
interface DisplayFormatting {
  currentPeriodDisplay: string;      // Pre-formatted display value
  previousPeriodDisplay: string;     // Pre-formatted display value
  showZeroValues: boolean;           // Whether to show "0" or "-"
  negativeFormat: 'parentheses' | 'minus';  // How to display negative values
  isWorkingCapitalLine: boolean;     // Identifies working capital lines
}
```

## PDF Export Formatting (Requirement 8.4)

### Working Capital Line Styling

When implementing PDF export, working capital lines should:

1. **Indentation:** Apply 3 levels of indentation (typically 30-45 pixels)
2. **Negative Values:** Use parentheses format: `(10,000.00)`
3. **Font:** Regular weight (not bold unless it's a total/subtotal)
4. **Alignment:** Right-align numeric values

### Example PDF Rendering

```
CASH FLOW FROM OPERATING ACTIVITIES
  ...
  Adjusted for:
     Changes in receivables        (10,000.00)    (8,000.00)
     Changes in payables            (7,000.00)     5,000.00
     Prior year adjustments          2,000.00      1,500.00
```

### Implementation Notes

```typescript
// Pseudo-code for PDF rendering
function renderStatementLine(line: StatementLine, pdf: PDFDocument) {
  const indentPixels = line.formatting.indentLevel * 15; // 15px per level
  
  // Use pre-formatted display value if available
  const currentDisplay = line.displayFormatting?.currentPeriodDisplay || 
    formatNumber(line.currentPeriodValue);
  
  pdf.text(line.description, indentPixels, yPosition);
  pdf.text(currentDisplay, rightColumnX, yPosition, { align: 'right' });
  
  // Apply styling
  if (line.formatting.bold) {
    pdf.font('Helvetica-Bold');
  }
  if (line.displayFormatting?.isWorkingCapitalLine) {
    // Special styling for working capital lines if needed
  }
}
```

## CSV/Excel Export Formatting (Requirement 8.5)

### Column Structure

CSV/Excel exports should include the following columns:

| Column | Description | Example |
|--------|-------------|---------|
| Line Code | Unique identifier | `CHANGES_RECEIVABLES` |
| Description | Line description | `Changes in receivables` |
| Indent Level | Numeric indent level | `3` |
| Current Period | Signed numeric value | `-10000.00` |
| Previous Period | Signed numeric value | `-8000.00` |
| Variance | Change amount | `2000.00 (25%)` |
| Is Total | Boolean flag | `false` |
| Is Subtotal | Boolean flag | `false` |

### Signed Values

**Important:** CSV/Excel exports use **minus sign format** (not parentheses) for negative values to ensure proper numeric interpretation by spreadsheet software.

```typescript
// Use minus sign for CSV/Excel
const exportValue = formatStatementValue(value, {
  negativeFormat: 'minus',  // -10000.00 instead of (10000.00)
  showZeroValues: true
});
```

### Working Capital Metadata

Include working capital calculation details in a separate metadata sheet or section:

```csv
# Working Capital Metadata
Account Type,Current Balance,Previous Balance,Change,Cash Flow Adjustment
Receivables,50000.00,40000.00,10000.00,-10000.00
Payables,18000.00,25000.00,-7000.00,-7000.00
```

### Implementation Example

```typescript
import { prepareStatementForExport } from './financial-reports.handlers';

// Prepare statement data for export
const exportData = prepareStatementForExport(statement);

// Generate CSV
const csv = [
  exportData.headers.join(','),
  ...exportData.rows.map(row => row.join(','))
].join('\n');

// Include working capital metadata if available
if (exportData.metadata.workingCapital) {
  csv += '\n\n# Working Capital Details\n';
  csv += 'Account,Current,Previous,Change,Adjustment\n';
  csv += `Receivables,${exportData.metadata.workingCapital.receivables.currentBalance},`;
  csv += `${exportData.metadata.workingCapital.receivables.previousBalance},`;
  csv += `${exportData.metadata.workingCapital.receivables.change},`;
  csv += `${exportData.metadata.workingCapital.receivables.cashFlowAdjustment}\n`;
  // ... similar for payables
}
```

## Format Conversion Table

| Value | Parentheses Format | Minus Format | Zero (show) | Zero (hide) |
|-------|-------------------|--------------|-------------|-------------|
| 10000 | 10000.00 | 10000.00 | - | - |
| -10000 | (10000.00) | -10000.00 | - | - |
| 0 | - | - | 0 | - |
| 0.01 | 0.01 | 0.01 | - | - |
| -0.01 | (0.01) | -0.01 | - | - |

## Testing Checklist

### PDF Export (Requirement 8.4)
- [ ] Working capital lines appear with correct indentation (level 3)
- [ ] Negative values display with parentheses
- [ ] Zero values display according to `showZeroValues` option
- [ ] Font styling matches other adjustment lines
- [ ] Alignment is consistent with other numeric columns

### CSV/Excel Export (Requirement 8.5)
- [ ] Working capital adjustments export with signed values (minus format)
- [ ] Numeric values are properly formatted for spreadsheet import
- [ ] Working capital metadata is included in export
- [ ] Column headers are clear and descriptive
- [ ] Indentation level is preserved as numeric value

## Helper Functions

### formatStatementValue

Located in: `apps/server/src/api/routes/financial-reports/financial-reports.handlers.ts`

```typescript
function formatStatementValue(
  value: number,
  options: {
    showZeroValues?: boolean;
    negativeFormat?: 'parentheses' | 'minus';
    isWorkingCapitalLine?: boolean;
  }
): {
  numericValue: number;
  displayValue: string;
  isNegative: boolean;
  isZero: boolean;
}
```

### prepareStatementForExport

Located in: `apps/server/src/api/routes/financial-reports/financial-reports.handlers.ts`

```typescript
function prepareStatementForExport(statement: any): {
  headers: string[];
  rows: any[][];
  metadata: any;
}
```

## Future Enhancements

1. **Configurable Formatting:** Allow users to choose between parentheses and minus sign format
2. **Currency Symbols:** Add support for currency symbols in display
3. **Thousand Separators:** Add comma separators for large numbers
4. **Color Coding:** Use red for negative values in PDF/Excel
5. **Conditional Formatting:** Apply Excel conditional formatting rules for working capital lines

## References

- Design Document: `.kiro/specs/cash-flow-working-capital-changes/design.md`
- Requirements: `.kiro/specs/cash-flow-working-capital-changes/requirements.md`
- Template Definition: `apps/server/src/db/seeds/data/statement-templates.ts`
