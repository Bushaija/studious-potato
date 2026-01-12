import { db } from "@/db";
import { formSchemas } from "@/db/schema";
import { eq } from "drizzle-orm";
import { formulaEngine } from "../utils/computation.utils";

// Enhanced interfaces for type safety
export interface ValidationRule {
  type: 'custom' | 'required' | 'format' | 'min' | 'max' | 'minLength' | 'maxLength' | 'pattern';
  formula?: string;
  message?: string;
  enabled?: boolean;
  value?: any;
  severity?: 'error' | 'warning';
}

export interface ValidationErrorContext {
  fieldKey: string;
  fieldLabel: string;
  ruleType: string;
  error: Error;
  requestId?: string;
  schemaId?: number;
  originalRule?: any;
}

export interface ValidationLogContext {
  requestId?: string;
  schemaId?: number;
  userId?: string;
  sessionId?: string;
  timestamp: string;
  operation: string;
}

export interface StructuredLogEntry {
  level: 'error' | 'warn' | 'info' | 'debug';
  message: string;
  context: ValidationLogContext;
  details?: {
    fieldKey?: string;
    fieldLabel?: string;
    ruleType?: string;
    error?: string;
    stack?: string;
    originalRule?: any;
    processedRules?: number;
    skippedRules?: number;
    executionTime?: number;
  };
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
  severity: 'error' | 'warning';
}

export interface ValidationWarning {
  field: string;
  message: string;
  code: string;
}

export interface ValidationMetadata {
  processedRules: number;
  skippedRules: number;
  processingTime: number;
  totalFields?: number;
  validatedFields?: number;
}

export interface EnhancedValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  metadata: ValidationMetadata;
}


export class ValidationService {
  private logContext: ValidationLogContext | null = null;

  /**
   * Sets the request context for logging operations
   * @param context - The validation log context
   */
  public setLogContext(context: Partial<ValidationLogContext>): void {
    this.logContext = {
      timestamp: new Date().toISOString(),
      operation: 'validation',
      ...context
    };
  }

  /**
   * Clears the current log context
   */
  public clearLogContext(): void {
    this.logContext = null;
  }

  /**
   * Creates a structured log entry with consistent formatting
   * @param level - Log level
   * @param message - Log message
   * @param details - Additional details for the log entry
   */
  private createStructuredLog(
    level: 'error' | 'warn' | 'info' | 'debug',
    message: string,
    details?: StructuredLogEntry['details']
  ): StructuredLogEntry {
    return {
      level,
      message,
      context: this.logContext || {
        timestamp: new Date().toISOString(),
        operation: 'validation'
      },
      details
    };
  }

  /**
   * Logs structured validation information
   * @param logEntry - The structured log entry
   */
  private logStructured(logEntry: StructuredLogEntry): void {
    const logData = {
      ...logEntry,
      service: 'ValidationService',
      version: '1.0.0'
    };

    switch (logEntry.level) {
      case 'error':
        console.error('VALIDATION_ERROR:', JSON.stringify(logData, null, 2));
        break;
      case 'warn':
        console.warn('VALIDATION_WARNING:', JSON.stringify(logData, null, 2));
        break;
      case 'info':
        console.info('VALIDATION_INFO:', JSON.stringify(logData, null, 2));
        break;
      case 'debug':
        console.debug('VALIDATION_DEBUG:', JSON.stringify(logData, null, 2));
        break;
    }
  }

  /**
   * Logs malformed validation rules with comprehensive context
   * @param fieldKey - The field key where the malformed rule was found
   * @param fieldLabel - The field label for user-friendly context
   * @param originalRule - The original malformed rule
   * @param reason - The reason why the rule is considered malformed
   */
  private logMalformedRule(
    fieldKey: string,
    fieldLabel: string,
    originalRule: any,
    reason: string
  ): void {
    const logEntry = this.createStructuredLog(
      'warn',
      `Malformed validation rule detected for field: ${fieldKey}`,
      {
        fieldKey,
        fieldLabel,
        ruleType: 'malformed',
        error: reason,
        originalRule: this.sanitizeLogData(originalRule)
      }
    );

    this.logStructured(logEntry);
  }

  /**
   * Logs validation rule processing statistics
   * @param fieldKey - The field key being processed
   * @param processedRules - Number of successfully processed rules
   * @param skippedRules - Number of skipped rules
   * @param executionTime - Time taken to process rules (optional)
   */
  private logRuleProcessingStats(
    fieldKey: string,
    processedRules: number,
    skippedRules: number,
    executionTime?: number
  ): void {
    const logEntry = this.createStructuredLog(
      'debug',
      `Validation rule processing completed for field: ${fieldKey}`,
      {
        fieldKey,
        processedRules,
        skippedRules,
        executionTime
      }
    );

    this.logStructured(logEntry);
  }

  /**
   * Sanitizes data for logging to prevent sensitive information exposure
   * @param data - The data to sanitize
   * @returns Sanitized data safe for logging
   */
  private sanitizeLogData(data: any): any {
    if (data === null || data === undefined) {
      return data;
    }

    if (typeof data === 'string') {
      // Truncate very long strings
      return data.length > 500 ? data.substring(0, 500) + '...[truncated]' : data;
    }

    if (typeof data === 'object') {
      if (Array.isArray(data)) {
        // Limit array size in logs
        return data.length > 10 ? [...data.slice(0, 10), '...[truncated]'] : data;
      }

      // Create a sanitized copy of the object
      const sanitized: any = {};
      for (const [key, value] of Object.entries(data)) {
        // Skip potentially sensitive fields
        if (key.toLowerCase().includes('password') || 
            key.toLowerCase().includes('token') || 
            key.toLowerCase().includes('secret')) {
          sanitized[key] = '[REDACTED]';
        } else {
          sanitized[key] = this.sanitizeLogData(value);
        }
      }
      return sanitized;
    }

    return data;
  }

