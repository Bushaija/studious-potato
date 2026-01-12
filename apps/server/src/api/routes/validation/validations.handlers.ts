import { eq } from "drizzle-orm";
import * as HttpStatusCodes from "stoker/http-status-codes";

import { db } from "@/api/db";
import { formSchemas, formFields } from "@/api/db/schema";
import type { AppRouteHandler } from "@/api/lib/types";
import type { 
  ValidateFieldRoute,
  ValidateFormRoute,
  ValidateSchemaRoute,
  BulkValidateRoute,
  GetValidationRulesRoute,
  ValidateComputationRoute
} from "./validations.routes";

// Basic validation service implementation
class ValidationService {
  static validateFieldValue(fieldKey: string, value: any, fieldType: string, rules: any[] = [], required: boolean = false) {
    const errors = [];
    const warnings = [];

    // Required validation
    if (required && (value === null || value === undefined || value === '')) {
      errors.push({
        fieldKey,
        message: `${fieldKey} is required`,
        severity: 'error' as const,
        value,
      });
      return { isValid: false, errors, warnings };
    }

    // Skip further validation if value is empty and not required
    if (!required && (value === null || value === undefined || value === '')) {
      return { isValid: true, errors, warnings };
    }

    // Type-specific validation
    switch (fieldType) {
      case 'number':
      case 'currency':
      case 'percentage':
        if (isNaN(Number(value))) {
          errors.push({
            fieldKey,
            message: `${fieldKey} must be a valid number`,
            severity: 'error' as const,
            value,
          });
        }
        break;
      
      case 'date':
        if (isNaN(Date.parse(value))) {
          errors.push({
            fieldKey,
            message: `${fieldKey} must be a valid date`,
            severity: 'error' as const,
            value,
          });
        }
        break;
    }

    // Custom validation rules
    for (const rule of rules) {
      try {
        const ruleResult = this.applyValidationRule(fieldKey, value, rule);
        if (ruleResult.error) {
          errors.push({
            fieldKey,
            message: ruleResult.error,
            severity: rule.severity || 'error',
            value,
          });
        }
        if (ruleResult.warning) {
          warnings.push({
            fieldKey,
            message: ruleResult.warning,
            value,
          });
        }
      } catch (error) {
        errors.push({
          fieldKey,
          message: `Validation rule error: ${error.message}`,
          severity: 'error' as const,
          value,
        });
      }
    }

    return {
      isValid: errors.filter(e => e.severity === 'error').length === 0,
      errors,
      warnings,
    };
  }

  static applyValidationRule(fieldKey: string, value: any, rule: any) {
    switch (rule.type) {
      case 'min':
        if (Number(value) < rule.value) {
          return { error: `${fieldKey} must be at least ${rule.value}` };
        }
        break;
      
      case 'max':
        if (Number(value) > rule.value) {
          return { error: `${fieldKey} must be at most ${rule.value}` };
        }
        break;
      
      case 'minLength':
        if (String(value).length < rule.value) {
          return { error: `${fieldKey} must be at least ${rule.value} characters long` };
        }
        break;
      
      case 'maxLength':
        if (String(value).length > rule.value) {
          return { error: `${fieldKey} must be at most ${rule.value} characters long` };
        }
        break;
      
      case 'pattern':
        const regex = new RegExp(rule.value);
        if (!regex.test(String(value))) {
          return { error: rule.message || `${fieldKey} format is invalid` };
        }
        break;
      
      case 'custom':
        // This would need to be implemented based on your custom validation logic
        break;
    }
    
    return {};
  }

  static computeFormula(formula: string, context: Record<string, any>) {
    try {
      // Simple formula evaluation - in production, use a proper expression evaluator
      // This is a basic implementation for demonstration
      let result = formula;
      
      // Replace variables in formula with actual values
      Object.entries(context).forEach(([key, value]) => {
        const regex = new RegExp(`\\b${key}\\b`, 'g');
        result = result.replace(regex, String(value || 0));
      });

      // Basic math operations - use a proper expression evaluator in production
      // eslint-disable-next-line no-eval
      const computed = eval(result);
      return { result: computed, error: null };
    } catch (error) {
      return { result: null, error: error.message };
    }
  }

