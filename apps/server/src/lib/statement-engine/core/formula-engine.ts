import { EventSummary } from "../../../api/routes/financial-reports/data-collection.service";

export interface FormulaContext {
  lineValues: Map<string, number>;
  eventValues: Map<string, number>;
  periodComparisons: Map<string, number>;
  constants: Map<string, any>;
  balanceSheet?: {
    current: Map<string, number>;  // Event code → Amount
    previous: Map<string, number>; // Event code → Amount
  };
}

export interface ComputationResult {
  success: boolean;
  value: number;
  error?: string;
}

export class StatementFormulaEngine {
  private safeFunctions = {
    // Basic arithmetic
    ABS: Math.abs,
    ROUND: (num: number, digits = 0) => Math.round(num * Math.pow(10, digits)) / Math.pow(10, digits),
    CEIL: Math.ceil,
    FLOOR: Math.floor,
    MAX: Math.max,
    MIN: Math.min,
    SUM: (...args: number[]) => args.reduce((sum, val) => sum + (val || 0), 0),
    AVERAGE: (...args: number[]) => args.length > 0 ? args.reduce((sum, val) => sum + (val || 0), 0) / args.length : 0,
    
    // Safe operations
    SAFEDIV: (dividend: number, divisor: number, defaultValue = 0) => divisor !== 0 ? dividend / divisor : defaultValue,
    IF: (condition: boolean, trueValue: any, falseValue: any) => condition ? trueValue : falseValue,
    PERCENTAGE: (value: number, total: number) => total !== 0 ? (value / total) * 100 : 0,
    
    // Statement-specific functions
    SUM_EVENTS: (eventCodes: string[], eventValues: Map<string, number>) => {
      return eventCodes.reduce((sum, code) => sum + (eventValues.get(code) || 0), 0);
    },
    SUM_LINES: (lineCodes: string[], lineValues: Map<string, number>) => {
      return lineCodes.reduce((sum, code) => sum + (lineValues.get(code) || 0), 0);
    },
    SUM_RANGE: (startCode: string, endCode: string, lineValues: Map<string, number>) => {
      // This would need to be implemented based on your line code naming convention
      let sum = 0;
      for (const [code, value] of lineValues.entries()) {
        if (code >= startCode && code <= endCode) {
          sum += value;
        }
      }
      return sum;
    },
  };

