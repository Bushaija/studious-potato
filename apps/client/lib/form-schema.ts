import { z } from "zod";
import { products, tasks } from "@/server/db/schema/demo/schema";

// Field types supported by the dynamic form
export type FieldType = 
  | "text" 
  | "email" 
  | "password" 
  | "number" 
  | "textarea" 
  | "select" 
  | "multiselect"
  | "checkbox" 
  | "date" 
  | "datetime"
  | "switch"
  | "radio";

// Form modes
export type FormMode = "create" | "edit" | "details";

// Layout preferences
export type FormLayout = "modal" | "page" | "auto";

// Field configuration interface
export interface FieldConfig {
  name: string;
  type: FieldType;
  label: string;
  placeholder?: string;
  description?: string;
  required?: boolean;
  disabled?: boolean;
  hidden?: boolean;
  // For select/multiselect fields
  options?: Array<{ value: string; label: string }>;
  // For number fields
  min?: number;
  max?: number;
  step?: number;
  // For text fields
  minLength?: number;
  maxLength?: number;
  // For textarea
  rows?: number;
  // Grid layout
  colSpan?: 1 | 2 | 3 | 4 | 5 | 6 | 12;
  // Conditional visibility
  dependsOn?: string;
  showWhen?: (values: Record<string, any>) => boolean;
  // Custom validation
  validate?: (value: any) => string | undefined;
}

// Form schema configuration
export interface FormSchemaConfig {
  // Form metadata
  title: string;
  description?: string;
  mode: FormMode;
  layout?: FormLayout;
  
  // Field configuration
  fields: FieldConfig[];
  
  // Layout settings
  maxFieldsForModal?: number; // Default: 5
  columns?: 1 | 2 | 3 | 4;
  
  // Actions
  submitText?: string;
  cancelText?: string;
  showCancel?: boolean;
  
  // Custom styling
  className?: string;
}

// Predefined field configurations for common schemas
export const productFields: FieldConfig[] = [
  {
    name: "name",
    type: "text",
    label: "Product Name",
    placeholder: "Enter product name",
    required: true,
    colSpan: 2,
    minLength: 1,
    maxLength: 255,
  },
  {
    name: "category",
    type: "select",
    label: "Category",
    required: true,
    colSpan: 1,
    options: products.category.enumValues.map(value => ({
      value,
      label: value.charAt(0).toUpperCase() + value.slice(1)
    })),
  },
  {
    name: "status",
    type: "select",
    label: "Status",
    required: true,
    colSpan: 1,
    options: products.status.enumValues.map(value => ({
      value,
      label: value.charAt(0).toUpperCase() + value.slice(1)
    })),
  },
  {
    name: "price",
    type: "number",
    label: "Price",
    placeholder: "0.00",
    required: true,
    colSpan: 1,
    min: 0,
    step: 0.01,
  },
  {
    name: "stock",
    type: "number",
    label: "Stock",
    placeholder: "0",
    required: true,
    colSpan: 1,
    min: 0,
    step: 1,
  },
];

export const taskFields: FieldConfig[] = [
  {
    name: "title",
    type: "text",
    label: "Task Title",
    placeholder: "Enter task title",
    required: true,
    colSpan: 2,
    minLength: 1,
    maxLength: 128,
  },
  {
    name: "label",
    type: "select",
    label: "Label",
    required: true,
    colSpan: 1,
    options: tasks.label.enumValues.map(value => ({
      value,
      label: value.charAt(0).toUpperCase() + value.slice(1)
    })),
  },
  {
    name: "status",
    type: "select",
    label: "Status",
    required: true,
    colSpan: 1,
    options: tasks.status.enumValues.map(value => ({
      value,
      label: value.charAt(0).toUpperCase() + value.slice(1)
    })),
  },
  {
    name: "priority",
    type: "select",
    label: "Priority",
    required: true,
    colSpan: 1,
    options: tasks.priority.enumValues.map(value => ({
      value,
      label: value.charAt(0).toUpperCase() + value.slice(1)
    })),
  },
  {
    name: "estimatedHours",
    type: "number",
    label: "Estimated Hours",
    placeholder: "0",
    colSpan: 1,
    min: 0,
    step: 0.5,
  },
];

// Helper function to determine if form should be modal or page
export function shouldUseModal(
  fieldCount: number, 
  maxFieldsForModal: number = 5,
  layout?: FormLayout
): boolean {
  if (layout === "modal") return true;
  if (layout === "page") return false;
  return fieldCount <= maxFieldsForModal;
}

// Helper function to create form schema from config
export function createFormSchema(fields: FieldConfig[]) {
  const schemaObject: Record<string, z.ZodTypeAny> = {};
  
  fields.forEach(field => {
    let fieldSchema: z.ZodTypeAny;
    
    switch (field.type) {
      case "text":
      case "email":
      case "password":
        fieldSchema = z.string();
        if (field.minLength) fieldSchema = fieldSchema.min(field.minLength);
        if (field.maxLength) fieldSchema = fieldSchema.max(field.maxLength);
        break;
      case "number":
        fieldSchema = z.coerce.number();
        if (field.min !== undefined) fieldSchema = fieldSchema.min(field.min);
        if (field.max !== undefined) fieldSchema = fieldSchema.max(field.max);
        break;
      case "textarea":
        fieldSchema = z.string();
        if (field.minLength) fieldSchema = fieldSchema.min(field.minLength);
        if (field.maxLength) fieldSchema = fieldSchema.max(field.maxLength);
        break;
      case "select":
      case "multiselect":
        fieldSchema = field.options ? z.enum(field.options.map(opt => opt.value) as [string, ...string[]]) : z.string();
        break;
      case "checkbox":
      case "switch":
        fieldSchema = z.boolean();
        break;
      case "date":
      case "datetime":
        fieldSchema = z.string().datetime();
        break;
      default:
        fieldSchema = z.string();
    }
    
    if (!field.required) {
      fieldSchema = fieldSchema.optional();
    }
    
    schemaObject[field.name] = fieldSchema;
  });
  
  return z.object(schemaObject);
}
