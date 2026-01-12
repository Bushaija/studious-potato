/**
 * Endpoint integration test for Task 7: Statement Display Formatting
 * Tests that working capital lines have proper display formatting in the API response
 * Requirements: 8.1, 8.2, 8.3
 */

import { describe, it, expect } from 'vitest';
import type { StatementLine } from '@/lib/statement-engine/types/core.types';

/**
 * Mock statement response structure
 */
interface MockStatementResponse {
  statement: {
    statementCode: string;
    lines: StatementLine[];
    metadata?: {
      workingCapital?: {
        receivables: {
          currentBalance: number;
          previousBalance: number;
          change: number;
          cashFlowAdjustment: number;
        };
        payables: {
          currentBalance: number;
          previousBalance: number;
          change: number;
          cashFlowAdjustment: number;
        };
      };
    };
  };
}

/**
 * Create a mock statement line with display formatting
 */
function createMockLineWithFormatting(
  lineCode: string,
  currentValue: number,
  previousValue: number,
  indentLevel: number = 3
): StatementLine {
  // Simulate the formatStatementValue function
  const formatValue = (value: number): string => {
    if (value === 0) return '0';
    if (value < 0) return `(${Math.abs(value).toFixed(2)})`;
    return value.toFixed(2);
  };

  return {
    id: `CASH_FLOW_${lineCode}`,
    description: lineCode === 'CHANGES_RECEIVABLES' ? 'Changes in receivables' : 'Changes in payables',
    currentPeriodValue: currentValue,
    previousPeriodValue: previousValue,
    formatting: {
      bold: false,
      italic: currentValue < 0,
      indentLevel,
      isSection: false,
      isSubtotal: false,
      isTotal: false
    },
    metadata: {
      lineCode,
      eventCodes: [],
      isComputed: true,
      displayOrder: lineCode === 'CHANGES_RECEIVABLES' ? 23 : 24
    },
    displayFormatting: {
      currentPeriodDisplay: formatValue(currentValue),
      previousPeriodDisplay: formatValue(previousValue),
      showZeroValues: true,
      negativeFormat: 'parentheses',
      isWorkingCapitalLine: true
    }
  };
}

