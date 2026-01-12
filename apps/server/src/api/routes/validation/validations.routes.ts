import { createRoute, z } from "@hono/zod-openapi";
import * as HttpStatusCodes from "stoker/http-status-codes";
import { jsonContent, jsonContentRequired } from "stoker/openapi/helpers";
import { IdParamsSchema } from "stoker/openapi/schemas";
import { 
  validateFieldSchema,
  validateFormSchema,
  validateSchemaDefinitionSchema,
  validationResultSchema,
  schemaValidationResultSchema,
  bulkValidateSchema
} from "./validation.types";
import { notFoundSchema } from "@/api/lib/constants";

const tags = ["validation"];

export const validateField = createRoute({
  path: "/validation/field",
  method: "post",
  tags,
  request: {
    body: jsonContentRequired(validateFieldSchema, "Field validation data"),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      validationResultSchema,
      "Field validation result"
    ),
    [HttpStatusCodes.BAD_REQUEST]: jsonContent(
      z.object({
        error: z.string(),
        message: z.string(),
      }),
      "Invalid validation request"
    ),
  },
});

export const validateForm = createRoute({
  path: "/validation/form",
  method: "post",
  tags,
  request: {
    body: jsonContentRequired(validateFormSchema, "Form validation data"),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      validationResultSchema,
      "Form validation result"
    ),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(
      notFoundSchema,
      "Schema not found"
    ),
    [HttpStatusCodes.BAD_REQUEST]: jsonContent(
      z.object({
        error: z.string(),
        message: z.string(),
      }),
      "Invalid validation request"
    ),
  },
});

export const validateSchema = createRoute({
  path: "/validation/schema",
  method: "post",
  tags,
  request: {
    body: jsonContentRequired(validateSchemaDefinitionSchema, "Schema definition to validate"),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      schemaValidationResultSchema,
      "Schema validation result"
    ),
    [HttpStatusCodes.BAD_REQUEST]: jsonContent(
      z.object({
        error: z.string(),
        message: z.string(),
      }),
      "Invalid schema definition"
    ),
  },
});

export const bulkValidate = createRoute({
  path: "/validation/bulk",
  method: "post",
  tags,
  request: {
    body: jsonContentRequired(bulkValidateSchema, "Bulk validation data"),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      z.object({
        results: z.array(z.object({
          id: z.string(),
          validation: validationResultSchema,
        })),
        summary: z.object({
          total: z.number(),
          valid: z.number(),
          invalid: z.number(),
          warnings: z.number(),
        }),
      }),
      "Bulk validation results"
    ),
    [HttpStatusCodes.BAD_REQUEST]: jsonContent(
      z.object({
        error: z.string(),
        message: z.string(),
      }),
      "Invalid bulk validation request"
    ),
  },
});

export const getValidationRules = createRoute({
  path: "/validation/rules/{schemaId}",
  method: "get",
  tags,
  request: {
    params: z.object({
      schemaId: z.string().regex(/^\d+$/).transform(Number),
    }),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      z.object({
        schemaId: z.number(),
        rules: z.record(z.string(), z.any()),
        computedFields: z.array(z.string()),
        requiredFields: z.array(z.string()),
      }),
      "Validation rules for schema"
    ),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(
      notFoundSchema,
      "Schema not found"
    ),
  },
});

export const validateComputation = createRoute({
  path: "/validation/computation",
  method: "post",
  tags,
  request: {
    body: jsonContentRequired(z.object({
      formula: z.string(),
      context: z.record(z.string(), z.any()),
      fieldType: z.string().optional(),
    }), "Computation validation data"),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      z.object({
        isValid: z.boolean(),
        result: z.any().optional(),
        error: z.string().optional(),
        dependencies: z.array(z.string()),
      }),
      "Computation validation result"
    ),
    [HttpStatusCodes.BAD_REQUEST]: jsonContent(
      z.object({
        error: z.string(),
        message: z.string(),
      }),
      "Invalid computation"
    ),
  },
});

export type ValidateFieldRoute = typeof validateField;
export type ValidateFormRoute = typeof validateForm;
export type ValidateSchemaRoute = typeof validateSchema;
export type BulkValidateRoute = typeof bulkValidate;
export type GetValidationRulesRoute = typeof getValidationRules;
export type ValidateComputationRoute = typeof validateComputation;
