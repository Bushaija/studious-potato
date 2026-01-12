import { z } from "@hono/zod-openapi";

export const validationTypeEnum = z.enum([
  'required', 'min', 'max', 'minLength', 'maxLength', 'pattern', 'custom'
]);

export const severityEnum = z.enum(['error', 'warning', 'info']);

// Validation Rule Types
export const validationRuleSchema = z.object({
  type: validationTypeEnum,
  value: z.any().optional(),
  message: z.string(),
  severity: severityEnum.default('error'),
});

// Validation Request Types
export const validateFieldSchema = z.object({
  fieldKey: z.string(),
  value: z.any(),
  fieldType: z.enum([
    'text', 'number', 'currency', 'percentage', 'date', 
    'select', 'multiselect', 'checkbox', 'textarea', 
    'calculated', 'readonly'
  ]),
  validationRules: z.array(validationRuleSchema).optional(),
  required: z.boolean().default(false),
});

export const validateFormSchema = z.object({
  schemaId: z.number().int(),
  formData: z.record(z.string(), z.any()),
  validateComputed: z.boolean().default(true),
  strictMode: z.boolean().default(false),
});

export const validateSchemaDefinitionSchema = z.object({
  schema: z.record(z.string(), z.any()),
  schemaId: z.number().int().optional(),
});

// Validation Result Types
export const validationResultSchema = z.object({
  isValid: z.boolean(),
  errors: z.array(z.object({
    fieldKey: z.string(),
    message: z.string(),
    severity: severityEnum,
    value: z.any().optional(),
  })),
  warnings: z.array(z.object({
    fieldKey: z.string(),
    message: z.string(),
    value: z.any().optional(),
  })),
  computedValues: z.record(z.string(), z.any()).optional(),
});

export const schemaValidationResultSchema = z.object({
  isValid: z.boolean(),
  errors: z.array(z.object({
    path: z.string(),
    message: z.string(),
    code: z.string(),
  })),
  warnings: z.array(z.object({
    path: z.string(),
    message: z.string(),
    suggestion: z.string().optional(),
  })),
});

// Bulk validation types
export const bulkValidateSchema = z.object({
  validations: z.array(z.object({
    id: z.string(),
    schemaId: z.number().int(),
    formData: z.record(z.string(), z.any()),
  })),
  stopOnFirstError: z.boolean().default(false),
});