  /**
   * Sanitizes and validates validation rules input to ensure it's in the correct format
   * @param rules - The validation rules input (can be any type)
   * @returns Array of valid ValidationRule objects
   */
  private sanitizeValidationRules(rules: unknown, fieldKey?: string, fieldLabel?: string): ValidationRule[] {
    // Handle null, undefined, or non-array inputs
    if (!rules) {
      if (fieldKey && fieldLabel) {
        this.logMalformedRule(fieldKey, fieldLabel, rules, 'Validation rules are null or undefined');
      }
      return [];
    }

    // If it's not an array, try to convert or return empty array
    if (!Array.isArray(rules)) {
      if (fieldKey && fieldLabel) {
        this.logMalformedRule(
          fieldKey, 
          fieldLabel, 
          rules, 
          `Expected array but received ${typeof rules}`
        );
      }

      // If it's an object that might be a single rule, wrap it in an array
      if (typeof rules === 'object' && rules !== null) {
        try {
          const singleRule = this.validateSingleRule(rules);
          if (singleRule) {
            if (fieldKey && fieldLabel) {
              const logEntry = this.createStructuredLog(
                'info',
                `Converted single validation rule object to array for field: ${fieldKey}`,
                {
                  fieldKey,
                  fieldLabel,
                  ruleType: 'conversion',
                  originalRule: this.sanitizeLogData(rules)
                }
              );
              this.logStructured(logEntry);
            }
            return [singleRule];
          }
        } catch (error) {
          if (fieldKey && fieldLabel) {
            this.logMalformedRule(
              fieldKey, 
              fieldLabel, 
              rules, 
              `Failed to convert object to validation rule: ${error instanceof Error ? error.message : 'Unknown error'}`
            );
          }
        }
      }
      return [];
    }

    // Filter and validate each rule in the array
    const validRules: ValidationRule[] = [];
    let invalidRuleCount = 0;

    for (let i = 0; i < rules.length; i++) {
      const rule = rules[i];
      try {
        const validatedRule = this.validateSingleRule(rule);
        if (validatedRule) {
          validRules.push(validatedRule);
        } else {
          invalidRuleCount++;
          if (fieldKey && fieldLabel) {
            this.logMalformedRule(
              fieldKey,
              fieldLabel,
              rule,
              `Rule at index ${i} failed validation - missing required properties or invalid format`
            );
          }
        }
      } catch (error) {
        invalidRuleCount++;
        if (fieldKey && fieldLabel) {
          this.logMalformedRule(
            fieldKey,
            fieldLabel,
            rule,
            `Rule at index ${i} threw error during validation: ${error instanceof Error ? error.message : 'Unknown error'}`
          );
        }
      }
    }

    // Log summary of rule sanitization
    if (fieldKey && fieldLabel && (validRules.length > 0 || invalidRuleCount > 0)) {
      const logEntry = this.createStructuredLog(
        'debug',
        `Validation rule sanitization completed for field: ${fieldKey}`,
        {
          fieldKey,
          fieldLabel,
          ruleType: 'sanitization',
          processedRules: validRules.length,
          skippedRules: invalidRuleCount
        }
      );
      this.logStructured(logEntry);
    }

    return validRules;
  }

  /**
   * Type guard to check if a rule object is a valid ValidationRule
   * @param rule - The rule object to validate
   * @returns ValidationRule if valid, null if invalid
   */
  private validateSingleRule(rule: any): ValidationRule | null {
    if (!rule || typeof rule !== 'object') {
      return null;
    }

    // Check required type field
    if (!rule.type || typeof rule.type !== 'string') {
      return null;
    }

    // Validate type is one of the allowed values
    const validTypes = ['custom', 'required', 'format', 'min', 'max', 'minLength', 'maxLength', 'pattern'];
    if (!validTypes.includes(rule.type)) {
      return null;
    }

    // Create validated rule with defaults
    const validatedRule: ValidationRule = {
      type: rule.type,
      enabled: rule.enabled !== false, // Default to true unless explicitly false
    };

    // Add optional properties if they exist and are valid
    if (rule.formula && typeof rule.formula === 'string') {
      validatedRule.formula = rule.formula;
    }

    if (rule.message && typeof rule.message === 'string') {
      validatedRule.message = rule.message;
    }

    if (rule.value !== undefined) {
      validatedRule.value = rule.value;
    }

    if (rule.severity && ['error', 'warning'].includes(rule.severity)) {
      validatedRule.severity = rule.severity;
    }

    return validatedRule;
  }



