import { z } from "@hono/zod-openapi";

export const formFieldTypeEnum = z.enum([
  'text', 'number', 'currency', 'percentage', 'date', 
  'select', 'multiselect', 'checkbox', 'textarea', 
  'calculated', 'readonly'
]);

// Form Field Types
export const insertFormFieldSchema = z.object({
  schemaId: z.number().int(),
  fieldKey: z.string().min(1).max(100),
  label: z.string().min(1).max(200),
  fieldType: formFieldTypeEnum,
  isRequired: z.boolean().default(false),
  displayOrder: z.number().int(),
  parentFieldId: z.number().int().optional(),
  categoryId: z.number().int().optional(),
  fieldConfig: z.record(z.string(), z.any()).optional(),
  validationRules: z.record(z.string(), z.any()).optional(),
  computationFormula: z.string().optional(),
  defaultValue: z.any().optional(),
  helpText: z.string().optional(),
  isVisible: z.boolean().default(true),
  isEditable: z.boolean().default(true),
});

export const selectFormFieldSchema = z.object({
  id: z.number().int(),
  schemaId: z.number().int(),
  fieldKey: z.string(),
  label: z.string(),
  fieldType: formFieldTypeEnum,
  isRequired: z.boolean(),
  displayOrder: z.number().int(),
  parentFieldId: z.number().int().nullable(),
  categoryId: z.number().int().nullable(),
  fieldConfig: z.record(z.string(), z.any()).nullable(),
  validationRules: z.record(z.string(), z.any()).nullable(),
  computationFormula: z.string().nullable(),
  defaultValue: z.any().nullable(),
  helpText: z.string().nullable(),
  isVisible: z.boolean(),
  isEditable: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const patchFormFieldSchema = insertFormFieldSchema.partial();

// Bulk operations
export const bulkInsertFormFieldSchema = z.object({
  fields: z.array(insertFormFieldSchema),
});

export const bulkUpdateFormFieldSchema = z.object({
  fields: z.array(z.object({
    id: z.number().int(),
    data: patchFormFieldSchema,
  })),
});

export const reorderFieldsSchema = z.object({
  fieldOrders: z.array(z.object({
    id: z.number().int(),
    displayOrder: z.number().int(),
  })),
});
