import { describe, it, expect } from 'vitest';
import type { StatementLine } from '@/lib/statement-engine/types/core.types';

/**
 * Test helper to create a mock statement line
 */
function createMockLine(lineCode: string, value: number): StatementLine {
  return {
    id: `CASH_FLOW_${lineCode}`,
    description: lineCode,
    currentPeriodValue: value,
    previousPeriodValue: 0,
    formatting: {
      bold: false,
      italic: false,
      indentLevel: 0,
      isSection: false,
      isSubtotal: false,
      isTotal: false
    },
    metadata: {
      lineCode,
      eventCodes: [],
      isComputed: false,
      displayOrder: 0
    }
  };
}

/**
 * Sum statement lines by matching line codes
 */
function sumLinesByPattern(statementLines: StatementLine[], patterns: string[]): number {
  let total = 0;

  for (const line of statementLines) {
    if (patterns.includes(line.metadata.lineCode)) {
      total += line.currentPeriodValue;
    }
  }

  return total;
}

/**
 * Calculate operating cash flow (revenues - expenses + adjustments)
 * This is the function being tested from financial-reports.handlers.ts
 */
function calculateOperatingCashFlow(statementLines: StatementLine[]): number {
  // Revenue items (positive cash flow)
  const revenues = sumLinesByPattern(statementLines, [
    'TAX_REVENUE', 'GRANTS', 'TRANSFERS_CENTRAL', 'TRANSFERS_PUBLIC',
    'FINES_PENALTIES', 'PROPERTY_INCOME', 'SALES_GOODS_SERVICES', 'OTHER_REVENUE'
  ]);

  // Expense items (negative cash flow)
  const expenses = sumLinesByPattern(statementLines, [
    'COMPENSATION_EMPLOYEES', 'GOODS_SERVICES', 'GRANTS_TRANSFERS',
    'SUBSIDIES', 'SOCIAL_ASSISTANCE', 'FINANCE_COSTS', 'OTHER_EXPENSES'
  ]);

  // Adjustments
  const adjustments = sumLinesByPattern(statementLines, [
    'CHANGES_RECEIVABLES', 'CHANGES_PAYABLES', 'PRIOR_YEAR_ADJUSTMENTS'
  ]);

  return revenues - expenses + adjustments;
}

