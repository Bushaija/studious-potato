/**
 * Formula Engine Foundation
 * Handles formula evaluation, dependency resolution, and calculations
 */

import { 
  FormulaProcessor,
  FormulaContext,
  FinancialStatement,
  DependencyGraph,
  DependencyNode,
  CircularDependencyError,
  FormulaOperation,
  SumOperation,
  DiffOperation,
  ComputedBalanceOperation,
  FormulaError
} from "../types/engine.types";
import { 
  StatementLine,
  ValidationResults
} from "../types/core.types";
import { StatementValidationEngine, ValidationEngine } from "./validation-engine";

export class FormulaEngine implements FormulaProcessor {
  private dependencyGraph: DependencyGraph = {
    nodes: new Map(),
    edges: new Map(),
    resolved: [],
    unresolved: []
  };
  
  private validationEngine: ValidationEngine;

  constructor() {
    this.validationEngine = new StatementValidationEngine();
  }

  /**
   * Evaluate a formula with the given context
   */
  async evaluateFormula(formula: string, context: FormulaContext): Promise<number> {
    try {
      // Handle WORKING_CAPITAL_CHANGE function
      if (formula.trim().toUpperCase().startsWith('WORKING_CAPITAL_CHANGE(')) {
        return this.evaluateWorkingCapitalChange(formula, context);
      }

      // Handle CROSS_STATEMENT_SURPLUS_DEFICIT - gets surplus/deficit from Revenue & Expenditure statement
      if (formula.trim().toUpperCase() === 'CROSS_STATEMENT_SURPLUS_DEFICIT') {
        return this.evaluateCrossStatementSurplusDeficit(context);
      }

      // Parse and validate formula with enhanced parsing
      const operation = this.parseComplexFormula(formula);
      
      // Execute the operation
      const result = await this.executeOperation(operation, context);
      
      return result;
    } catch (error) {
      const formulaError: FormulaError = {
        code: 'FORMULA_EVALUATION_ERROR',
        message: `Failed to evaluate formula: ${formula}`,
        context: { formula },
        timestamp: new Date(),
        severity: 'error',
        formula,
        lineCode: '',
        dependencies: this.extractAllDependencies(formula),
        evaluationError: error instanceof Error ? error.message : 'Unknown error'
      };

      console.error('Formula evaluation error:', formulaError);
      throw error;
    }
  }

  /**
   * Evaluate WORKING_CAPITAL_CHANGE formula function
   * Formula format: WORKING_CAPITAL_CHANGE(RECEIVABLES) or WORKING_CAPITAL_CHANGE(PAYABLES)
   */
  private evaluateWorkingCapitalChange(formula: string, context: FormulaContext): number {
    // Extract account type from formula
    const match = formula.match(/WORKING_CAPITAL_CHANGE\s*\(\s*(\w+)\s*\)/i);
    if (!match) {
      throw new Error(`Invalid WORKING_CAPITAL_CHANGE formula syntax: ${formula}`);
    }

    const accountType = match[1].toUpperCase();
    
    // Validate account type
    if (accountType !== 'RECEIVABLES' && accountType !== 'PAYABLES') {
      throw new Error(`Invalid account type for WORKING_CAPITAL_CHANGE: ${accountType}. Must be RECEIVABLES or PAYABLES.`);
    }

    // Check if balance sheet context is available
    if (!context.balanceSheet) {
      // Return 0 if balance sheet context is not available (e.g., during validation)
      // This is acceptable because WORKING_CAPITAL_CHANGE is only meaningful when
      // comparing current and previous period balance sheets
      console.warn(`[FormulaEngine] Balance sheet context not available for WORKING_CAPITAL_CHANGE(${accountType}), returning 0`);
      return 0;
    }

    // Get event codes for this account type from context
    // The event codes should be passed through the context or we need to define them here
    const eventCodes = this.getEventCodesForAccountType(accountType);
    
    // Calculate current period balance
    const currentBalance = eventCodes.reduce((sum, code) => {
      const value = context.balanceSheet!.current.get(code) || 0;
      return sum + value;
    }, 0);
    
    // Calculate previous period balance
    const previousBalance = eventCodes.reduce((sum, code) => {
      const value = context.balanceSheet!.previous.get(code) || 0;
      return sum + value;
    }, 0);
    
    // Log warning if no data found
    if (currentBalance === 0 && previousBalance === 0) {
      console.warn(`[FormulaEngine] No balance sheet data found for ${accountType} (event codes: ${eventCodes.join(', ')})`);
    }
    
    // Calculate change
    const change = currentBalance - previousBalance;
    
    // Apply cash flow sign
    // For RECEIVABLES: increase in receivables = cash outflow (negative)
    // For PAYABLES: increase in payables = cash inflow (positive)
    const cashFlowAdjustment = accountType === 'RECEIVABLES' ? -change : change;
    
    console.log(`[FormulaEngine] WORKING_CAPITAL_CHANGE(${accountType}):`, {
      currentBalance,
      previousBalance,
      change,
      cashFlowAdjustment
    });
    
    return cashFlowAdjustment;
  }

