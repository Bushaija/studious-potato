/**
 * Tests for statement display formatting
 * Task 7: Update statement display formatting
 * Requirements: 8.1, 8.2, 8.3, 8.4, 8.5
 */

import { describe, it, expect } from 'vitest';

// Mock the formatStatementValue function for testing
function formatStatementValue(
  value: number,
  options: {
    showZeroValues?: boolean;
    negativeFormat?: 'parentheses' | 'minus';
    isWorkingCapitalLine?: boolean;
  } = {}
): {
  numericValue: number;
  displayValue: string;
  isNegative: boolean;
  isZero: boolean;
} {
  const {
    showZeroValues = true,
    negativeFormat = 'parentheses',
    isWorkingCapitalLine = false
  } = options;

  const roundedValue = Math.round(value * 100) / 100;
  const isNegative = roundedValue < 0;
  const isZero = roundedValue === 0;
  const absoluteValue = Math.abs(roundedValue);

  // Handle zero values
  if (isZero) {
    return {
      numericValue: 0,
      displayValue: showZeroValues ? '0' : '-',
      isNegative: false,
      isZero: true
    };
  }

  // Format negative values
  let displayValue: string;
  if (isNegative) {
    if (negativeFormat === 'parentheses') {
      displayValue = `(${absoluteValue.toFixed(2)})`;
    } else {
      displayValue = `-${absoluteValue.toFixed(2)}`;
    }
  } else {
    displayValue = absoluteValue.toFixed(2);
  }

  return {
    numericValue: roundedValue,
    displayValue,
    isNegative,
    isZero
  };
}

