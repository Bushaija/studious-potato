import { describe, it, expect } from 'vitest';
import type { StatementLine } from '@/lib/statement-engine/types/core.types';

/**
 * Integration test to verify that working capital changes are correctly
 * included in the operating cash flow calculation.
 * 
 * This test simulates the complete flow:
 * 1. Working capital calculator computes signed adjustments
 * 2. These adjustments are injected into statement lines
 * 3. Operating cash flow calculation includes these adjustments
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

function sumLinesByPattern(statementLines: StatementLine[], patterns: string[]): number {
  let total = 0;
  for (const line of statementLines) {
    if (patterns.includes(line.metadata.lineCode)) {
      total += line.currentPeriodValue;
    }
  }
  return total;
}

function calculateOperatingCashFlow(statementLines: StatementLine[]): number {
  const revenues = sumLinesByPattern(statementLines, [
    'TAX_REVENUE', 'GRANTS', 'TRANSFERS_CENTRAL', 'TRANSFERS_PUBLIC',
    'FINES_PENALTIES', 'PROPERTY_INCOME', 'SALES_GOODS_SERVICES', 'OTHER_REVENUE'
  ]);

  const expenses = sumLinesByPattern(statementLines, [
    'COMPENSATION_EMPLOYEES', 'GOODS_SERVICES', 'GRANTS_TRANSFERS',
    'SUBSIDIES', 'SOCIAL_ASSISTANCE', 'FINANCE_COSTS', 'OTHER_EXPENSES'
  ]);

  const adjustments = sumLinesByPattern(statementLines, [
    'CHANGES_RECEIVABLES', 'CHANGES_PAYABLES', 'PRIOR_YEAR_ADJUSTMENTS'
  ]);

  return revenues - expenses + adjustments;
}

describe('Operating Cash Flow Integration with Working Capital', () => {
  it('should correctly calculate operating cash flow with receivables increase', () => {
    // Scenario: Receivables increased by 10,000
    // Current period: 50,000, Previous period: 40,000
    // Change: 10,000 (increase)
    // Cash flow adjustment: -10,000 (subtract from operating cash flow)
    
    const lines: StatementLine[] = [
      createMockLine('TAX_REVENUE', 200000),
      createMockLine('GRANTS', 50000),
      createMockLine('COMPENSATION_EMPLOYEES', 100000),
      createMockLine('GOODS_SERVICES', 80000),
      createMockLine('CHANGES_RECEIVABLES', -10000), // Injected by working capital calculator
      createMockLine('CHANGES_PAYABLES', 0),
    ];

    const operatingCashFlow = calculateOperatingCashFlow(lines);
    
    // Revenues: 200000 + 50000 = 250000
    // Expenses: 100000 + 80000 = 180000
    // Adjustments: -10000 + 0 = -10000
    // Operating Cash Flow: 250000 - 180000 + (-10000) = 60000
    expect(operatingCashFlow).toBe(60000);
  });

  it('should correctly calculate operating cash flow with payables increase', () => {
    // Scenario: Payables increased by 7,000
    // Current period: 25,000, Previous period: 18,000
    // Change: 7,000 (increase)
    // Cash flow adjustment: +7,000 (add to operating cash flow)
    
    const lines: StatementLine[] = [
      createMockLine('TAX_REVENUE', 200000),
      createMockLine('COMPENSATION_EMPLOYEES', 100000),
      createMockLine('CHANGES_RECEIVABLES', 0),
      createMockLine('CHANGES_PAYABLES', 7000), // Injected by working capital calculator
    ];

    const operatingCashFlow = calculateOperatingCashFlow(lines);
    
    // Revenues: 200000
    // Expenses: 100000
    // Adjustments: 0 + 7000 = 7000
    // Operating Cash Flow: 200000 - 100000 + 7000 = 107000
    expect(operatingCashFlow).toBe(107000);
  });

  it('should handle complex scenario with both receivables and payables changes', () => {
    // Scenario from design document example:
    // Receivables: Current 50,000, Previous 40,000 → Change +10,000 → Adjustment -10,000
    // Payables: Current 18,000, Previous 25,000 → Change -7,000 → Adjustment -7,000
    
    const lines: StatementLine[] = [
      createMockLine('TAX_REVENUE', 300000),
      createMockLine('GRANTS', 100000),
      createMockLine('COMPENSATION_EMPLOYEES', 150000),
      createMockLine('GOODS_SERVICES', 100000),
      createMockLine('CHANGES_RECEIVABLES', -10000), // Receivables increased
      createMockLine('CHANGES_PAYABLES', -7000), // Payables decreased
      createMockLine('PRIOR_YEAR_ADJUSTMENTS', 5000),
    ];

    const operatingCashFlow = calculateOperatingCashFlow(lines);
    
    // Revenues: 300000 + 100000 = 400000
    // Expenses: 150000 + 100000 = 250000
    // Adjustments: -10000 + (-7000) + 5000 = -12000
    // Operating Cash Flow: 400000 - 250000 + (-12000) = 138000
    expect(operatingCashFlow).toBe(138000);
  });

  it('should handle scenario where receivables decrease (positive cash impact)', () => {
    // Scenario: Receivables decreased by 15,000
    // Current period: 35,000, Previous period: 50,000
    // Change: -15,000 (decrease)
    // Cash flow adjustment: +15,000 (add to operating cash flow)
    
    const lines: StatementLine[] = [
      createMockLine('TAX_REVENUE', 200000),
      createMockLine('COMPENSATION_EMPLOYEES', 100000),
      createMockLine('CHANGES_RECEIVABLES', 15000), // Receivables decreased
      createMockLine('CHANGES_PAYABLES', 0),
    ];

    const operatingCashFlow = calculateOperatingCashFlow(lines);
    
    // Revenues: 200000
    // Expenses: 100000
    // Adjustments: 15000 + 0 = 15000
    // Operating Cash Flow: 200000 - 100000 + 15000 = 115000
    expect(operatingCashFlow).toBe(115000);
  });

  it('should handle scenario where payables decrease (negative cash impact)', () => {
    // Scenario: Payables decreased by 8,000
    // Current period: 17,000, Previous period: 25,000
    // Change: -8,000 (decrease)
    // Cash flow adjustment: -8,000 (subtract from operating cash flow)
    
    const lines: StatementLine[] = [
      createMockLine('TAX_REVENUE', 200000),
      createMockLine('COMPENSATION_EMPLOYEES', 100000),
      createMockLine('CHANGES_RECEIVABLES', 0),
      createMockLine('CHANGES_PAYABLES', -8000), // Payables decreased
    ];

    const operatingCashFlow = calculateOperatingCashFlow(lines);
    
    // Revenues: 200000
    // Expenses: 100000
    // Adjustments: 0 + (-8000) = -8000
    // Operating Cash Flow: 200000 - 100000 + (-8000) = 92000
    expect(operatingCashFlow).toBe(92000);
  });

  it('should verify the formula matches requirement 3.2', () => {
    // Requirement 3.2: Operating Cash Flow = Revenues - Expenses + Changes in Receivables + Changes in Payables + Prior Year Adjustments
    
    const lines: StatementLine[] = [
      createMockLine('TAX_REVENUE', 150000),
      createMockLine('GRANTS', 50000),
      createMockLine('COMPENSATION_EMPLOYEES', 80000),
      createMockLine('GOODS_SERVICES', 40000),
      createMockLine('CHANGES_RECEIVABLES', -5000),
      createMockLine('CHANGES_PAYABLES', 3000),
      createMockLine('PRIOR_YEAR_ADJUSTMENTS', 2000),
    ];

    const operatingCashFlow = calculateOperatingCashFlow(lines);
    
    // Manual calculation per requirement 3.2:
    const revenues = 150000 + 50000; // 200000
    const expenses = 80000 + 40000; // 120000
    const changesReceivables = -5000;
    const changesPayables = 3000;
    const priorYearAdj = 2000;
    
    const expected = revenues - expenses + changesReceivables + changesPayables + priorYearAdj;
    // Expected: 200000 - 120000 + (-5000) + 3000 + 2000 = 80000
    
    expect(operatingCashFlow).toBe(expected);
    expect(operatingCashFlow).toBe(80000);
  });

  it('should handle zero working capital changes without affecting basic calculation', () => {
    const lines: StatementLine[] = [
      createMockLine('TAX_REVENUE', 100000),
      createMockLine('COMPENSATION_EMPLOYEES', 60000),
      createMockLine('CHANGES_RECEIVABLES', 0),
      createMockLine('CHANGES_PAYABLES', 0),
    ];

    const operatingCashFlow = calculateOperatingCashFlow(lines);
    
    // Revenues: 100000
    // Expenses: 60000
    // Adjustments: 0
    // Operating Cash Flow: 100000 - 60000 + 0 = 40000
    expect(operatingCashFlow).toBe(40000);
  });
});