  /**
   * Logs validation errors with structured context for debugging
   * @param context - The error context information
   */
  private logValidationError(context: ValidationErrorContext): void {
    const logEntry = this.createStructuredLog(
      'error',
      `Validation error in field: ${context.fieldKey}`,
      {
        fieldKey: context.fieldKey,
        fieldLabel: context.fieldLabel,
        ruleType: context.ruleType,
        error: context.error.message,
        stack: context.error.stack,
        originalRule: this.sanitizeLogData(context.originalRule)
      }
    );

    // Add additional context from the error context if available
    if (context.requestId && this.logContext) {
      this.logContext.requestId = context.requestId;
    }
    if (context.schemaId && this.logContext) {
      this.logContext.schemaId = context.schemaId;
    }

    this.logStructured(logEntry);
  }
  async validateFormData(
    schemaId: number, 
    data: Record<string, any>,
    requestContext?: Partial<ValidationLogContext>
  ) {
    // Set up logging context for this validation operation
    this.setLogContext({
      ...requestContext,
      schemaId,
      operation: 'validateFormData'
    });

    const startTime = performance.now();

    try {
      // Log validation start
      const logEntry = this.createStructuredLog(
        'info',
        `Starting form data validation for schema: ${schemaId}`,
        {
          fieldKey: 'validation_start'
        }
      );
      this.logStructured(logEntry);

      const schema = await db.query.formSchemas.findFirst({
        where: eq(formSchemas.id, schemaId),
        with: {
          formFields: true
        }
      });

      if (!schema) {
        const errorLog = this.createStructuredLog(
          'error',
          `Schema not found: ${schemaId}`,
          {
            error: 'Schema not found'
          }
        );
        this.logStructured(errorLog);
        throw new Error("Schema not found");
      }

      // Check if this schema uses nested activities structure
      const schemaDefinition = schema.schema as any;
      const isNestedStructure = schemaDefinition?.dataStructure === 'nested' || 
                                 (data.activities && typeof data.activities === 'object' && !Array.isArray(data.activities));

      if (isNestedStructure && data.activities) {
        // Use nested validation for activities structure
        const nestedResult = await this.validateNestedActivities(schema, data.activities, startTime);
        
        // Log completion
        const completionLog = this.createStructuredLog(
          'info',
          `Nested activities validation completed for schema: ${schemaId}`,
          {
            processedRules: nestedResult.metadata.processedRules,
            skippedRules: nestedResult.metadata.skippedRules,
            executionTime: nestedResult.metadata.processingTime,
            fieldKey: 'validation_complete'
          }
        );
        this.logStructured(completionLog);
        
        return nestedResult;
      }

      // Fall back to flat field validation for legacy schemas
      const errors: ValidationError[] = [];
      const warnings: ValidationWarning[] = [];
      let isValid = true;
      let totalProcessedRules = 0;
      let totalSkippedRules = 0;
      let validatedFields = 0;

      for (const field of (schema.formFields as any[])) {
        validatedFields++;
        const value = data[field.fieldKey];
        
        // Check required fields
        if (field.isRequired && (value === undefined || value === null || value === '')) {
          errors.push({
            field: field.fieldKey,
            message: `${field.label} is required`,
            code: 'REQUIRED',
            severity: 'error'
          });
          isValid = false;

          // Log required field validation failure
          const requiredFieldLog = this.createStructuredLog(
            'debug',
            `Required field validation failed: ${field.fieldKey}`,
            {
              fieldKey: field.fieldKey,
              fieldLabel: field.label,
              ruleType: 'required'
            }
          );
          this.logStructured(requiredFieldLog);
        }

        // Validate field type and constraints
        if (value !== undefined && value !== null) {
          const fieldValidationResult = this.validateFieldValue(field, value);
          
          // Separate errors and warnings based on severity
          for (const result of fieldValidationResult) {
            if (result.severity === 'warning') {
              warnings.push({
                field: result.field,
                message: result.message,
                code: result.code
              });
            } else {
              errors.push({
                field: result.field,
                message: result.message,
                code: result.code,
                severity: result.severity || 'error'
              });
              isValid = false;
            }
          }
        }

        // Custom validation rules
        if (field.validationRules) {
          const customValidationResult = await this.applyCustomValidations(field, value, data);
          
          // Separate errors and warnings from custom validation
          for (const result of customValidationResult.errors) {
            if (result.severity === 'warning') {
              warnings.push({
                field: result.field,
                message: result.message,
                code: result.code
              });
            } else {
              errors.push({
                field: result.field,
                message: result.message,
                code: result.code,
                severity: result.severity || 'error'
              });
              isValid = false;
            }
          }
          
          totalProcessedRules += customValidationResult.processedRules || 0;
          totalSkippedRules += customValidationResult.skippedRules || 0;
        }
      }

      const executionTime = performance.now() - startTime;

      // Log validation completion
      const completionLog = this.createStructuredLog(
        'info',
        `Form data validation completed for schema: ${schemaId}`,
        {
          processedRules: totalProcessedRules,
          skippedRules: totalSkippedRules,
          executionTime,
          fieldKey: 'validation_complete'
        }
      );
      this.logStructured(completionLog);

      return {
        isValid,
        errors,
        warnings,
        metadata: {
          processedRules: totalProcessedRules,
          skippedRules: totalSkippedRules,
          processingTime: executionTime,
          totalFields: schema.formFields?.length || 0,
          validatedFields
        }
      };

    } catch (error) {
      const executionTime = performance.now() - startTime;
      
      // Log validation failure
      const failureLog = this.createStructuredLog(
        'error',
        `Form data validation failed for schema: ${schemaId}`,
        {
          error: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined,
          executionTime
        }
      );
      this.logStructured(failureLog);

      throw error;
    } finally {
      // Clear the log context
      this.clearLogContext();
    }
  }