  /**
   * Evaluate CROSS_STATEMENT_SURPLUS_DEFICIT formula
   * Returns the surplus/deficit calculated from Revenue & Expenditure statement (TOTAL_REVENUE - TOTAL_EXPENSES)
   * This is used in the Balance Sheet to show the period surplus/deficit in the equity section
   */
  private evaluateCrossStatementSurplusDeficit(context: FormulaContext): number {
    // Check if cross-statement values are available
    if (!context.crossStatementValues) {
      console.warn('[FormulaEngine] Cross-statement values not available for CROSS_STATEMENT_SURPLUS_DEFICIT, returning 0');
      return 0;
    }

    const surplusDeficit = context.crossStatementValues.surplusDeficit;
    
    if (surplusDeficit === undefined || surplusDeficit === null) {
      console.warn('[FormulaEngine] Surplus/deficit value not set in cross-statement context, returning 0');
      return 0;
    }

    console.log(`[FormulaEngine] CROSS_STATEMENT_SURPLUS_DEFICIT: ${surplusDeficit}`);
    return surplusDeficit;
  }

  /**
   * Get event codes for a specific account type
   */
  private getEventCodesForAccountType(accountType: string): string[] {
    switch (accountType) {
      case 'RECEIVABLES':
        return ['ADVANCE_PAYMENTS', 'RECEIVABLES_EXCHANGE', 'RECEIVABLES_NON_EXCHANGE'];
      case 'PAYABLES':
        return ['PAYABLES'];
      default:
        throw new Error(`Unknown account type: ${accountType}`);
    }
  }

  /**
   * Resolve dependencies between statement lines
   */
  resolveDependencies(lines: StatementLine[]): StatementLine[] {
    // Build dependency graph
    this.buildDependencyGraph(lines);
    
    // Check for circular dependencies
    const circularDeps = this.detectCircularDependencies();
    if (circularDeps.length > 0) {
      throw new Error(`Circular dependencies detected: ${circularDeps.map(c => c.cycle.join(' -> ')).join(', ')}`);
    }

    // Resolve dependencies in topological order
    const resolvedOrder = this.topologicalSort();
    
    // Reorder lines based on dependency resolution
    const orderedLines: StatementLine[] = [];
    const lineMap = new Map(lines.map(line => [line.metadata.lineCode, line]));

    // Add lines in dependency order
    for (const lineCode of resolvedOrder) {
      const line = lineMap.get(lineCode);
      if (line) {
        orderedLines.push(line);
        lineMap.delete(lineCode);
      }
    }

    // Add remaining lines that have no dependencies
    for (const line of lineMap.values()) {
      orderedLines.push(line);
    }

    return orderedLines;
  }

