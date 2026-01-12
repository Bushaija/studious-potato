/**
 * Working Capital Validation Rules Tests
 * 
 * Tests the validation rules for working capital changes in cash flow statements
 * Requirements: 7.1, 7.2, 7.3, 7.4
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { StatementValidationEngine } from './validation-engine';
import { FinancialStatement } from '../types/engine.types';

// Helper function to create a test statement with working capital metadata
function createTestStatement(workingCapitalData?: any): FinancialStatement {
  return {
    statementCode: 'CASH_FLOW',
    lines: [],
    totals: {},
    metadata: {
      templateId: 1,
      processingStartTime: new Date(),
      processingEndTime: new Date(),
      formulasEvaluated: 0,
      dependenciesResolved: 0,
      ...(workingCapitalData && { workingCapital: workingCapitalData })
    } as any
  };
}

describe('Working Capital Validation Rules', () => {
  let validationEngine: StatementValidationEngine;

  beforeEach(() => {
    validationEngine = new StatementValidationEngine();
  });

  describe('WC_NEGATIVE_RECEIVABLES - Negative Receivables Balance (Requirement 7.1)', () => {
    it('should pass validation when receivables balance is positive', () => {
      const statement = createTestStatement({
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
        },
        warnings: []
      });

      const results = validationEngine.validateBusinessRules(statement);
      const negativeReceivablesRule = results.find(r => r.ruleId === 'WC_NEGATIVE_RECEIVABLES');

      expect(negativeReceivablesRule).toBeDefined();
      expect(negativeReceivablesRule?.isValid).toBe(true);
    });

    it('should fail validation when receivables balance is negative', () => {
      const statement = createTestStatement({
        receivables: {
          currentBalance: -5000, // Negative balance
          previousBalance: 40000,
          change: -45000,
          cashFlowAdjustment: 45000
        },
        payables: {
          currentBalance: 18000,
          previousBalance: 25000,
          change: -7000,
          cashFlowAdjustment: -7000
        },
        warnings: []
      });

      const results = validationEngine.validateBusinessRules(statement);
      const negativeReceivablesRule = results.find(r => r.ruleId === 'WC_NEGATIVE_RECEIVABLES');

      expect(negativeReceivablesRule).toBeDefined();
      expect(negativeReceivablesRule?.isValid).toBe(false);
      expect(negativeReceivablesRule?.message).toContain('Negative receivables balance');
    });

    it('should pass validation when no working capital data exists', () => {
      const statement = createTestStatement();

      const results = validationEngine.validateBusinessRules(statement);
      const negativeReceivablesRule = results.find(r => r.ruleId === 'WC_NEGATIVE_RECEIVABLES');

      expect(negativeReceivablesRule).toBeDefined();
      expect(negativeReceivablesRule?.isValid).toBe(true);
    });
  });

  describe('WC_EXTREME_RECEIVABLES_VARIANCE - Extreme Variance >100% (Requirement 7.2)', () => {
    it('should pass validation when variance is within 100%', () => {
      const statement = createTestStatement({
        receivables: {
          currentBalance: 60000,
          previousBalance: 40000,
          change: 20000, // 50% increase
          cashFlowAdjustment: -20000
        },
        payables: {
          currentBalance: 18000,
          previousBalance: 25000,
          change: -7000,
          cashFlowAdjustment: -7000
        },
        warnings: []
      });

      const results = validationEngine.validateBusinessRules(statement);
      const varianceRule = results.find(r => r.ruleId === 'WC_EXTREME_RECEIVABLES_VARIANCE');

      expect(varianceRule).toBeDefined();
      expect(varianceRule?.isValid).toBe(true);
    });

    it('should fail validation when variance exceeds 100%', () => {
      const statement = createTestStatement({
        receivables: {
          currentBalance: 100000,
          previousBalance: 40000,
          change: 60000, // 150% increase
          cashFlowAdjustment: -60000
        },
        payables: {
          currentBalance: 18000,
          previousBalance: 25000,
          change: -7000,
          cashFlowAdjustment: -7000
        },
        warnings: []
      });

      const results = validationEngine.validateBusinessRules(statement);
      const varianceRule = results.find(r => r.ruleId === 'WC_EXTREME_RECEIVABLES_VARIANCE');

      expect(varianceRule).toBeDefined();
      expect(varianceRule?.isValid).toBe(false);
      expect(varianceRule?.message).toContain('Significant variance');
      expect(varianceRule?.message).toContain('>100%');
    });

    it('should pass validation when previous balance is zero (first period)', () => {
      const statement = createTestStatement({
        receivables: {
          currentBalance: 50000,
          previousBalance: 0, // First period
          change: 50000,
          cashFlowAdjustment: -50000
        },
        payables: {
          currentBalance: 18000,
          previousBalance: 0,
          change: 18000,
          cashFlowAdjustment: 18000
        },
        warnings: []
      });

      const results = validationEngine.validateBusinessRules(statement);
      const varianceRule = results.find(r => r.ruleId === 'WC_EXTREME_RECEIVABLES_VARIANCE');

      expect(varianceRule).toBeDefined();
      expect(varianceRule?.isValid).toBe(true);
    });
  });

  describe('WC_EXTREME_PAYABLES_VARIANCE - Extreme Variance >100% (Requirement 7.2)', () => {
    it('should pass validation when variance is within 100%', () => {
      const statement = createTestStatement({
        receivables: {
          currentBalance: 50000,
          previousBalance: 40000,
          change: 10000,
          cashFlowAdjustment: -10000
        },
        payables: {
          currentBalance: 35000,
          previousBalance: 25000,
          change: 10000, // 40% increase
          cashFlowAdjustment: 10000
        },
        warnings: []
      });

      const results = validationEngine.validateBusinessRules(statement);
      const varianceRule = results.find(r => r.ruleId === 'WC_EXTREME_PAYABLES_VARIANCE');

      expect(varianceRule).toBeDefined();
      expect(varianceRule?.isValid).toBe(true);
    });

    it('should fail validation when variance exceeds 100%', () => {
      const statement = createTestStatement({
        receivables: {
          currentBalance: 50000,
          previousBalance: 40000,
          change: 10000,
          cashFlowAdjustment: -10000
        },
        payables: {
          currentBalance: 60000,
          previousBalance: 25000,
          change: 35000, // 140% increase
          cashFlowAdjustment: 35000
        },
        warnings: []
      });

      const results = validationEngine.validateBusinessRules(statement);
      const varianceRule = results.find(r => r.ruleId === 'WC_EXTREME_PAYABLES_VARIANCE');

      expect(varianceRule).toBeDefined();
      expect(varianceRule?.isValid).toBe(false);
      expect(varianceRule?.message).toContain('Significant variance');
    });
  });

  describe('WC_MISSING_PREVIOUS_PERIOD - Missing Previous Period (Requirement 7.3)', () => {
    it('should pass validation when previous period data exists', () => {
      const statement = createTestStatement({
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
        },
        warnings: []
      });

      const results = validationEngine.validateBusinessRules(statement);
      const missingPeriodRule = results.find(r => r.ruleId === 'WC_MISSING_PREVIOUS_PERIOD');

      expect(missingPeriodRule).toBeDefined();
      expect(missingPeriodRule?.isValid).toBe(true);
    });

    it('should fail validation when previous period warning exists', () => {
      const statement = createTestStatement({
        receivables: {
          currentBalance: 50000,
          previousBalance: 0,
          change: 50000,
          cashFlowAdjustment: -50000
        },
        payables: {
          currentBalance: 18000,
          previousBalance: 0,
          change: 18000,
          cashFlowAdjustment: 18000
        },
        warnings: ['No previous period found. Using zero as baseline for previous period balances.']
      });

      const results = validationEngine.validateBusinessRules(statement);
      const missingPeriodRule = results.find(r => r.ruleId === 'WC_MISSING_PREVIOUS_PERIOD');

      expect(missingPeriodRule).toBeDefined();
      expect(missingPeriodRule?.isValid).toBe(false);
      expect(missingPeriodRule?.message).toContain('Previous period data not available');
    });
  });

  describe('WC_INCONSISTENT_BALANCE_SHEET_DATA - Inconsistent Data (Requirement 7.4)', () => {
    it('should pass validation with consistent data', () => {
      const statement = createTestStatement({
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
        },
        warnings: []
      });

      const results = validationEngine.validateBusinessRules(statement);
      const inconsistentDataRule = results.find(r => r.ruleId === 'WC_INCONSISTENT_BALANCE_SHEET_DATA');

      expect(inconsistentDataRule).toBeDefined();
      expect(inconsistentDataRule?.isValid).toBe(true);
    });

    it('should fail validation when payables balance is negative', () => {
      const statement = createTestStatement({
        receivables: {
          currentBalance: 50000,
          previousBalance: 40000,
          change: 10000,
          cashFlowAdjustment: -10000
        },
        payables: {
          currentBalance: -5000, // Negative payables
          previousBalance: 25000,
          change: -30000,
          cashFlowAdjustment: -30000
        },
        warnings: []
      });

      const results = validationEngine.validateBusinessRules(statement);
      const inconsistentDataRule = results.find(r => r.ruleId === 'WC_INCONSISTENT_BALANCE_SHEET_DATA');

      expect(inconsistentDataRule).toBeDefined();
      expect(inconsistentDataRule?.isValid).toBe(false);
      expect(inconsistentDataRule?.message).toContain('Inconsistent balance sheet data');
    });

    it('should fail validation when receivables exceed reasonable limits', () => {
      const statement = createTestStatement({
        receivables: {
          currentBalance: 2000000000, // 2 billion - exceeds limit
          previousBalance: 40000,
          change: 1999960000,
          cashFlowAdjustment: -1999960000
        },
        payables: {
          currentBalance: 18000,
          previousBalance: 25000,
          change: -7000,
          cashFlowAdjustment: -7000
        },
        warnings: []
      });

      const results = validationEngine.validateBusinessRules(statement);
      const inconsistentDataRule = results.find(r => r.ruleId === 'WC_INCONSISTENT_BALANCE_SHEET_DATA');

      expect(inconsistentDataRule).toBeDefined();
      expect(inconsistentDataRule?.isValid).toBe(false);
    });
  });

  describe('Integration with Statement Validation', () => {
    it('should include working capital validation in comprehensive statement validation', () => {
      const statement: FinancialStatement = {
        statementCode: 'CASH_FLOW',
        lines: [],
        totals: {
          OPERATING_CASH_FLOW: 100000,
          INVESTING_CASH_FLOW: -50000,
          FINANCING_CASH_FLOW: 20000,
          NET_CASH_FLOW: 70000
        },
        metadata: {
          workingCapital: {
            receivables: {
              currentBalance: -5000, // Error: negative
              previousBalance: 40000,
              change: -45000,
              cashFlowAdjustment: 45000
            },
            payables: {
              currentBalance: 60000,
              previousBalance: 25000,
              change: 35000, // Warning: >100% variance
              cashFlowAdjustment: 35000
            },
            warnings: ['No previous period found. Using zero as baseline for previous period balances.']
          }
        }
      };

      const validationResults = validationEngine.validateStatementBalance(statement);

      // Should have errors from negative receivables and inconsistent data
      expect(validationResults.errors.length).toBeGreaterThan(0);
      
      // Should have warnings from extreme variance and missing previous period
      expect(validationResults.warnings.length).toBeGreaterThan(0);
      
      // Overall validation should fail due to errors
      expect(validationResults.isValid).toBe(false);
      
      // Check that working capital rules are included
      const wcRules = validationResults.businessRules.filter(r => r.ruleId.startsWith('WC_'));
      expect(wcRules.length).toBeGreaterThan(0);
    });

    it('should pass validation for statement without working capital data', () => {
      const statement: FinancialStatement = {
        statementCode: 'CASH_FLOW',
        lines: [],
        totals: {
          OPERATING_CASH_FLOW: 100000,
          INVESTING_CASH_FLOW: -50000,
          FINANCING_CASH_FLOW: 20000,
          NET_CASH_FLOW: 70000
        },
        metadata: {}
      };

      const validationResults = validationEngine.validateStatementBalance(statement);

      // Working capital rules should pass when no data exists
      const wcRules = validationResults.businessRules.filter(r => r.ruleId.startsWith('WC_'));
      const failedWcRules = wcRules.filter(r => !r.isValid);
      
      expect(failedWcRules.length).toBe(0);
    });
  });
});