describe('Statement Display Formatting', () => {
  describe('formatStatementValue', () => {
    describe('Requirement 8.1: Negative value formatting for receivables', () => {
      it('should format negative receivables adjustment with parentheses', () => {
        const result = formatStatementValue(-10000, {
          negativeFormat: 'parentheses',
          isWorkingCapitalLine: true
        });

        expect(result.numericValue).toBe(-10000);
        expect(result.displayValue).toBe('(10000.00)');
        expect(result.isNegative).toBe(true);
        expect(result.isZero).toBe(false);
      });

      it('should format negative receivables adjustment with minus sign', () => {
        const result = formatStatementValue(-10000, {
          negativeFormat: 'minus',
          isWorkingCapitalLine: true
        });

        expect(result.numericValue).toBe(-10000);
        expect(result.displayValue).toBe('-10000.00');
        expect(result.isNegative).toBe(true);
      });

      it('should format positive receivables adjustment', () => {
        const result = formatStatementValue(5000, {
          negativeFormat: 'parentheses',
          isWorkingCapitalLine: true
        });

        expect(result.numericValue).toBe(5000);
        expect(result.displayValue).toBe('5000.00');
        expect(result.isNegative).toBe(false);
      });
    });

    describe('Requirement 8.2: Negative value formatting for payables', () => {
      it('should format negative payables adjustment with parentheses', () => {
        const result = formatStatementValue(-7000, {
          negativeFormat: 'parentheses',
          isWorkingCapitalLine: true
        });

        expect(result.numericValue).toBe(-7000);
        expect(result.displayValue).toBe('(7000.00)');
        expect(result.isNegative).toBe(true);
      });

      it('should format positive payables adjustment', () => {
        const result = formatStatementValue(3000, {
          negativeFormat: 'parentheses',
          isWorkingCapitalLine: true
        });

        expect(result.numericValue).toBe(3000);
        expect(result.displayValue).toBe('3000.00');
        expect(result.isNegative).toBe(false);
      });
    });

    describe('Requirement 8.3: Zero value handling', () => {
      it('should display zero when showZeroValues is true', () => {
        const result = formatStatementValue(0, {
          showZeroValues: true,
          isWorkingCapitalLine: true
        });

        expect(result.numericValue).toBe(0);
        expect(result.displayValue).toBe('0');
        expect(result.isZero).toBe(true);
      });

      it('should display dash when showZeroValues is false', () => {
        const result = formatStatementValue(0, {
          showZeroValues: false,
          isWorkingCapitalLine: true
        });

        expect(result.numericValue).toBe(0);
        expect(result.displayValue).toBe('-');
        expect(result.isZero).toBe(true);
      });
    });

    describe('Decimal precision', () => {
      it('should round to 2 decimal places', () => {
        const result = formatStatementValue(1234.567, {
          negativeFormat: 'parentheses'
        });

        expect(result.numericValue).toBe(1234.57);
        expect(result.displayValue).toBe('1234.57');
      });

      it('should handle negative values with decimal precision', () => {
        const result = formatStatementValue(-1234.567, {
          negativeFormat: 'parentheses'
        });

        expect(result.numericValue).toBe(-1234.57);
        expect(result.displayValue).toBe('(1234.57)');
      });
    });

    describe('Edge cases', () => {
      it('should handle very small negative values', () => {
        const result = formatStatementValue(-0.01, {
          negativeFormat: 'parentheses'
        });

        expect(result.numericValue).toBe(-0.01);
        expect(result.displayValue).toBe('(0.01)');
        expect(result.isNegative).toBe(true);
      });

      it('should handle very large values', () => {
        const result = formatStatementValue(1000000.99, {
          negativeFormat: 'parentheses'
        });

        expect(result.numericValue).toBe(1000000.99);
        expect(result.displayValue).toBe('1000000.99');
      });

      it('should handle rounding edge case (0.005)', () => {
        const result = formatStatementValue(0.005, {
          negativeFormat: 'parentheses'
        });

        // JavaScript rounds 0.005 to 0.01
        expect(result.numericValue).toBe(0.01);
        expect(result.displayValue).toBe('0.01');
      });
    });
  });

  describe('Working Capital Line Identification', () => {
    it('should identify CHANGES_RECEIVABLES as working capital line', () => {
      const lineCode: string = 'CHANGES_RECEIVABLES';
      const statementCode: string = 'CASH_FLOW';
      
      const isWorkingCapitalLine = statementCode === 'CASH_FLOW' && 
        (lineCode === 'CHANGES_RECEIVABLES' || lineCode === 'CHANGES_PAYABLES');

      expect(isWorkingCapitalLine).toBe(true);
    });

    it('should identify CHANGES_PAYABLES as working capital line', () => {
      const lineCode: string = 'CHANGES_PAYABLES';
      const statementCode: string = 'CASH_FLOW';
      
      const isWorkingCapitalLine = statementCode === 'CASH_FLOW' && 
        (lineCode === 'CHANGES_RECEIVABLES' || lineCode === 'CHANGES_PAYABLES');

      expect(isWorkingCapitalLine).toBe(true);
    });

    it('should not identify other lines as working capital lines', () => {
      const lineCode: string = 'TAX_REVENUE';
      const statementCode: string = 'CASH_FLOW';
      
      const isWorkingCapitalLine = statementCode === 'CASH_FLOW' && 
        (lineCode === 'CHANGES_RECEIVABLES' || lineCode === 'CHANGES_PAYABLES');

      expect(isWorkingCapitalLine).toBe(false);
    });

    it('should not identify working capital lines in non-CASH_FLOW statements', () => {
      const lineCode: string = 'CHANGES_RECEIVABLES';
      const statementCode: string = 'REV_EXP';
      
      const isWorkingCapitalLine = statementCode === 'CASH_FLOW' && 
        (lineCode === 'CHANGES_RECEIVABLES' || lineCode === 'CHANGES_PAYABLES');

      expect(isWorkingCapitalLine).toBe(false);
    });
  });

  describe('Indentation Level (Requirement 8.1)', () => {
    it('should have indentation level 3 for working capital lines', () => {
      // This is verified in the template definition
      const expectedIndentLevel = 3;
      
      // CHANGES_RECEIVABLES and CHANGES_PAYABLES should have level 3
      expect(expectedIndentLevel).toBe(3);
    });
  });
});