  /**
   * Validate calculations in a financial statement
   */
  validateCalculations(statement: FinancialStatement): ValidationResults {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Create context for validation
    const context: FormulaContext = {
      eventValues: new Map(),
      lineValues: new Map(statement.lines.map(l => [l.metadata.lineCode, l.currentPeriodValue])),
      previousPeriodValues: new Map(statement.lines.map(l => [l.metadata.lineCode, l.previousPeriodValue])),
      customMappings: {}
    };

    // Validate each line's calculation
    for (const line of statement.lines) {
      if (line.metadata.formula) {
        try {
          // Validate formula syntax first
          const syntaxValidation = this.validateFormulaSyntax(line.metadata.formula);
          if (!syntaxValidation.isValid) {
            errors.push(`Line ${line.metadata.lineCode}: ${syntaxValidation.errors.join(', ')}`);
            continue;
          }

          // Evaluate formula synchronously for validation
          const calculatedValue = this.evaluateFormulaSync(line.metadata.formula, context);
          
          // Check if calculated value matches stored value (with tolerance for rounding)
          const tolerance = 0.01;
          if (Math.abs(calculatedValue - line.currentPeriodValue) > tolerance) {
            warnings.push(`Line ${line.metadata.lineCode}: calculated value (${calculatedValue}) differs from stored value (${line.currentPeriodValue})`);
          }

        } catch (error) {
          // Log error for debugging but don't fail validation for WORKING_CAPITAL_CHANGE formulas
          // when balance sheet context is missing (this is expected during certain validation scenarios)
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          if (errorMessage.includes('Balance sheet context is required')) {
            // This is expected for WORKING_CAPITAL_CHANGE formulas during validation
            // Don't add to errors, just log as debug info
            console.debug(`Line ${line.metadata.lineCode}: Skipping WORKING_CAPITAL_CHANGE validation (balance sheet context not available)`);
          } else {
            errors.push(`Line ${line.metadata.lineCode}: formula validation failed - ${errorMessage}`);
          }
        }
      }
    }

    // Use validation engine for comprehensive validation
    const validationResults = this.validationEngine.validateStatementBalance(statement);
    
    // Merge results
    errors.push(...validationResults.errors);
    warnings.push(...validationResults.warnings);

    return {
      isValid: errors.length === 0 && validationResults.isValid,
      accountingEquation: validationResults.accountingEquation,
      businessRules: validationResults.businessRules,
      warnings,
      errors
    };
  }

  /**
   * Synchronous formula evaluation for validation purposes
   */
  private evaluateFormulaSync(formula: string, context: FormulaContext): number {
    try {
      // Handle WORKING_CAPITAL_CHANGE function
      if (formula.trim().toUpperCase().startsWith('WORKING_CAPITAL_CHANGE(')) {
        return this.evaluateWorkingCapitalChange(formula, context);
      }
      
      // Parse and validate formula
      const operation = this.parseFormula(formula);
      
      // Execute the operation synchronously
      const result = this.executeOperationSync(operation, context);
      
      return result;
    } catch (error) {
      // Only log non-balance-sheet-context errors
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      if (!errorMessage.includes('Balance sheet context is required')) {
        console.error('Synchronous formula evaluation error:', error);
      }
      return 0;
    }
  }



  /**
   * Execute operation synchronously for validation
   */
  private executeOperationSync(operation: FormulaOperation, context: FormulaContext): number {
    switch (operation.type) {
      case 'SUM':
        return this.executeSumOperation(operation as SumOperation, context);
      
      case 'DIFF':
        return this.executeDiffOperation(operation as DiffOperation, context);
      
      case 'COMPUTED_BALANCE':
        return this.executeComputedBalanceOperation(operation as ComputedBalanceOperation, context);
      
      case 'CUSTOM':
        return this.executeCustomOperation(operation, context);
      
      default:
        throw new Error(`Unsupported operation type: ${operation.type}`);
    }
  }

  /**
   * Enhanced formula parsing with support for nested expressions
   */
  private parseComplexFormula(formula: string): FormulaOperation {
    const trimmed = formula.trim();

    // Handle nested formulas and complex expressions
    if (this.hasNestedOperations(trimmed)) {
      return this.parseNestedFormula(trimmed);
    }

    // Fall back to existing parsing logic
    return this.parseFormula(formula);
  }