  /**
   * Evaluate a formula with the given context
   */
  async evaluateFormula(
    formula: string,
    context: FormulaContext
  ): Promise<ComputationResult> {
    try {
      // Parse and validate formula
      const parseResult = this.parseFormula(formula);
      if (!parseResult.isValid) {
        return {
          success: false,
          value: 0,
          error: `Formula parsing failed: ${parseResult.errors.join(', ')}`,
        };
      }

      // Replace references with actual values
      let processedFormula = this.replaceReferences(formula, context);

      // Evaluate the formula
      const result = this.safeEvaluate(processedFormula);
      
      return {
        success: true,
        value: result,
      };
    } catch (error) {
      return {
        success: false,
        value: 0,
        error: `Formula evaluation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Parse formula for syntax validation
   */
  parseFormula(formula: string): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    try {
      // Check for balanced parentheses
      const openParens = (formula.match(/\(/g) || []).length;
      const closeParens = (formula.match(/\)/g) || []).length;
      
      if (openParens !== closeParens) {
        errors.push("Mismatched parentheses");
      }

      // Check for invalid characters
      const invalidChars = formula.match(/[^a-zA-Z0-9\s\+\-\*\/\(\)\.\,\_\>\<\=\!\&\|\[\]]/g);
      if (invalidChars) {
        errors.push(`Invalid characters: ${invalidChars.join(', ')}`);
      }

      // Check for circular references (basic check)
      const dependencies = this.extractDependencies(formula);
      // This would need more sophisticated circular reference detection

      return {
        isValid: errors.length === 0,
        errors,
      };
    } catch (error) {
      return {
        isValid: false,
        errors: [error instanceof Error ? error.message : 'Parse error'],
      };
    }
  }

  /**
   * Replace formula references with actual values
   */
  private replaceReferences(formula: string, context: FormulaContext): string {
    let processedFormula = formula;

    // Replace function calls
    Object.entries(this.safeFunctions).forEach(([name, func]) => {
      const regex = new RegExp(`\\b${name}\\s*\\(([^)]*)\\)`, 'gi');
      processedFormula = processedFormula.replace(regex, (match, args) => {
        const argValues = args.split(',').map((arg: string) => {
          const trimmed = arg.trim();
          
          // Handle special function arguments
          if (name === 'SUM_EVENTS' && trimmed.startsWith('[') && trimmed.endsWith(']')) {
            const eventCodes = trimmed.slice(1, -1).split(',').map(code => code.trim().replace(/['"]/g, ''));
            return String((func as any)(eventCodes, context.eventValues));
          }
          
          if (name === 'SUM_LINES' && trimmed.startsWith('[') && trimmed.endsWith(']')) {
            const lineCodes = trimmed.slice(1, -1).split(',').map(code => code.trim().replace(/['"]/g, ''));
            return String((func as any)(lineCodes, context.lineValues));
          }
          
          if (name === 'SUM_RANGE' && trimmed.includes(',')) {
            const [startCode, endCode] = trimmed.split(',').map(code => code.trim().replace(/['"]/g, ''));
            return String((func as any)(startCode, endCode, context.lineValues));
          }
          
          // Regular argument processing
          if (context.lineValues.has(trimmed)) {
            return String(context.lineValues.get(trimmed));
          }
          if (context.eventValues.has(trimmed)) {
            return String(context.eventValues.get(trimmed));
          }
          if (context.constants.has(trimmed)) {
            return String(context.constants.get(trimmed));
          }
          return isNaN(Number(trimmed)) ? trimmed : Number(trimmed);
        });
        return String((func as any)(...argValues));
      });
    });

    // Replace direct references
    Object.entries(context.lineValues).forEach(([key, value]) => {
      const regex = new RegExp(`\\b${key}\\b`, 'g');
      processedFormula = processedFormula.replace(regex, String(value));
    });

    Object.entries(context.eventValues).forEach(([key, value]) => {
      const regex = new RegExp(`\\b${key}\\b`, 'g');
      processedFormula = processedFormula.replace(regex, String(value));
    });

    return processedFormula;
  }

  /**
   * Safely evaluate the processed formula
   */
  private safeEvaluate(formula: string): number {
    try {
      // Use Function constructor for safe evaluation
      const result = new Function(`"use strict"; return (${formula})`)();
      return Number(result) || 0;
    } catch (error) {
      throw new Error(`Evaluation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Extract dependencies from formula
   */
  extractDependencies(formula: string): string[] {
    const fieldPattern = /\b([a-zA-Z][a-zA-Z0-9_]*)\b/g;
    const matches = formula.match(fieldPattern) || [];
    
    // Filter out function names and keywords
    const functionNames = Object.keys(this.safeFunctions);
    const keywords = ['true', 'false', 'null', 'undefined', 'if', 'else'];
    
    const dependencies = matches.filter(match => 
      !functionNames.includes(match.toUpperCase()) &&
      !keywords.includes(match.toLowerCase()) &&
      isNaN(Number(match))
    );

    return [...new Set(dependencies)]; // Remove duplicates
  }

  /**
   * Validate formula for statement-specific rules
   */
  validateStatementFormula(formula: string, statementCode: string): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    const parseResult = this.parseFormula(formula);
    
    if (!parseResult.isValid) {
      errors.push(...parseResult.errors);
    }

    // Statement-specific validations
    switch (statementCode) {
      case 'REV_EXP':
        // Revenue and Expenditure specific validations
        if (formula.includes('TOTAL_ASSETS') || formula.includes('TOTAL_LIABILITIES')) {
          errors.push('Balance sheet references not allowed in Revenue & Expenditure statement');
        }
        break;
      
      case 'ASSETS_LIAB':
        // Balance Sheet specific validations
        // Allow CROSS_STATEMENT_SURPLUS_DEFICIT which is the approved way to get R&E surplus/deficit
        if ((formula.includes('TOTAL_REVENUE') || formula.includes('TOTAL_EXPENSES')) 
            && !formula.includes('CROSS_STATEMENT_SURPLUS_DEFICIT')) {
          errors.push('Income statement references not allowed in Balance Sheet. Use CROSS_STATEMENT_SURPLUS_DEFICIT instead.');
        }
        break;
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}