  static extractFormulaDependencies(formula: string) {
    // Extract variable names from formula - basic implementation
    const matches = formula.match(/\b[a-zA-Z_][a-zA-Z0-9_]*\b/g) || [];
    return [...new Set(matches.filter(match => !['SUM', 'AVG', 'MIN', 'MAX', 'COUNT'].includes(match.toUpperCase())))];
  }
}

export const validateField: AppRouteHandler<ValidateFieldRoute> = async (c) => {
  const body = await c.req.json();
  
  try {
    const result = ValidationService.validateFieldValue(
      body.fieldKey,
      body.value,
      body.fieldType,
      body.validationRules || [],
      body.required
    );

    return c.json(result, HttpStatusCodes.OK);
  } catch (error) {
    return c.json(
      {
        error: "VALIDATION_FAILED",
        message: "Failed to validate field",
      },
      HttpStatusCodes.BAD_REQUEST
    );
  }
};

export const validateForm: AppRouteHandler<ValidateFormRoute> = async (c) => {
  const body = await c.req.json();
  
  try {
    // Get schema and fields
    const schema = await db.query.formSchemas.findFirst({
      where: eq(formSchemas.id, body.schemaId),
    });

    if (!schema) {
      return c.json(
        { message: "Schema not found" },
        HttpStatusCodes.NOT_FOUND
      );
    }

    const fields = await db.query.formFields.findMany({
      where: eq(formFields.schemaId, body.schemaId),
      orderBy: [formFields.displayOrder],
    });

    const errors = [];
    const warnings = [];
    const computedValues = {};

    // Validate each field
    for (const field of fields) {
      const value = body.formData[field.fieldKey];
      
      // Skip validation for computed fields in first pass
      if (field.fieldType === 'calculated' && !body.validateComputed) {
        continue;
      }

      const fieldResult = ValidationService.validateFieldValue(
        field.fieldKey,
        value,
        field.fieldType,
        field.validationRules as any[] || [],
        field.isRequired
      );

      errors.push(...fieldResult.errors);
      warnings.push(...fieldResult.warnings);
    }

    // Compute calculated fields if requested
    if (body.validateComputed) {
      for (const field of fields.filter(f => f.fieldType === 'calculated')) {
        if (field.computationFormula) {
          const computeResult = ValidationService.computeFormula(
            field.computationFormula,
            body.formData
          );
          
          if (computeResult.error) {
            errors.push({
              fieldKey: field.fieldKey,
              message: `Computation error: ${computeResult.error}`,
              severity: 'error' as const,
              value: null,
            });
          } else {
            computedValues[field.fieldKey] = computeResult.result;
          }
        }
      }
    }

    return c.json({
      isValid: errors.filter(e => e.severity === 'error').length === 0,
      errors,
      warnings,
      computedValues: Object.keys(computedValues).length > 0 ? computedValues : undefined,
    }, HttpStatusCodes.OK);
  } catch (error) {
    return c.json(
      {
        error: "FORM_VALIDATION_FAILED",
        message: "Failed to validate form",
      },
      HttpStatusCodes.BAD_REQUEST
    );
  }
};

export const validateSchema: AppRouteHandler<ValidateSchemaRoute> = async (c) => {
  const body = await c.req.json();
  
  try {
    const errors = [];
    const warnings = [];

    // Basic schema validation logic
    if (!body.schema || typeof body.schema !== 'object') {
      errors.push({
        path: 'schema',
        message: 'Schema must be a valid object',
        code: 'INVALID_SCHEMA',
      });
    } else {
      // Validate schema structure
      if (!body.schema.fields || !Array.isArray(body.schema.fields)) {
        errors.push({
          path: 'schema.fields',
          message: 'Schema must contain a fields array',
          code: 'MISSING_FIELDS',
        });
      }
    }

    return c.json({
      isValid: errors.length === 0,
      errors,
      warnings,
    }, HttpStatusCodes.OK);
  } catch (error) {
    return c.json(
      {
        error: "SCHEMA_VALIDATION_FAILED",
        message: "Failed to validate schema",
      },
      HttpStatusCodes.BAD_REQUEST
    );
  }
};