  /**
   * Check if formula contains nested operations
   */
  private hasNestedOperations(formula: string): boolean {
    // Count parentheses depth and look for nested function calls
    let depth = 0;
    let hasNestedFunctions = false;
    
    for (let i = 0; i < formula.length; i++) {
      if (formula[i] === '(') {
        depth++;
        if (depth > 1) {
          hasNestedFunctions = true;
        }
      } else if (formula[i] === ')') {
        depth--;
      }
    }

    return hasNestedFunctions || this.hasMultipleOperations(formula);
  }

  /**
   * Check if formula has multiple operations
   */
  private hasMultipleOperations(formula: string): boolean {
    const operations = ['SUM(', 'DIFF(', 'MAX(', 'MIN(', 'AVG('];
    let operationCount = 0;
    
    for (const op of operations) {
      const matches = formula.toUpperCase().split(op).length - 1;
      operationCount += matches;
    }

    return operationCount > 1;
  }

  /**
   * Parse nested formulas with dependency resolution
   */
  private parseNestedFormula(formula: string): FormulaOperation {
    // For complex nested formulas, we'll create a custom operation
    // that maintains the full expression and dependencies
    const dependencies = this.extractAllDependencies(formula);
    
    return {
      type: 'CUSTOM',
      operands: dependencies,
      result: undefined,
      error: undefined
    };
  }

  /**
   * Extract all dependencies from complex formulas
   */
  private extractAllDependencies(formula: string): string[] {
    const dependencies = new Set<string>();
    
    // Extract function parameters
    const functionMatches = formula.match(/\b(SUM|DIFF|MAX|MIN|AVG)\s*\([^)]+\)/gi) || [];
    for (const match of functionMatches) {
      const params = this.extractFunctionParameters(match);
      params.forEach(param => dependencies.add(param));
    }

    // Extract line code references (variables not in functions)
    const variableMatches = formula.match(/\b[A-Z_][A-Z0-9_]*\b/g) || [];
    for (const variable of variableMatches) {
      if (!this.isFormulaKeyword(variable) && !this.isNumeric(variable)) {
        dependencies.add(variable);
      }
    }