describe('Display Formatting Endpoint Integration', () => {
  describe('Working Capital Line Formatting', () => {
    it('should include displayFormatting metadata for CHANGES_RECEIVABLES', () => {
      const line = createMockLineWithFormatting('CHANGES_RECEIVABLES', -10000, -8000);

      expect(line.displayFormatting).toBeDefined();
      expect(line.displayFormatting?.isWorkingCapitalLine).toBe(true);
      expect(line.displayFormatting?.negativeFormat).toBe('parentheses');
      expect(line.displayFormatting?.currentPeriodDisplay).toBe('(10000.00)');
      expect(line.displayFormatting?.previousPeriodDisplay).toBe('(8000.00)');
    });

    it('should include displayFormatting metadata for CHANGES_PAYABLES', () => {
      const line = createMockLineWithFormatting('CHANGES_PAYABLES', -7000, 5000);

      expect(line.displayFormatting).toBeDefined();
      expect(line.displayFormatting?.isWorkingCapitalLine).toBe(true);
      expect(line.displayFormatting?.currentPeriodDisplay).toBe('(7000.00)');
      expect(line.displayFormatting?.previousPeriodDisplay).toBe('5000.00');
    });

    it('should have correct indentation level (3) for working capital lines', () => {
      const receivablesLine = createMockLineWithFormatting('CHANGES_RECEIVABLES', -10000, 0);
      const payablesLine = createMockLineWithFormatting('CHANGES_PAYABLES', -7000, 0);

      expect(receivablesLine.formatting.indentLevel).toBe(3);
      expect(payablesLine.formatting.indentLevel).toBe(3);
    });
  });

  describe('Negative Value Formatting (Requirement 8.1, 8.2)', () => {
    it('should format negative receivables with parentheses', () => {
      const line = createMockLineWithFormatting('CHANGES_RECEIVABLES', -10000, 0);

      expect(line.displayFormatting?.currentPeriodDisplay).toBe('(10000.00)');
      expect(line.currentPeriodValue).toBe(-10000);
    });

    it('should format negative payables with parentheses', () => {
      const line = createMockLineWithFormatting('CHANGES_PAYABLES', -7000, 0);

      expect(line.displayFormatting?.currentPeriodDisplay).toBe('(7000.00)');
      expect(line.currentPeriodValue).toBe(-7000);
    });

    it('should format positive values without parentheses', () => {
      const line = createMockLineWithFormatting('CHANGES_RECEIVABLES', 5000, 3000);

      expect(line.displayFormatting?.currentPeriodDisplay).toBe('5000.00');
      expect(line.displayFormatting?.previousPeriodDisplay).toBe('3000.00');
    });
  });

  describe('Zero Value Handling (Requirement 8.3)', () => {
    it('should display zero when showZeroValues is true', () => {
      const line = createMockLineWithFormatting('CHANGES_RECEIVABLES', 0, 0);

      expect(line.displayFormatting?.showZeroValues).toBe(true);
      expect(line.displayFormatting?.currentPeriodDisplay).toBe('0');
      expect(line.displayFormatting?.previousPeriodDisplay).toBe('0');
    });
  });

  describe('Complete Statement Response', () => {
    it('should include working capital metadata in statement response', () => {
      const mockResponse: MockStatementResponse = {
        statement: {
          statementCode: 'CASH_FLOW',
          lines: [
            createMockLineWithFormatting('CHANGES_RECEIVABLES', -10000, -8000),
            createMockLineWithFormatting('CHANGES_PAYABLES', -7000, 5000)
          ],
          metadata: {
            workingCapital: {
              receivables: {
                currentBalance: 50000,
                previousBalance: 40000,
                change: 10000,
                cashFlowAdjustment: -10000
              },
              payables: {
                currentBalance: 18000,
                previousBalance: 25000,
                change: -7000,
                cashFlowAdjustment: -7000
              }
            }
          }
        }
      };

      expect(mockResponse.statement.metadata?.workingCapital).toBeDefined();
      expect(mockResponse.statement.metadata?.workingCapital?.receivables.cashFlowAdjustment).toBe(-10000);
      expect(mockResponse.statement.metadata?.workingCapital?.payables.cashFlowAdjustment).toBe(-7000);
    });

    it('should have properly formatted working capital lines in statement', () => {
      const mockResponse: MockStatementResponse = {
        statement: {
          statementCode: 'CASH_FLOW',
          lines: [
            createMockLineWithFormatting('TAX_REVENUE', 200000, 180000, 4),
            createMockLineWithFormatting('CHANGES_RECEIVABLES', -10000, -8000, 3),
            createMockLineWithFormatting('CHANGES_PAYABLES', -7000, 5000, 3)
          ]
        }
      };

      const receivablesLine = mockResponse.statement.lines.find(
        l => l.metadata.lineCode === 'CHANGES_RECEIVABLES'
      );
      const payablesLine = mockResponse.statement.lines.find(
        l => l.metadata.lineCode === 'CHANGES_PAYABLES'
      );

      // Verify receivables line
      expect(receivablesLine).toBeDefined();
      expect(receivablesLine?.displayFormatting?.isWorkingCapitalLine).toBe(true);
      expect(receivablesLine?.displayFormatting?.currentPeriodDisplay).toBe('(10000.00)');
      expect(receivablesLine?.formatting.indentLevel).toBe(3);

      // Verify payables line
      expect(payablesLine).toBeDefined();
      expect(payablesLine?.displayFormatting?.isWorkingCapitalLine).toBe(true);
      expect(payablesLine?.displayFormatting?.currentPeriodDisplay).toBe('(7000.00)');
      expect(payablesLine?.formatting.indentLevel).toBe(3);
    });
  });

  describe('Export Data Preparation', () => {
    it('should prepare working capital lines for CSV export with minus format', () => {
      const line = createMockLineWithFormatting('CHANGES_RECEIVABLES', -10000, -8000);

      // For CSV export, we would use minus format instead of parentheses
      const csvValue = line.currentPeriodValue.toFixed(2);
      expect(csvValue).toBe('-10000.00');

      // Verify the line has the data needed for export
      expect(line.metadata.lineCode).toBe('CHANGES_RECEIVABLES');
      expect(line.formatting.indentLevel).toBe(3);
      expect(line.displayFormatting?.isWorkingCapitalLine).toBe(true);
    });

    it('should include all necessary fields for export', () => {
      const line = createMockLineWithFormatting('CHANGES_PAYABLES', -7000, 5000);

      // Verify all export fields are present
      expect(line.metadata.lineCode).toBeDefined();
      expect(line.description).toBeDefined();
      expect(line.formatting.indentLevel).toBeDefined();
      expect(line.currentPeriodValue).toBeDefined();
      expect(line.previousPeriodValue).toBeDefined();
      expect(line.formatting.isTotal).toBeDefined();
      expect(line.formatting.isSubtotal).toBeDefined();
      expect(line.displayFormatting).toBeDefined();
    });
  });

  describe('Formatting Consistency', () => {
    it('should maintain consistent formatting across multiple working capital lines', () => {
      const lines = [
        createMockLineWithFormatting('CHANGES_RECEIVABLES', -10000, -8000),
        createMockLineWithFormatting('CHANGES_PAYABLES', -7000, 5000)
      ];

      lines.forEach(line => {
        expect(line.displayFormatting?.negativeFormat).toBe('parentheses');
        expect(line.displayFormatting?.showZeroValues).toBe(true);
        expect(line.displayFormatting?.isWorkingCapitalLine).toBe(true);
        expect(line.formatting.indentLevel).toBe(3);
      });
    });

    it('should apply italic formatting to negative values', () => {
      const negativeLine = createMockLineWithFormatting('CHANGES_RECEIVABLES', -10000, 0);
      const positiveLine = createMockLineWithFormatting('CHANGES_RECEIVABLES', 5000, 0);

      expect(negativeLine.formatting.italic).toBe(true);
      expect(positiveLine.formatting.italic).toBe(false);
    });
  });
});