export const bulkValidate: AppRouteHandler<BulkValidateRoute> = async (c) => {
  const body = await c.req.json();
  
  try {
    const results = [];
    let validCount = 0;
    let invalidCount = 0;
    let warningCount = 0;

    for (const validation of body.validations) {
      try {
        // Simulate form validation for each item
        const mockResult = {
          isValid: Math.random() > 0.3, // 70% pass rate for demo
          errors: [],
          warnings: [],
        };

        if (!mockResult.isValid) {
          mockResult.errors.push({
            fieldKey: 'example',
            message: 'Example validation error',
            severity: 'error' as const,
          });
          invalidCount++;
        } else {
          validCount++;
        }

        if (Math.random() > 0.7) { // 30% have warnings
          mockResult.warnings.push({
            fieldKey: 'example',
            message: 'Example warning',
          });
          warningCount++;
        }

        results.push({
          id: validation.id,
          validation: mockResult,
        });

        if (body.stopOnFirstError && !mockResult.isValid) {
          break;
        }
      } catch (error) {
        results.push({
          id: validation.id,
          validation: {
            isValid: false,
            errors: [{
              fieldKey: 'system',
              message: `Validation failed: ${error.message}`,
              severity: 'error' as const,
            }],
            warnings: [],
          },
        });
        invalidCount++;
      }
    }

    return c.json({
      results,
      summary: {
        total: body.validations.length,
        valid: validCount,
        invalid: invalidCount,
        warnings: warningCount,
      },
    }, HttpStatusCodes.OK);
  } catch (error) {
    return c.json(
      {
        error: "BULK_VALIDATION_FAILED",
        message: "Failed to perform bulk validation",
      },
      HttpStatusCodes.BAD_REQUEST
    );
  }
};

export const getValidationRules: AppRouteHandler<GetValidationRulesRoute> = async (c) => {
  const { schemaId } = c.req.param();
  const schemaIdNumber = parseInt(schemaId);
  
  try {
    const schema = await db.query.formSchemas.findFirst({
      where: eq(formSchemas.id, schemaIdNumber),
    });

    if (!schema) {
      return c.json(
        { message: "Schema not found" },
        HttpStatusCodes.NOT_FOUND
      );
    }

    const fields = await db.query.formFields.findMany({
      where: eq(formFields.schemaId, schemaIdNumber),
    });

    const rules = {};
    const computedFields = [];
    const requiredFields = [];

    fields.forEach(field => {
      if (field.validationRules) {
        rules[field.fieldKey] = field.validationRules;
      }
      
      if (field.fieldType === 'calculated') {
        computedFields.push(field.fieldKey);
      }
      
      if (field.isRequired) {
        requiredFields.push(field.fieldKey);
      }
    });

    return c.json({
      schemaId,
      rules,
      computedFields,
      requiredFields,
    }, HttpStatusCodes.OK);
  } catch (error) {
    return c.json(
      {
        error: "RULES_FETCH_FAILED",
        message: "Failed to fetch validation rules",
      },
      HttpStatusCodes.BAD_REQUEST
    );
  }
};

export const validateComputation: AppRouteHandler<ValidateComputationRoute> = async (c) => {
  const body = await c.req.json();
  
  try {
    const computeResult = ValidationService.computeFormula(body.formula, body.context);
    const dependencies = ValidationService.extractFormulaDependencies(body.formula);

    return c.json({
      isValid: computeResult.error === null,
      result: computeResult.result,
      error: computeResult.error,
      dependencies,
    }, HttpStatusCodes.OK);
  } catch (error) {
    return c.json(
      {
        error: "COMPUTATION_VALIDATION_FAILED",
        message: "Failed to validate computation",
      },
      HttpStatusCodes.BAD_REQUEST
    );
  }
};