    return Array.from(dependencies);
  }

  /**
   * Extract parameters from function calls
   */
  private extractFunctionParameters(functionCall: string): string[] {
    const match = functionCall.match(/\([^)]+\)/);
    if (!match) return [];

    const paramString = match[0].slice(1, -1); // Remove parentheses
    return paramString
      .split(',')
      .map(param => param.trim().replace(/['"]/g, ''))
      .filter(param => param.length > 0);
  }

  /**
   * Enhanced custom operation execution with expression evaluation
   */
  private executeEnhancedCustomOperation(operation: FormulaOperation, context: FormulaContext): number {
    // For now, implement basic expression evaluation
    // In a production system, you might want to use a proper expression parser
    
    // Handle simple arithmetic expressions
    if (operation.operands.length === 0) {
      return 0;
    }

    // Check if this is a simple arithmetic expression like "A - B" or "A + B"
    const originalFormula = this.getOriginalFormula(operation);
    if (originalFormula) {
      return this.evaluateArithmeticExpression(originalFormula, context);
    }

    // Sum all operand values as a fallback
    let total = 0;
    for (const operand of operation.operands) {
      const value = context.lineValues.get(operand) || context.eventValues.get(operand) || 0;
      total += value;
    }

    return total;
  }

  /**
   * Get the original formula from the operation (we need to store this during parsing)
   */
  private getOriginalFormula(operation: FormulaOperation): string | null {
    // Return the stored original formula if available
    return (operation as any).originalFormula || null;
  }

  /**
   * Evaluate simple arithmetic expressions like "A - B", "A + B", etc.
   */
  private evaluateArithmeticExpression(formula: string, context: FormulaContext): number {
    // Replace variables with their values
    let expression = formula;
    
    // Collect all variable names from the formula
    const variablePattern = /\b[A-Z_][A-Z0-9_]*\b/g;
    const variables = new Set(formula.match(variablePattern) || []);
    
    // Replace line values - wrap in parentheses to avoid issues with adjacent parentheses
    for (const [lineCode, value] of context.lineValues) {
      const regex = new RegExp(`\\b${lineCode}\\b`, 'g');
      expression = expression.replace(regex, `(${value})`);
      variables.delete(lineCode);
    }
    
    // Replace event values - wrap in parentheses to avoid issues with adjacent parentheses
    for (const [eventCode, value] of context.eventValues) {
      const regex = new RegExp(`\\b${eventCode}\\b`, 'g');
      expression = expression.replace(regex, `(${value})`);
      variables.delete(eventCode);
    }
    
    // Replace any remaining variables with 0 (undefined event/line codes)
    for (const variable of variables) {
      const regex = new RegExp(`\\b${variable}\\b`, 'g');
      expression = expression.replace(regex, '(0)');
    }
    
    try {
      // Use Function constructor for safe evaluation of simple arithmetic
      const result = new Function(`"use strict"; return (${expression})`)();
      return Number(result) || 0;
    } catch (error) {
      console.error('Arithmetic expression evaluation failed:', error);
      console.error('Expression that failed:', expression);
      console.error('Original formula:', formula);
      return 0;
    }
  }

  /**
   * Validate formula syntax and structure
   */
  validateFormulaSyntax(formula: string): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check for balanced parentheses
    if (!this.hasBalancedParentheses(formula)) {
      errors.push('Unbalanced parentheses in formula');
    }

    // Check for valid function syntax
    const functionErrors = this.validateFunctionSyntax(formula);
    errors.push(...functionErrors);

    // Check for valid variable names
    const variableErrors = this.validateVariableNames(formula);
    errors.push(...variableErrors);

    // Check for circular references (basic check)
    const dependencies = this.extractAllDependencies(formula);
    if (dependencies.length > 10) {
      errors.push('Formula has too many dependencies (max 10)');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Check if parentheses are balanced
   */
  private hasBalancedParentheses(formula: string): boolean {
    let count = 0;
    for (const char of formula) {
      if (char === '(') count++;
      if (char === ')') count--;
      if (count < 0) return false;
    }
    return count === 0;
  }

  /**
   * Validate function syntax
   */
  private validateFunctionSyntax(formula: string): string[] {
    const errors: string[] = [];
    const functionPattern = /\b(SUM|DIFF|MAX|MIN|AVG)\s*\([^)]*\)/gi;
    const matches = formula.match(functionPattern) || [];

    for (const match of matches) {
      const functionName = match.match(/^[A-Z]+/i)?.[0]?.toUpperCase();
      const params = this.extractFunctionParameters(match);

      switch (functionName) {
        case 'SUM':
          if (params.length === 0) {
            errors.push(`SUM function requires at least one parameter: ${match}`);
          }
          break;
        
        case 'DIFF':
          if (params.length !== 2) {
            errors.push(`DIFF function requires exactly two parameters: ${match}`);
          }
          break;
        
        case 'MAX':
        case 'MIN':
        case 'AVG':
          if (params.length === 0) {
            errors.push(`${functionName} function requires at least one parameter: ${match}`);
          }
          break;
      }
    }

    return errors;
  }

  /**
   * Validate variable names in formula
   */
  private validateVariableNames(formula: string): string[] {
    const errors: string[] = [];
    const variables = this.extractAllDependencies(formula);

    for (const variable of variables) {
      // Check if variable name follows naming conventions
      if (!/^[A-Z_][A-Z0-9_]*$/.test(variable)) {
        errors.push(`Invalid variable name: ${variable}`);
      }

      // Check if variable name is too long
      if (variable.length > 50) {
        errors.push(`Variable name too long: ${variable}`);
      }
    }

    return errors;
  }

  // Private helper methods

  private parseFormula(formula: string): FormulaOperation {
    const trimmed = formula.trim().toUpperCase();

    // Parse SUM operations
    if (trimmed.startsWith('SUM(')) {
      return this.parseSumOperation(formula);
    }

    // Parse DIFF operations
    if (trimmed.startsWith('DIFF(')) {
      return this.parseDiffOperation(formula);
    }

    // Parse computed balance operations
    if (trimmed.includes('=')) {
      return this.parseComputedBalanceOperation(formula);
    }

    // Default to custom operation - store original formula for arithmetic evaluation
    return {
      type: 'CUSTOM',
      operands: this.extractDependencies(formula),
      originalFormula: formula.trim()
    };
  }

  private parseSumOperation(formula: string): SumOperation {
    // Extract event codes from SUM(eventCode1, eventCode2, ...)
    const match = formula.match(/SUM\s*\(\s*([^)]+)\s*\)/i);
    if (!match) {
      throw new Error(`Invalid SUM formula: ${formula}`);
    }

    const eventCodes = match[1]
      .split(',')
      .map(code => code.trim().replace(/['"]/g, ''))
      .filter(code => code.length > 0);

    return {
      type: 'SUM',
      operands: eventCodes,
      eventCodes
    };
  }

  private parseDiffOperation(formula: string): DiffOperation {
    // Extract operands from DIFF(minuend, subtrahend)
    const match = formula.match(/DIFF\s*\(\s*([^,]+)\s*,\s*([^)]+)\s*\)/i);
    if (!match) {
      throw new Error(`Invalid DIFF formula: ${formula}`);
    }

    const minuend = match[1].trim().replace(/['"]/g, '');
    const subtrahend = match[2].trim().replace(/['"]/g, '');

    return {
      type: 'DIFF',
      operands: [minuend, subtrahend],
      minuend,
      subtrahend
    };
  }

  private parseComputedBalanceOperation(formula: string): ComputedBalanceOperation {
    // Parse equations like "Assets = Liabilities + Equity"
    const parts = formula.split('=');
    if (parts.length !== 2) {
      throw new Error(`Invalid balance equation: ${formula}`);
    }

    const leftSide = this.parseExpressionOperands(parts[0].trim());
    const rightSide = this.parseExpressionOperands(parts[1].trim());

    return {
      type: 'COMPUTED_BALANCE',
      operands: [...leftSide, ...rightSide],
      equation: formula,
      leftSide,
      rightSide
    };
  }

  private parseExpressionOperands(expression: string): string[] {
    // Extract operands from expressions like "A + B - C"
    const operands: string[] = [];
    const tokens = expression.split(/[\+\-\*\/\(\)\s]+/);
    
    for (const token of tokens) {
      const trimmed = token.trim();
      if (trimmed && !this.isNumeric(trimmed)) {
        operands.push(trimmed);
      }
    }

    return operands;
  }

  private async executeOperation(operation: FormulaOperation, context: FormulaContext): Promise<number> {
    switch (operation.type) {
      case 'SUM':
        return this.executeSumOperation(operation as SumOperation, context);
      
      case 'DIFF':
        return this.executeDiffOperation(operation as DiffOperation, context);
      
      case 'COMPUTED_BALANCE':
        return this.executeComputedBalanceOperation(operation as ComputedBalanceOperation, context);
      
      case 'CUSTOM':
        return this.executeCustomOperation(operation, context);
      
      default:
        throw new Error(`Unsupported operation type: ${operation.type}`);
    }
  }

  private executeSumOperation(operation: SumOperation, context: FormulaContext): number {
    let total = 0;
    
    for (const eventCode of operation.eventCodes) {
      const value = context.eventValues.get(eventCode) || context.lineValues.get(eventCode) || 0;
      total += value;
    }

    return total;
  }

  private executeDiffOperation(operation: DiffOperation, context: FormulaContext): number {
    const minuendValue = context.eventValues.get(operation.minuend) || 
                        context.lineValues.get(operation.minuend) || 0;
    const subtrahendValue = context.eventValues.get(operation.subtrahend) || 
                           context.lineValues.get(operation.subtrahend) || 0;

    return minuendValue - subtrahendValue;
  }

  private executeComputedBalanceOperation(operation: ComputedBalanceOperation, context: FormulaContext): number {
    // For computed balance operations, we typically return the left side value
    // The validation would check if left side equals right side
    let leftSideTotal = 0;
    
    for (const operand of operation.leftSide) {
      const value = context.eventValues.get(operand) || context.lineValues.get(operand) || 0;
      leftSideTotal += value;
    }

    return leftSideTotal;
  }

  private executeCustomOperation(operation: FormulaOperation, context: FormulaContext): number {
    // Use enhanced custom operation execution
    return this.executeEnhancedCustomOperation(operation, context);
  }

  private extractDependencies(formula: string): string[] {
    // Extract variable names from formula (simplified approach)
    const dependencies: string[] = [];
    const tokens = formula.match(/\b[A-Z_][A-Z0-9_]*\b/g) || [];
    
    for (const token of tokens) {
      // Filter out function names and keywords
      if (!this.isFormulaKeyword(token)) {
        dependencies.push(token);
      }
    }

    return [...new Set(dependencies)]; // Remove duplicates
  }

  private isFormulaKeyword(token: string): boolean {
    const keywords = ['SUM', 'DIFF', 'MAX', 'MIN', 'AVG', 'COUNT', 'IF', 'AND', 'OR', 'NOT'];
    return keywords.includes(token.toUpperCase());
  }

  private isNumeric(value: string): boolean {
    return !isNaN(Number(value));
  }

  private buildDependencyGraph(lines: StatementLine[]): void {
    this.dependencyGraph = {
      nodes: new Map(),
      edges: new Map(),
      resolved: [],
      unresolved: []
    };

    // Create nodes for each line
    for (const line of lines) {
      const dependencies = line.metadata.formula ? 
        this.extractDependencies(line.metadata.formula) : [];
      
      const node: DependencyNode = {
        lineCode: line.metadata.lineCode,
        formula: line.metadata.formula,
        dependencies,
        dependents: [],
        resolved: false
      };

      this.dependencyGraph.nodes.set(line.metadata.lineCode, node);
      this.dependencyGraph.edges.set(line.metadata.lineCode, dependencies);
    }

    // Build dependent relationships
    for (const [lineCode, dependencies] of this.dependencyGraph.edges) {
      for (const dependency of dependencies) {
        const dependencyNode = this.dependencyGraph.nodes.get(dependency);
        if (dependencyNode) {
          dependencyNode.dependents.push(lineCode);
        }
      }
    }
  }

  private detectCircularDependencies(): CircularDependencyError[] {
    const errors: CircularDependencyError[] = [];
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    for (const lineCode of this.dependencyGraph.nodes.keys()) {
      if (!visited.has(lineCode)) {
        const cycle = this.detectCycleFromNode(lineCode, visited, recursionStack, []);
        if (cycle.length > 0) {
          errors.push({
            cycle,
            message: `Circular dependency detected: ${cycle.join(' -> ')}`
          });
        }
      }
    }

    return errors;
  }

  private detectCycleFromNode(
    nodeCode: string,
    visited: Set<string>,
    recursionStack: Set<string>,
    path: string[]
  ): string[] {
    visited.add(nodeCode);
    recursionStack.add(nodeCode);
    path.push(nodeCode);

    const dependencies = this.dependencyGraph.edges.get(nodeCode) || [];
    
    for (const dependency of dependencies) {
      if (!visited.has(dependency)) {
        const cycle = this.detectCycleFromNode(dependency, visited, recursionStack, [...path]);
        if (cycle.length > 0) {
          return cycle;
        }
      } else if (recursionStack.has(dependency)) {
        // Found a cycle
        const cycleStart = path.indexOf(dependency);
        return path.slice(cycleStart).concat([dependency]);
      }
    }

    recursionStack.delete(nodeCode);
    return [];
  }

  private topologicalSort(): string[] {
    const result: string[] = [];
    const visited = new Set<string>();
    const temp = new Set<string>();

    const visit = (nodeCode: string): void => {
      if (temp.has(nodeCode)) {
        throw new Error(`Circular dependency detected involving ${nodeCode}`);
      }
      
      if (!visited.has(nodeCode)) {
        temp.add(nodeCode);
        
        const dependencies = this.dependencyGraph.edges.get(nodeCode) || [];
        for (const dependency of dependencies) {
          if (this.dependencyGraph.nodes.has(dependency)) {
            visit(dependency);
          }
        }
        
        temp.delete(nodeCode);
        visited.add(nodeCode);
        result.push(nodeCode);
      }
    };

    for (const nodeCode of this.dependencyGraph.nodes.keys()) {
      if (!visited.has(nodeCode)) {
        visit(nodeCode);
      }
    }

    return result;
  }


}