  async validateAccountingEquation(
    balances: any, 
    tolerance: number = 0.01,
    requestContext?: Partial<ValidationLogContext>
  ) {
    // Set up logging context for this validation operation
    this.setLogContext({
      ...requestContext,
      operation: 'validateAccountingEquation'
    });

    const startTime = performance.now();

    try {
      // Log validation start
      const logEntry = this.createStructuredLog(
        'info',
        'Starting accounting equation validation',
        {
          fieldKey: 'accounting_equation_start'
        }
      );
      this.logStructured(logEntry);
      const netFinancialAssets = balances.netFinancialAssets?.cumulativeBalance || 0;
      const closingBalance = balances.closingBalance?.cumulativeBalance || 0;
      const difference = Math.abs(netFinancialAssets - closingBalance);
      
      const isValid = difference <= tolerance;
      const errors: ValidationError[] = [];
      const warnings: ValidationWarning[] = [];

      if (!isValid) {
        errors.push({
          field: 'accounting_equation',
          message: `Net Financial Assets (${netFinancialAssets}) must equal Closing Balance (${closingBalance}). Difference: ${difference.toFixed(2)}`,
          code: 'ACCOUNTING_EQUATION_IMBALANCE',
          severity: 'error'
        });

        // Log accounting equation imbalance
        const imbalanceLog = this.createStructuredLog(
          'warn',
          'Accounting equation imbalance detected',
          {
            fieldKey: 'accounting_equation',
            error: `Difference of ${difference.toFixed(2)} exceeds tolerance of ${tolerance}`
          }
        );
        this.logStructured(imbalanceLog);
      }

      // NOTE: We only validate cumulative balance, not individual quarters
      // Individual quarters may not balance as transactions accumulate across quarters
      // The cumulative balance ensures the overall financial position is correct

      const executionTime = performance.now() - startTime;

      // Log validation completion
      const completionLog = this.createStructuredLog(
        'info',
        'Accounting equation validation completed',
        {
          fieldKey: 'accounting_equation_complete',
          executionTime
        }
      );
      this.logStructured(completionLog);

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
        metadata: {
          processedRules: 1, // Accounting equation is one rule
          skippedRules: 0,
          processingTime: executionTime,
          totalFields: 1, // Only cumulative balance
          validatedFields: 1
        }
      };

    } catch (error) {
      const executionTime = performance.now() - startTime;
      
      // Log validation failure
      const failureLog = this.createStructuredLog(
        'error',
        'Accounting equation validation failed',
        {
          error: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined,
          executionTime
        }
      );
      this.logStructured(failureLog);

      throw error;
    } finally {
      // Clear the log context
      this.clearLogContext();
    }
  }

  async validateFormula(formula: string, context: any, requestContext?: Partial<ValidationLogContext>) {
    // Set up logging context for this validation operation
    this.setLogContext({
      ...requestContext,
      operation: 'validateFormula'
    });

    const startTime = performance.now();

    try {
      // Log formula validation start
      const logEntry = this.createStructuredLog(
        'info',
        'Starting formula validation',
        {
          fieldKey: 'formula_validation_start'
        }
      );
      this.logStructured(logEntry);
      const result = {
        isValid: true,
        syntax: {
          isValidSyntax: true,
          syntaxErrors: [] as string[]
        },
        dependencies: {
          requiredFields: [] as string[],
          missingFields: [] as string[],
          circularDependencies: [] as string[]
        },
        testResult: undefined as any,
        warnings: [] as string[]
      };

      try {
        // Parse and validate syntax
        const parseResult = formulaEngine.parseFormula(formula);
        if (!parseResult.isValid) {
          result.isValid = false;
          result.syntax.isValidSyntax = false;
          result.syntax.syntaxErrors = parseResult.errors;

          // Log syntax errors
          const syntaxErrorLog = this.createStructuredLog(
            'warn',
            'Formula syntax validation failed',
            {
              fieldKey: 'formula_syntax',
              error: parseResult.errors.join(', ')
            }
          );
          this.logStructured(syntaxErrorLog);
        }

        // Extract dependencies
        const dependencies = formulaEngine.extractDependencies(formula);
        result.dependencies.requiredFields = dependencies;

        // Check for missing fields in context
        if (context.availableFields) {
          const missingFields = dependencies.filter(
            field => !context.availableFields.includes(field)
          );
          result.dependencies.missingFields = missingFields;
          
          if (missingFields.length > 0) {
            result.isValid = false;

            // Log missing dependencies
            const missingDepsLog = this.createStructuredLog(
              'warn',
              'Formula has missing field dependencies',
              {
                fieldKey: 'formula_dependencies',
                error: `Missing fields: ${missingFields.join(', ')}`
              }
            );
            this.logStructured(missingDepsLog);
          }
        }

        // Test execution if test data provided
        if (context.testData && result.syntax.isValidSyntax) {
          const testStartTime = performance.now();
          try {
            const testResult = await formulaEngine.evaluate(formula, context.testData);
            const testExecutionTime = performance.now() - testStartTime;
            
            result.testResult = {
              result: testResult,
              executionTime: testExecutionTime,
            };

            // Performance warnings
            if (testExecutionTime > 100) {
              result.warnings.push("Formula execution time exceeds 100ms - consider optimization");
              
              // Log performance warning
              const perfWarningLog = this.createStructuredLog(
                'warn',
                'Formula execution performance warning',
                {
                  fieldKey: 'formula_performance',
                  executionTime: testExecutionTime
                }
              );
              this.logStructured(perfWarningLog);
            }
          } catch (error) {
            result.testResult = {
              result: null,
              executionTime: performance.now() - testStartTime,
              error: error instanceof Error ? error.message : "Execution failed"
            };

            // Log execution error
            const execErrorLog = this.createStructuredLog(
              'error',
              'Formula test execution failed',
              {
                fieldKey: 'formula_execution',
                error: error instanceof Error ? error.message : 'Unknown execution error'
              }
            );
            this.logStructured(execErrorLog);
          }
        }

        // Check for potential circular dependencies (simplified check)
        const circularDeps = this.detectCircularDependencies(formula, dependencies);
        result.dependencies.circularDependencies = circularDeps;

        if (circularDeps.length > 0) {
          // Log circular dependencies
          const circularDepsLog = this.createStructuredLog(
            'warn',
            'Potential circular dependencies detected in formula',
            {
              fieldKey: 'formula_circular_deps',
              error: `Circular dependencies: ${circularDeps.join(', ')}`
            }
          );
          this.logStructured(circularDepsLog);
        }

      } catch (error) {
        result.isValid = false;
        result.syntax.isValidSyntax = false;
        result.syntax.syntaxErrors.push(error instanceof Error ? error.message : "Unknown error");

        // Log overall formula validation error
        const overallErrorLog = this.createStructuredLog(
          'error',
          'Formula validation process failed',
          {
            fieldKey: 'formula_validation',
            error: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined
          }
        );
        this.logStructured(overallErrorLog);
      }

      const executionTime = performance.now() - startTime;

      // Log formula validation completion
      const completionLog = this.createStructuredLog(
        'info',
        'Formula validation completed',
        {
          fieldKey: 'formula_validation_complete',
          executionTime
        }
      );
      this.logStructured(completionLog);

      return result;

    } catch (error) {
      const executionTime = performance.now() - startTime;
      
      // Log validation failure
      const failureLog = this.createStructuredLog(
        'error',
        'Formula validation failed',
        {
          error: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined,
          executionTime
        }
      );
      this.logStructured(failureLog);

      throw error;
    } finally {
      // Clear the log context
      this.clearLogContext();
    }
  }

  private validateFieldValue(field: any, value: any): ValidationError[] {
    const errors: ValidationError[] = [];
    
    switch (field.fieldType) {
      case 'number':
      case 'currency':
        if (typeof value !== 'number' && !Number.isFinite(Number(value))) {
          errors.push({
            field: field.fieldKey,
            message: `${field.label} must be a valid number`,
            code: 'INVALID_NUMBER',
            severity: 'error'
          });
        } else {
          const numValue = typeof value === 'number' ? value : Number(value);
          const config = field.fieldConfig || {};
          
          if (config.min !== undefined && numValue < config.min) {
            errors.push({
              field: field.fieldKey,
              message: `${field.label} must be at least ${config.min}`,
              code: 'MIN_VALUE',
              severity: 'error'
            });
          }
          
          if (config.max !== undefined && numValue > config.max) {
            errors.push({
              field: field.fieldKey,
              message: `${field.label} must not exceed ${config.max}`,
              code: 'MAX_VALUE',
              severity: 'error'
            });
          }
        }
        break;

      case 'text':
      case 'textarea':
        if (typeof value !== 'string') {
          errors.push({
            field: field.fieldKey,
            message: `${field.label} must be text`,
            code: 'INVALID_TEXT',
            severity: 'error'
          });
        } else {
          const config = field.fieldConfig || {};
          
          if (config.minLength && value.length < config.minLength) {
            errors.push({
              field: field.fieldKey,
              message: `${field.label} must be at least ${config.minLength} characters`,
              code: 'MIN_LENGTH',
              severity: 'error'
            });
          }
          
          if (config.maxLength && value.length > config.maxLength) {
            errors.push({
              field: field.fieldKey,
              message: `${field.label} must not exceed ${config.maxLength} characters`,
              code: 'MAX_LENGTH',
              severity: 'error'
            });
          }

          if (config.pattern) {
            const regex = new RegExp(config.pattern);
            if (!regex.test(value)) {
              errors.push({
                field: field.fieldKey,
                message: `${field.label} format is invalid`,
                code: 'INVALID_FORMAT',
                severity: 'error'
              });
            }
          }
        }
        break;

      case 'date':
        const date = new Date(value);
        if (isNaN(date.getTime())) {
          errors.push({
            field: field.fieldKey,
            message: `${field.label} must be a valid date`,
            code: 'INVALID_DATE',
            severity: 'error'
          });
        }
        break;

      case 'select':
        const config = field.fieldConfig || {};
        if (config.options && !config.options.some((opt: any) => opt.value === value)) {
          errors.push({
            field: field.fieldKey,
            message: `${field.label} contains an invalid selection`,
            code: 'INVALID_OPTION',
            severity: 'error'
          });
        }
        break;
    }

    return errors;
  }

  private async applyCustomValidations(field: any, value: any, allData: Record<string, any>): Promise<{
    errors: Array<{
      field: string;
      message: string;
      code: string;
      severity?: 'error' | 'warning';
    }>;
    processedRules: number;
    skippedRules: number;
  }> {
    const errors: Array<{
      field: string;
      message: string;
      code: string;
      severity?: 'error' | 'warning';
    }> = [];
    let processedRules = 0;
    let skippedRules = 0;
    const startTime = performance.now();

    try {
      // Sanitize validation rules to ensure they're in the correct format
      const validationRules = this.sanitizeValidationRules(
        field.validationRules, 
        field.fieldKey, 
        field.label || field.fieldKey
      );

      // If no valid rules after sanitization, return empty errors
      if (validationRules.length === 0) {
        // Log if original rules existed but were invalid
        if (field.validationRules) {
          const logEntry = this.createStructuredLog(
            'warn',
            `No valid validation rules found for field: ${field.fieldKey}`,
            {
              fieldKey: field.fieldKey,
              fieldLabel: field.label || field.fieldKey,
              ruleType: 'sanitization',
              originalRule: this.sanitizeLogData(field.validationRules)
            }
          );
          this.logStructured(logEntry);
        }
        return { errors, processedRules, skippedRules };
      }

      // Safe iteration with individual rule error handling
      for (let i = 0; i < validationRules.length; i++) {
        const rule = validationRules[i];
        
        // Skip disabled rules
        if (rule.enabled === false) {
          skippedRules++;
          
          const skipLog = this.createStructuredLog(
            'debug',
            `Skipping disabled validation rule for field: ${field.fieldKey}`,
            {
              fieldKey: field.fieldKey,
              fieldLabel: field.label || field.fieldKey,
              ruleType: rule.type,
              originalRule: this.sanitizeLogData(rule)
            }
          );
          this.logStructured(skipLog);
          continue;
        }

        // Wrap each rule processing in its own try-catch for graceful degradation
        try {
          if (rule.type === 'custom' && rule.formula) {
            // Additional safety check for formula execution
            try {
              const context = { [field.fieldKey]: value, ...allData };
              const result = await formulaEngine.evaluate(rule.formula, context);
              
              if (!result) {
                errors.push({
                  field: field.fieldKey,
                  message: rule.message || `${field.label} validation failed`,
                  code: 'CUSTOM_VALIDATION',
                  severity: rule.severity || 'error'
                });

                const validationFailLog = this.createStructuredLog(
                  'debug',
                  `Custom validation rule failed for field: ${field.fieldKey}`,
                  {
                    fieldKey: field.fieldKey,
                    fieldLabel: field.label || field.fieldKey,
                    ruleType: 'custom_formula',
                    originalRule: this.sanitizeLogData(rule)
                  }
                );
                this.logStructured(validationFailLog);
              }
              processedRules++;
            } catch (formulaError) {
              // Formula execution failed - log and continue with other rules
              skippedRules++;
              this.logValidationError({
                fieldKey: field.fieldKey,
                fieldLabel: field.label || field.fieldKey,
                ruleType: 'custom_formula',
                error: formulaError instanceof Error ? formulaError : new Error('Formula execution failed'),
                originalRule: rule
              });

              // Add a graceful error message for the user
              errors.push({
                field: field.fieldKey,
                message: rule.message || `${field.label} validation could not be completed`,
                code: 'VALIDATION_EXECUTION_ERROR',
                severity: 'warning'
              });
            }
          } else if (rule.type !== 'custom') {
            // Handle other rule types with individual error handling
            try {
              const ruleError = this.validateRuleType(field, value, rule);
              if (ruleError) {
                errors.push(ruleError);
                
                const ruleFailLog = this.createStructuredLog(
                  'debug',
                  `Validation rule failed for field: ${field.fieldKey}`,
                  {
                    fieldKey: field.fieldKey,
                    fieldLabel: field.label || field.fieldKey,
                    ruleType: rule.type,
                    error: ruleError.message,
                    originalRule: this.sanitizeLogData(rule)
                  }
                );
                this.logStructured(ruleFailLog);
              }
              processedRules++;
            } catch (ruleTypeError) {
              // Rule type validation failed - log and continue
              skippedRules++;
              this.logValidationError({
                fieldKey: field.fieldKey,
                fieldLabel: field.label || field.fieldKey,
                ruleType: rule.type,
                error: ruleTypeError instanceof Error ? ruleTypeError : new Error('Rule type validation failed'),
                originalRule: rule
              });
            }
          } else {
            // Custom rule without formula - skip but log
            skippedRules++;
            this.logValidationError({
              fieldKey: field.fieldKey,
              fieldLabel: field.label || field.fieldKey,
              ruleType: rule.type,
              error: new Error('Custom validation rule missing formula'),
              originalRule: rule
            });
          }
        } catch (ruleError) {
          // Individual rule processing failed - implement graceful degradation
          skippedRules++;
          
          // Log the error with full context
          this.logValidationError({
            fieldKey: field.fieldKey,
            fieldLabel: field.label || field.fieldKey,
            ruleType: rule.type || 'unknown',
            error: ruleError instanceof Error ? ruleError : new Error('Unknown rule processing error'),
            originalRule: rule
          });

          // Continue processing other rules instead of failing completely
          // Only add user-facing error if it's critical
          if (rule.severity === 'error' || !rule.severity) {
            errors.push({
              field: field.fieldKey,
              message: `Validation rule could not be processed: ${ruleError instanceof Error ? ruleError.message : 'Unknown error'}`,
              code: 'RULE_PROCESSING_ERROR',
              severity: 'warning'
            });
          }
        }
      }

      const executionTime = performance.now() - startTime;

      // Log processing statistics for debugging
      this.logRuleProcessingStats(
        field.fieldKey,
        processedRules,
        skippedRules,
        executionTime
      );

    } catch (overallError) {
      const executionTime = performance.now() - startTime;
      
      // Catch-all error handler for the entire validation process
      this.logValidationError({
        fieldKey: field.fieldKey,
        fieldLabel: field.label || field.fieldKey,
        ruleType: 'validation_process',
        error: overallError instanceof Error ? overallError : new Error('Overall validation process failed'),
        originalRule: field.validationRules
      });

      // Log the overall failure with execution time
      const overallFailureLog = this.createStructuredLog(
        'error',
        `Custom validation process failed for field: ${field.fieldKey}`,
        {
          fieldKey: field.fieldKey,
          fieldLabel: field.label || field.fieldKey,
          error: overallError instanceof Error ? overallError.message : 'Unknown error',
          executionTime,
          processedRules,
          skippedRules
        }
      );
      this.logStructured(overallFailureLog);

      // Return a graceful error message instead of throwing
      errors.push({
        field: field.fieldKey,
        message: `Field validation could not be completed due to an internal error`,
        code: 'VALIDATION_SYSTEM_ERROR',
        severity: 'error'
      });
    }

    return { errors, processedRules, skippedRules };
  }

  /**
   * Validates non-custom rule types (required, format, etc.)
   * @param field - The field being validated
   * @param value - The field value
   * @param rule - The validation rule
   * @returns Validation error if rule fails, null if passes
   */
  private validateRuleType(field: any, value: any, rule: ValidationRule): {
    field: string;
    message: string;
    code: string;
    severity?: 'error' | 'warning';
  } | null {
    switch (rule.type) {
      case 'required':
        if (value === undefined || value === null || value === '') {
          return {
            field: field.fieldKey,
            message: rule.message || `${field.label} is required`,
            code: 'REQUIRED',
            severity: rule.severity || 'error'
          };
        }
        break;

      case 'pattern':
        if (rule.value && typeof value === 'string') {
          const regex = new RegExp(rule.value);
          if (!regex.test(value)) {
            return {
              field: field.fieldKey,
              message: rule.message || `${field.label} format is invalid`,
              code: 'INVALID_FORMAT',
              severity: rule.severity || 'error'
            };
          }
        }
        break;

      case 'min':
        if (rule.value !== undefined && typeof value === 'number' && value < rule.value) {
          return {
            field: field.fieldKey,
            message: rule.message || `${field.label} must be at least ${rule.value}`,
            code: 'MIN_VALUE',
            severity: rule.severity || 'error'
          };
        }
        break;

      case 'max':
        if (rule.value !== undefined && typeof value === 'number' && value > rule.value) {
          return {
            field: field.fieldKey,
            message: rule.message || `${field.label} must not exceed ${rule.value}`,
            code: 'MAX_VALUE',
            severity: rule.severity || 'error'
          };
        }
        break;

      case 'minLength':
        if (rule.value !== undefined && typeof value === 'string' && value.length < rule.value) {
          return {
            field: field.fieldKey,
            message: rule.message || `${field.label} must be at least ${rule.value} characters`,
            code: 'MIN_LENGTH',
            severity: rule.severity || 'error'
          };
        }
        break;

      case 'maxLength':
        if (rule.value !== undefined && typeof value === 'string' && value.length > rule.value) {
          return {
            field: field.fieldKey,
            message: rule.message || `${field.label} must not exceed ${rule.value} characters`,
            code: 'MAX_LENGTH',
            severity: rule.severity || 'error'
          };
        }
        break;
    }

    return null;
  }

  private detectCircularDependencies(formula: string, dependencies: string[]): string[] {
    // Simplified circular dependency detection
    // In a real implementation, you'd want a more sophisticated graph-based approach
    const circular = [];
    
    for (const dep of dependencies) {
      if (formula.includes(dep) && dep.includes('self')) {
        circular.push(dep);
      }
    }
    
    return circular;
  }

  /**
   * Validates nested activities structure used in planning forms
   * @param schema - The form schema
   * @param activities - The nested activities object
   * @param startTime - Start time for performance tracking
   * @returns Validation result
   */
  private async validateNestedActivities(
    schema: any,
    activities: Record<string, any>,
    startTime: number
  ): Promise<EnhancedValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    let totalProcessedRules = 0;
    let totalSkippedRules = 0;

    // Get the activity schema definition from the form schema
    const schemaDefinition = schema.schema as any;
    const activitiesSection = schemaDefinition?.sections?.find((s: any) => s.id === 'activities');
    const activitiesField = activitiesSection?.fields?.find((f: any) => f.key === 'activities');
    const itemSchema = activitiesField?.itemSchema;

    if (!itemSchema || !itemSchema.properties) {
      // Schema not found - use basic validation rules for nested activities
      // This handles legacy schemas that haven't been updated yet
      const logEntry = this.createStructuredLog(
        'debug',
        'No item schema found, using basic validation rules for nested activities',
        {
          fieldKey: 'activities',
          ruleType: 'schema_fallback'
        }
      );
      this.logStructured(logEntry);

      // Apply basic validation rules
      return this.validateNestedActivitiesBasic(activities, startTime);
    }

    // Validate each activity
    const activityIds = Object.keys(activities);
    
    for (const activityId of activityIds) {
      const activityData = activities[activityId];
      
      if (!activityData || typeof activityData !== 'object') {
        errors.push({
          field: `activities.${activityId}`,
          message: 'Activity data must be an object',
          code: 'INVALID_TYPE',
          severity: 'error'
        });
        continue;
      }

      // Validate each property in the activity
      for (const [propKey, propSchema] of Object.entries(itemSchema.properties)) {
        const propDef = propSchema as any;
        const value = activityData[propKey];
        const fieldPath = `activities.${activityId}.${propKey}`;

        // Skip validation for calculated/readonly fields
        if (propDef.readonly || propDef.type === 'calculated') {
          totalSkippedRules++;
          continue;
        }

        // Check required fields
        if (propDef.required && (value === undefined || value === null || value === '')) {
          errors.push({
            field: fieldPath,
            message: `${propDef.label || propKey} is required`,
            code: 'REQUIRED',
            severity: 'error'
          });
          totalProcessedRules++;
          continue;
        }

        // Skip further validation if value is not provided and not required
        if (value === undefined || value === null || value === '') {
          totalSkippedRules++;
          continue;
        }

        // Validate field type
        const typeValidationError = this.validateNestedFieldType(fieldPath, value, propDef);
        if (typeValidationError) {
          errors.push(typeValidationError);
          totalProcessedRules++;
          continue;
        }

        // Validate constraints
        if (propDef.validation) {
          const constraintErrors = this.validateNestedFieldConstraints(fieldPath, value, propDef);
          errors.push(...constraintErrors);
          totalProcessedRules += constraintErrors.length;
        }

        totalProcessedRules++;
      }
    }

    const executionTime = performance.now() - startTime;

    // Log validation details
    const logEntry = this.createStructuredLog(
      'info',
      `Validated ${activityIds.length} activities with ${totalProcessedRules} rules`,
      {
        fieldKey: 'nested_activities_validation',
        processedRules: totalProcessedRules,
        skippedRules: totalSkippedRules,
        executionTime
      }
    );
    this.logStructured(logEntry);

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      metadata: {
        processedRules: totalProcessedRules,
        skippedRules: totalSkippedRules,
        processingTime: executionTime,
        totalFields: activityIds.length * Object.keys(itemSchema.properties).length,
        validatedFields: activityIds.length * Object.keys(itemSchema.properties).length - totalSkippedRules
      }
    };
  }

  /**
   * Validates nested activities with basic rules when schema is not available
   * @param activities - The nested activities object
   * @param startTime - Start time for performance tracking
   * @returns Validation result
   */
  private async validateNestedActivitiesBasic(
    activities: Record<string, any>,
    startTime: number
  ): Promise<EnhancedValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    let totalProcessedRules = 0;

    // Basic validation rules that apply to all planning activities
    const basicRules = {
      unit_cost: { type: 'number', required: true, min: 0, label: 'Unit Cost' },
      frequency: { type: 'number', required: true, min: 0, label: 'Frequency' },
      q1_count: { type: 'number', required: true, min: 0, label: 'Q1 Count' },
      q2_count: { type: 'number', required: true, min: 0, label: 'Q2 Count' },
      q3_count: { type: 'number', required: true, min: 0, label: 'Q3 Count' },
      q4_count: { type: 'number', required: true, min: 0, label: 'Q4 Count' }
    };

    // Validate each activity
    const activityIds = Object.keys(activities);
    
    for (const activityId of activityIds) {
      const activityData = activities[activityId];
      
      if (!activityData || typeof activityData !== 'object') {
        errors.push({
          field: `activities.${activityId}`,
          message: 'Activity data must be an object',
          code: 'INVALID_TYPE',
          severity: 'error'
        });
        continue;
      }

      // Apply basic validation rules
      for (const [fieldKey, rules] of Object.entries(basicRules)) {
        const value = activityData[fieldKey];
        const fieldPath = `activities.${activityId}.${fieldKey}`;

        // Check required
        if (rules.required && (value === undefined || value === null || value === '')) {
          errors.push({
            field: fieldPath,
            message: `${rules.label} is required`,
            code: 'REQUIRED',
            severity: 'error'
          });
          totalProcessedRules++;
          continue;
        }

        // Skip if not provided and not required
        if (value === undefined || value === null || value === '') {
          continue;
        }

        // Validate type
        if (rules.type === 'number' && typeof value !== 'number' && !Number.isFinite(Number(value))) {
          errors.push({
            field: fieldPath,
            message: `${rules.label} must be a valid number`,
            code: 'INVALID_NUMBER',
            severity: 'error'
          });
          totalProcessedRules++;
          continue;
        }

        // Validate min constraint
        if (rules.min !== undefined) {
          const numValue = typeof value === 'number' ? value : Number(value);
          if (numValue < rules.min) {
            errors.push({
              field: fieldPath,
              message: `${rules.label} must be at least ${rules.min}`,
              code: 'MIN_VALUE',
              severity: 'error'
            });
          }
        }

        totalProcessedRules++;
      }
    }

    const executionTime = performance.now() - startTime;

    // Log validation details
    const logEntry = this.createStructuredLog(
      'info',
      `Basic validation completed for ${activityIds.length} activities with ${totalProcessedRules} rules`,
      {
        fieldKey: 'nested_activities_basic_validation',
        processedRules: totalProcessedRules,
        executionTime
      }
    );
    this.logStructured(logEntry);

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      metadata: {
        processedRules: totalProcessedRules,
        skippedRules: 0,
        processingTime: executionTime,
        totalFields: activityIds.length * Object.keys(basicRules).length,
        validatedFields: activityIds.length * Object.keys(basicRules).length
      }
    };
  }

  /**
   * Validates the type of a nested field value
   * @param fieldPath - The full path to the field
   * @param value - The field value
   * @param propDef - The property definition
   * @returns Validation error if type is invalid, null otherwise
   */
  private validateNestedFieldType(
    fieldPath: string,
    value: any,
    propDef: any
  ): ValidationError | null {
    const { type, label } = propDef;

    switch (type) {
      case 'number':
      case 'currency':
        if (typeof value !== 'number' && !Number.isFinite(Number(value))) {
          return {
            field: fieldPath,
            message: `${label || fieldPath} must be a valid number`,
            code: 'INVALID_NUMBER',
            severity: 'error'
          };
        }
        break;

      case 'text':
        if (typeof value !== 'string') {
          return {
            field: fieldPath,
            message: `${label || fieldPath} must be text`,
            code: 'INVALID_TYPE',
            severity: 'error'
          };
        }
        break;

      case 'date':
        const date = new Date(value);
        if (isNaN(date.getTime())) {
          return {
            field: fieldPath,
            message: `${label || fieldPath} must be a valid date`,
            code: 'INVALID_DATE',
            severity: 'error'
          };
        }
        break;
    }

    return null;
  }

  /**
   * Validates constraints on a nested field value
   * @param fieldPath - The full path to the field
   * @param value - The field value
   * @param propDef - The property definition
   * @returns Array of validation errors
   */
  private validateNestedFieldConstraints(
    fieldPath: string,
    value: any,
    propDef: any
  ): ValidationError[] {
    const errors: ValidationError[] = [];
    const { validation, label, type } = propDef;

    if (!validation) return errors;

    // Convert value to number for numeric validations
    const numValue = (type === 'number' || type === 'currency') ? Number(value) : value;

    // Min value validation
    if (validation.min !== undefined && numValue < validation.min) {
      errors.push({
        field: fieldPath,
        message: `${label || fieldPath} must be at least ${validation.min}`,
        code: 'MIN_VALUE',
        severity: 'error'
      });
    }

    // Max value validation
    if (validation.max !== undefined && numValue > validation.max) {
      errors.push({
        field: fieldPath,
        message: `${label || fieldPath} must not exceed ${validation.max}`,
        code: 'MAX_VALUE',
        severity: 'error'
      });
    }

    // String length validations
    if (type === 'text' && typeof value === 'string') {
      if (validation.minLength !== undefined && value.length < validation.minLength) {
        errors.push({
          field: fieldPath,
          message: `${label || fieldPath} must be at least ${validation.minLength} characters`,
          code: 'MIN_LENGTH',
          severity: 'error'
        });
      }

      if (validation.maxLength !== undefined && value.length > validation.maxLength) {
        errors.push({
          field: fieldPath,
          message: `${label || fieldPath} must not exceed ${validation.maxLength} characters`,
          code: 'MAX_LENGTH',
          severity: 'error'
        });
      }

      // Pattern validation
      if (validation.pattern) {
        const regex = new RegExp(validation.pattern);
        if (!regex.test(value)) {
          errors.push({
            field: fieldPath,
            message: `${label || fieldPath} format is invalid`,
            code: 'INVALID_FORMAT',
            severity: 'error'
          });
        }
      }
    }

    return errors;
  }
}

export const validationService = new ValidationService();
