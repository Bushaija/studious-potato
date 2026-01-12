import { z } from "zod";

// Base field types for schema validation
export const fieldTypeSchema = z.enum([
  'text', 'number', 'currency', 'percentage', 'date', 
  'select', 'multiselect', 'checkbox', 'textarea', 
  'calculated', 'readonly'
]);

export const validationRuleSchema = z.object({
  type: z.enum(['required', 'min', 'max', 'minLength', 'maxLength', 'pattern', 'custom']),
  value: z.any().optional(),
  message: z.string(),
  severity: z.enum(['error', 'warning', 'info']).default('error'),
});

export const formFieldSchema = z.object({
  id: z.number(),
  schemaId: z.number(),
  fieldKey: z.string(),
  label: z.string(),
  fieldType: fieldTypeSchema,
  isRequired: z.boolean().default(false),
  displayOrder: z.number(),
  parentFieldId: z.number().nullable(),
  categoryId: z.number().nullable(),
  fieldConfig: z.record(z.string(), z.any()).nullable(),
  validationRules: z.array(validationRuleSchema).nullable(),
  computationFormula: z.string().nullable(),
  defaultValue: z.any().nullable(),
  helpText: z.string().nullable(),
  isVisible: z.boolean().default(true),
  isEditable: z.boolean().default(true),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const formSchemaSchema = z.object({
  id: z.number(),
  name: z.string(),
  version: z.string(),
  projectType: z.enum(['HIV', 'Malaria', 'TB']).nullable(),
  facilityType: z.enum(['hospital', 'health_center']).nullable(),
  moduleType: z.enum(['planning', 'execution', 'reporting']),
  isActive: z.boolean(),
  schema: z.record(z.string(), z.any()),
  metadata: z.record(z.string(), z.any()).nullable(),
  createdBy: z.number().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type FormField = z.infer<typeof formFieldSchema>;
export type FormSchema = z.infer<typeof formSchemaSchema>;
export type ValidationRule = z.infer<typeof validationRuleSchema>;
export type FieldType = z.infer<typeof fieldTypeSchema>;

// Validation result types
export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  fieldKey: string;
  message: string;
  severity: 'error' | 'warning' | 'info';
  value?: any;
}

export interface ValidationWarning {
  fieldKey: string;
  message: string;
  value?: any;
}

// Schema validator class
export class SchemaValidator {
  private schema: FormSchema;
  private fields: FormField[];

  constructor(schema: FormSchema, fields: FormField[]) {
    this.schema = schema;
    this.fields = fields;
  }

  /**
   * Validate form data against schema and field rules
   */
  validateFormData(formData: Record<string, any>): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Sort fields by display order
    const sortedFields = [...this.fields].sort((a, b) => a.displayOrder - b.displayOrder);

    for (const field of sortedFields) {
      if (!field.isVisible) continue;

      const value = formData[field.fieldKey];
      const fieldValidation = this.validateField(field, value, formData);

      errors.push(...fieldValidation.errors);
      warnings.push(...fieldValidation.warnings);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Validate a single field
   */
  private validateField(
    field: FormField, 
    value: any, 
    allFormData: Record<string, any>
  ): { errors: ValidationError[]; warnings: ValidationWarning[] } {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Check required fields
    if (field.isRequired && this.isEmpty(value)) {
      errors.push({
        fieldKey: field.fieldKey,
        message: `${field.label} is required`,
        severity: 'error',
        value,
      });
    }

    // Skip further validation if field is empty and not required
    if (this.isEmpty(value) && !field.isRequired) {
      return { errors, warnings };
    }

    // Apply custom validation rules
    if (field.validationRules) {
      for (const rule of field.validationRules) {
        const ruleResult = this.applyValidationRule(rule, value, field, allFormData);
        if (ruleResult) {
          if (rule.severity === 'error') {
            errors.push(ruleResult);
          } else {
            warnings.push({
              fieldKey: field.fieldKey,
              message: ruleResult.message,
              value,
            });
          }
        }
      }
    }

    // Type-specific validation
    const typeValidation = this.validateFieldType(field.fieldType, value, field);
    if (typeValidation) {
      errors.push(typeValidation);
    }

    return { errors, warnings };
  }

  /**
   * Apply a specific validation rule
   */
  private applyValidationRule(
    rule: ValidationRule,
    value: any,
    field: FormField,
    allFormData: Record<string, any>
  ): ValidationError | null {
    switch (rule.type) {
      case 'required':
        if (this.isEmpty(value)) {
          return {
            fieldKey: field.fieldKey,
            message: rule.message || `${field.label} is required`,
            severity: rule.severity,
            value,
          };
        }
        break;

      case 'min':
        if (typeof value === 'number' && value < (rule.value || 0)) {
          return {
            fieldKey: field.fieldKey,
            message: rule.message || `${field.label} must be at least ${rule.value}`,
            severity: rule.severity,
            value,
          };
        }
        break;

      case 'max':
        if (typeof value === 'number' && value > (rule.value || Infinity)) {
          return {
            fieldKey: field.fieldKey,
            message: rule.message || `${field.label} must be at most ${rule.value}`,
            severity: rule.severity,
            value,
          };
        }
        break;

      case 'minLength':
        if (typeof value === 'string' && value.length < (rule.value || 0)) {
          return {
            fieldKey: field.fieldKey,
            message: rule.message || `${field.label} must be at least ${rule.value} characters`,
            severity: rule.severity,
            value,
          };
        }
        break;

      case 'maxLength':
        if (typeof value === 'string' && value.length > (rule.value || Infinity)) {
          return {
            fieldKey: field.fieldKey,
            message: rule.message || `${field.label} must be at most ${rule.value} characters`,
            severity: rule.severity,
            value,
          };
        }
        break;

      case 'pattern':
        if (typeof value === 'string' && rule.value && !new RegExp(rule.value).test(value)) {
          return {
            fieldKey: field.fieldKey,
            message: rule.message || `${field.label} format is invalid`,
            severity: rule.severity,
            value,
          };
        }
        break;

      case 'custom':
        // Custom validation logic can be implemented here
        // For now, we'll skip custom validation
        break;
    }

    return null;
  }

  /**
   * Validate field type-specific constraints
   */
  private validateFieldType(
    fieldType: FieldType,
    value: any,
    field: FormField
  ): ValidationError | null {
    switch (fieldType) {
      case 'number':
      case 'currency':
      case 'percentage':
        if (value !== null && value !== undefined && isNaN(Number(value))) {
          return {
            fieldKey: field.fieldKey,
            message: `${field.label} must be a valid number`,
            severity: 'error',
            value,
          };
        }
        break;

      case 'date':
        if (value && !this.isValidDate(value)) {
          return {
            fieldKey: field.fieldKey,
            message: `${field.label} must be a valid date`,
            severity: 'error',
            value,
          };
        }
        break;

      case 'select':
        if (value && field.fieldConfig?.options && !field.fieldConfig.options.includes(value)) {
          return {
            fieldKey: field.fieldKey,
            message: `${field.label} must be one of the available options`,
            severity: 'error',
            value,
          };
        }
        break;

      case 'multiselect':
        if (value && Array.isArray(value) && field.fieldConfig?.options) {
          const invalidOptions = value.filter(v => !field.fieldConfig.options.includes(v));
          if (invalidOptions.length > 0) {
            return {
              fieldKey: field.fieldKey,
              message: `${field.label} contains invalid options`,
              severity: 'error',
              value,
            };
          }
        }
        break;
    }

    return null;
  }

  /**
   * Check if a value is empty
   */
  private isEmpty(value: any): boolean {
    if (value === null || value === undefined) return true;
    if (typeof value === 'string') return value.trim() === '';
    if (Array.isArray(value)) return value.length === 0;
    return false;
  }

  /**
   * Check if a date string is valid
   */
  private isValidDate(dateString: string): boolean {
    const date = new Date(dateString);
    return date instanceof Date && !isNaN(date.getTime());
  }

  /**
   * Get visible fields based on dependencies
   */
  getVisibleFields(formData: Record<string, any>): FormField[] {
    return this.fields.filter(field => {
      if (!field.isVisible) return false;
      
      // Check field dependencies if any
      if (field.fieldConfig?.dependsOn) {
        const dependency = field.fieldConfig.dependsOn;
        const dependencyValue = formData[dependency.field];
        
        if (dependency.operator === 'equals') {
          return dependencyValue === dependency.value;
        } else if (dependency.operator === 'notEquals') {
          return dependencyValue !== dependency.value;
        } else if (dependency.operator === 'in') {
          return dependency.values?.includes(dependencyValue);
        }
      }
      
      return true;
    }).sort((a, b) => a.displayOrder - b.displayOrder);
  }

  /**
   * Create a Zod schema from the form fields
   */
  createZodSchema(): z.ZodSchema {
    const schemaFields: Record<string, z.ZodTypeAny> = {};

    for (const field of this.fields) {
      if (!field.isVisible) continue;

      let fieldSchema: z.ZodTypeAny;

      switch (field.fieldType) {
        case 'text':
        case 'textarea':
          fieldSchema = z.string();
          break;
        case 'number':
        case 'currency':
        case 'percentage':
          fieldSchema = z.number();
          break;
        case 'date':
          fieldSchema = z.string().datetime();
          break;
        case 'select':
          fieldSchema = z.string();
          break;
        case 'multiselect':
          fieldSchema = z.array(z.string());
          break;
        case 'checkbox':
          fieldSchema = z.boolean();
          break;
        case 'calculated':
        case 'readonly':
          fieldSchema = z.any();
          break;
        default:
          fieldSchema = z.any();
      }

      // Apply required validation
      if (field.isRequired) {
        fieldSchema = fieldSchema;
      } else {
        fieldSchema = fieldSchema.optional();
      }

      schemaFields[field.fieldKey] = fieldSchema;
    }

    return z.object(schemaFields);
  }
}