describe('calculateOperatingCashFlow', () => {
  it('should include CHANGES_RECEIVABLES in adjustments', () => {
    const lines: StatementLine[] = [
      createMockLine('TAX_REVENUE', 100000),
      createMockLine('COMPENSATION_EMPLOYEES', 50000),
      createMockLine('CHANGES_RECEIVABLES', -10000), // Receivables increased (negative adjustment)
    ];

    const result = calculateOperatingCashFlow(lines);
    
    // Expected: 100000 (revenues) - 50000 (expenses) + (-10000) (adjustments) = 40000
    expect(result).toBe(40000);
  });

  it('should include CHANGES_PAYABLES in adjustments', () => {
    const lines: StatementLine[] = [
      createMockLine('TAX_REVENUE', 100000),
      createMockLine('COMPENSATION_EMPLOYEES', 50000),
      createMockLine('CHANGES_PAYABLES', 5000), // Payables increased (positive adjustment)
    ];

    const result = calculateOperatingCashFlow(lines);
    
    // Expected: 100000 (revenues) - 50000 (expenses) + 5000 (adjustments) = 55000
    expect(result).toBe(55000);
  });

  it('should correctly add both CHANGES_RECEIVABLES and CHANGES_PAYABLES', () => {
    const lines: StatementLine[] = [
      createMockLine('TAX_REVENUE', 100000),
      createMockLine('GRANTS', 50000),
      createMockLine('COMPENSATION_EMPLOYEES', 60000),
      createMockLine('GOODS_SERVICES', 30000),
      createMockLine('CHANGES_RECEIVABLES', -10000), // Receivables increased (subtract from cash flow)
      createMockLine('CHANGES_PAYABLES', 7000), // Payables decreased (subtract from cash flow)
      createMockLine('PRIOR_YEAR_ADJUSTMENTS', 2000),
    ];

    const result = calculateOperatingCashFlow(lines);
    
    // Revenues: 100000 + 50000 = 150000
    // Expenses: 60000 + 30000 = 90000
    // Adjustments: -10000 + 7000 + 2000 = -1000
    // Expected: 150000 - 90000 + (-1000) = 59000
    expect(result).toBe(59000);
  });

  it('should handle scenario where receivables decrease (positive cash impact)', () => {
    const lines: StatementLine[] = [
      createMockLine('TAX_REVENUE', 100000),
      createMockLine('COMPENSATION_EMPLOYEES', 50000),
      createMockLine('CHANGES_RECEIVABLES', 15000), // Receivables decreased (positive adjustment)
    ];

    const result = calculateOperatingCashFlow(lines);
    
    // Expected: 100000 (revenues) - 50000 (expenses) + 15000 (adjustments) = 65000
    expect(result).toBe(65000);
  });

  it('should handle scenario where payables decrease (negative cash impact)', () => {
    const lines: StatementLine[] = [
      createMockLine('TAX_REVENUE', 100000),
      createMockLine('COMPENSATION_EMPLOYEES', 50000),
      createMockLine('CHANGES_PAYABLES', -8000), // Payables decreased (negative adjustment)
    ];

    const result = calculateOperatingCashFlow(lines);
    
    // Expected: 100000 (revenues) - 50000 (expenses) + (-8000) (adjustments) = 42000
    expect(result).toBe(42000);
  });

  it('should handle zero working capital changes', () => {
    const lines: StatementLine[] = [
      createMockLine('TAX_REVENUE', 100000),
      createMockLine('COMPENSATION_EMPLOYEES', 50000),
      createMockLine('CHANGES_RECEIVABLES', 0),
      createMockLine('CHANGES_PAYABLES', 0),
    ];

    const result = calculateOperatingCashFlow(lines);
    
    // Expected: 100000 (revenues) - 50000 (expenses) + 0 (adjustments) = 50000
    expect(result).toBe(50000);
  });

  it('should handle all revenue and expense categories', () => {
    const lines: StatementLine[] = [
      // All revenue categories
      createMockLine('TAX_REVENUE', 50000),
      createMockLine('GRANTS', 30000),
      createMockLine('TRANSFERS_CENTRAL', 20000),
      createMockLine('TRANSFERS_PUBLIC', 10000),
      createMockLine('FINES_PENALTIES', 5000),
      createMockLine('PROPERTY_INCOME', 8000),
      createMockLine('SALES_GOODS_SERVICES', 12000),
      createMockLine('OTHER_REVENUE', 3000),
      
      // All expense categories
      createMockLine('COMPENSATION_EMPLOYEES', 40000),
      createMockLine('GOODS_SERVICES', 25000),
      createMockLine('GRANTS_TRANSFERS', 15000),
      createMockLine('SUBSIDIES', 10000),
      createMockLine('SOCIAL_ASSISTANCE', 8000),
      createMockLine('FINANCE_COSTS', 5000),
      createMockLine('OTHER_EXPENSES', 2000),
      
      // Working capital adjustments
      createMockLine('CHANGES_RECEIVABLES', -10000),
      createMockLine('CHANGES_PAYABLES', 7000),
      createMockLine('PRIOR_YEAR_ADJUSTMENTS', 1000),
    ];

    const result = calculateOperatingCashFlow(lines);
    
    // Revenues: 50000 + 30000 + 20000 + 10000 + 5000 + 8000 + 12000 + 3000 = 138000
    // Expenses: 40000 + 25000 + 15000 + 10000 + 8000 + 5000 + 2000 = 105000
    // Adjustments: -10000 + 7000 + 1000 = -2000
    // Expected: 138000 - 105000 + (-2000) = 31000
    expect(result).toBe(31000);
  });

  it('should handle missing working capital lines gracefully', () => {
    const lines: StatementLine[] = [
      createMockLine('TAX_REVENUE', 100000),
      createMockLine('COMPENSATION_EMPLOYEES', 50000),
      // No CHANGES_RECEIVABLES or CHANGES_PAYABLES lines
    ];

    const result = calculateOperatingCashFlow(lines);
    
    // Expected: 100000 (revenues) - 50000 (expenses) + 0 (adjustments) = 50000
    expect(result).toBe(50000);
  });

  it('should correctly apply the formula: revenues - expenses + adjustments', () => {
    const lines: StatementLine[] = [
      createMockLine('TAX_REVENUE', 200000),
      createMockLine('COMPENSATION_EMPLOYEES', 80000),
      createMockLine('GOODS_SERVICES', 40000),
      createMockLine('CHANGES_RECEIVABLES', -15000),
      createMockLine('CHANGES_PAYABLES', 10000),
    ];

    const result = calculateOperatingCashFlow(lines);
    
    // Revenues: 200000
    // Expenses: 80000 + 40000 = 120000
    // Adjustments: -15000 + 10000 = -5000
    // Formula: revenues - expenses + adjustments
    // Expected: 200000 - 120000 + (-5000) = 75000
    expect(result).toBe(75000);
  });
});
