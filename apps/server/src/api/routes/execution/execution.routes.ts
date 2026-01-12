import { createRoute, z } from "@hono/zod-openapi";
import * as HttpStatusCodes from "stoker/http-status-codes";
import { jsonContent, jsonContentRequired } from "stoker/openapi/helpers";
import { IdParamsSchema } from "stoker/openapi/schemas";
import {
  selectExecutionDataSchema,
  selectExecutionDataWithDistrictSchema,
  insertExecutionDataSchema,
  patchExecutionDataSchema,
  executionListQuerySchema,
  calculateBalancesSchema,
  balancesResponseSchema,
  accountingEquationValidationSchema,
  compiledExecutionQuerySchema,
  compiledExecutionResponseSchema,
  enhancedExecutionResponseSchema
} from "./execution.types";
import { notFoundSchema } from "@/api/lib/constants";

const tags = ["execution"];

export const list = createRoute({
  path: "/execution",
  method: "get",
  tags,
  summary: "List execution data entries",
  description: "Retrieves a paginated list of execution data entries with enhanced quarter rollover information. Each entry includes previous quarter closing balances for Section D (Financial Assets) and Section E (Financial Liabilities), and quarter navigation metadata. Admin users can filter by district and will receive district information in the response. Non-admin users are restricted to their assigned facilities and will not see district information.",
  request: {
    query: executionListQuerySchema,
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      z.object({
        data: z.array(
          enhancedExecutionResponseSchema.extend({
            entry: selectExecutionDataWithDistrictSchema,
          })
        ).describe("Array of execution data entries with previous quarter balances and quarter sequence metadata"),
        pagination: z.object({
          page: z.string().describe("Current page number"),
          limit: z.string().describe("Number of items per page"),
          total: z.number().describe("Total number of items"),
          totalPages: z.number().describe("Total number of pages"),
        }),
        filters: z.object({
          facilityType: z.string().optional().describe("Applied facility type filter"),
          projectType: z.string().optional().describe("Applied project type filter"),
          reportingPeriod: z.string().optional().describe("Applied reporting period filter"),
          quarter: z.string().optional().describe("Applied quarter filter"),
          district: z.string().optional().describe("Applied district filter (admin users only)"),
        }).optional().describe("Applied filters in the current request"),
      }),
      "List of execution data entries with previous quarter balances, quarter sequence metadata, and applied filters. District information and filtering are only available for admin users."
    ),
    [HttpStatusCodes.BAD_REQUEST]: jsonContent(
      z.object({
        message: z.string().describe("Error message describing the validation failure"),
      }),
      "Invalid query parameters, such as invalid district ID for admin users"
    ),
  },
});

export const getOne = createRoute({
  path: "/execution/{id}",
  method: "get",
  tags,
  summary: "Get execution data by ID",
  description: "Retrieves a single execution data entry with enhanced quarter rollover information. Includes previous quarter closing balances for Section D (Financial Assets) and Section E (Financial Liabilities), and quarter navigation metadata.",
  request: {
    params: IdParamsSchema,
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      enhancedExecutionResponseSchema,
      "Execution data entry with previous quarter balances and quarter sequence metadata"
    ),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(
      notFoundSchema,
      "Execution data not found"
    ),
  },
});

export const create = createRoute({
  path: "/execution",
  method: "post",
  tags,
  summary: "Create new execution data",
  description: "Creates a new execution data entry. The response includes previous quarter closing balances if the created quarter is Q2, Q3, or Q4 and the previous quarter exists. This enables automatic balance rollover for financial continuity.",
  request: {
    body: jsonContentRequired(insertExecutionDataSchema, "Execution data to create"),
  },
  responses: {
    [HttpStatusCodes.CREATED]: jsonContent(
      enhancedExecutionResponseSchema,
      "Created execution data with previous quarter balances and quarter sequence metadata"
    ),
    [HttpStatusCodes.BAD_REQUEST]: jsonContent(
      z.object({ message: z.string() }),
      "Validation error"
    ),
  },
});

export const update = createRoute({
  path: "/execution/{id}",
  method: "put",
  tags,
  summary: "Update execution data",
  description: "Updates an existing execution data entry. The response includes previous quarter closing balances and quarter sequence metadata. Note: Updating a quarter may affect subsequent quarters' opening balances, triggering cascade recalculation.",
  request: {
    params: IdParamsSchema,
    body: jsonContentRequired(patchExecutionDataSchema, "Execution data updates"),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      enhancedExecutionResponseSchema,
      "Updated execution data with previous quarter balances and quarter sequence metadata"
    ),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(
      notFoundSchema,
      "Execution data not found"
    ),
  },
});

export const remove = createRoute({
  path: "/execution/{id}",
  method: "delete",
  tags,
  request: {
    params: IdParamsSchema,
  },
  responses: {
    [HttpStatusCodes.NO_CONTENT]: {
      description: "Execution data deleted successfully",
    },
    [HttpStatusCodes.NOT_FOUND]: jsonContent(
      notFoundSchema,
      "Execution data not found"
    ),
  },
});

export const calculateBalances = createRoute({
  path: "/execution/calculate-balances",
  method: "post",
  tags,
  request: {
    body: jsonContentRequired(calculateBalancesSchema, "Data for balance calculation"),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      balancesResponseSchema,
      "Calculated balances"
    ),
  },
});

export const validateAccountingEquation = createRoute({
  path: "/execution/validate-accounting-equation",
  method: "post",
  tags,
  request: {
    body: jsonContentRequired(accountingEquationValidationSchema, "Data to validate"),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      z.object({
        isValid: z.boolean(),
        netFinancialAssets: z.number(),
        closingBalance: z.number(),
        difference: z.number(),
        errors: z.array(z.object({
          field: z.string(),
          message: z.string(),
          code: z.string(),
        })),
      }),
      "Accounting equation validation results"
    ),
  },
});

export const quarterlySummary = createRoute({
  path: "/execution/quarterly-summary",
  method: "get",
  tags,
  request: {
    query: z.object({
      projectId: z.coerce.number().int(),
      facilityId: z.coerce.number().int(),
      year: z.coerce.number().int(),
    }),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      z.object({
        quarters: z.record(z.string(), z.object({
          totalReceipts: z.number(),
          totalExpenditures: z.number(),
          surplus: z.number(),
          netFinancialAssets: z.number(),
          closingBalance: z.number(),
          isBalanced: z.boolean(),
        })),
        yearToDate: z.object({
          totalReceipts: z.number(),
          totalExpenditures: z.number(),
          cumulativeSurplus: z.number(),
          finalClosingBalance: z.number(),
        }),
      }),
      "Quarterly execution summary"
    ),
  },
});

export const getActivities = createRoute({
  path: "/execution/activities",
  method: "get",
  tags,
  request: {
    query: z.object({
      projectType: z.enum(['HIV', 'Malaria', 'TB']).optional(),
      facilityType: z.enum(['hospital', 'health_center']).optional(),
    }),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      z.object({
        data: z.object({
          A: z.object({
            label: z.string(),
            code: z.string(),
            displayOrder: z.number(),
            isComputed: z.boolean().default(false),
            items: z.array(z.object({
              id: z.number(),
              name: z.string(),
              code: z.string(),
              displayOrder: z.number(),
              isTotalRow: z.boolean(),
              isComputed: z.boolean().optional(),
              computationFormula: z.string().optional(),
            })),
          }),
          B: z.object({
            label: z.string(),
            code: z.string(),
            displayOrder: z.number(),
            isComputed: z.boolean().default(false),
            subCategories: z.record(z.string(), z.object({
              label: z.string(),
              code: z.string(),
              displayOrder: z.number(),
              items: z.array(z.object({
                id: z.number(),
                name: z.string(),
                code: z.string(),
                displayOrder: z.number(),
                isTotalRow: z.boolean(),
              })),
            })),
          }),
          C: z.object({
            label: z.string(),
            code: z.string(),
            displayOrder: z.number(),
            isComputed: z.boolean().default(true),
            computationFormula: z.string().optional(),
          }),
          D: z.object({
            label: z.string(),
            code: z.string(),
            displayOrder: z.number(),
            isComputed: z.boolean().default(false),
            items: z.array(z.object({
              id: z.number(),
              name: z.string(),
              code: z.string(),
              displayOrder: z.number(),
              isTotalRow: z.boolean(),
              isComputed: z.boolean().optional(),
              computationFormula: z.string().optional(),
            })),
          }),
          E: z.object({
            label: z.string(),
            code: z.string(),
            displayOrder: z.number(),
            isComputed: z.boolean().default(false),
            items: z.array(z.object({
              id: z.number(),
              name: z.string(),
              code: z.string(),
              displayOrder: z.number(),
              isTotalRow: z.boolean(),
              isComputed: z.boolean().optional(),
              computationFormula: z.string().optional(),
            })),
          }),
          F: z.object({
            label: z.string(),
            code: z.string(),
            displayOrder: z.number(),
            isComputed: z.boolean().default(true),
            computationFormula: z.string().optional(),
          }),
          G: z.object({
            label: z.string(),
            code: z.string(),
            displayOrder: z.number(),
            isComputed: z.boolean().default(false),
            items: z.array(z.object({
              id: z.number(),
              name: z.string(),
              code: z.string(),
              displayOrder: z.number(),
              isTotalRow: z.boolean(),
              isComputed: z.boolean().optional(),
              computationFormula: z.string().optional(),
            })),
          }),
        }),
        meta: z.object({
          projectType: z.string(),
          facilityType: z.string(),
          moduleType: z.string(),
          count: z.number(),
        }),
      }),
      "Hierarchical execution activities structure"
    ),
  },
});

export const getFormSchema = createRoute({
  path: "/execution/schema",
  method: "get",
  tags,
  request: {
    query: z.object({
      projectType: z.enum(['HIV', 'Malaria', 'TB']).optional(),
      facilityType: z.enum(['hospital', 'health_center']).optional(),
    }),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      z.object({
        data: z.object({
          id: z.number(),
          name: z.string(),
          version: z.string(),
          schema: z.any(),
          metadata: z.any(),
        }),
      }),
      "Execution form schema"
    ),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(
      notFoundSchema,
      "Execution form schema not found"
    ),
  },
});

export const checkExisting = createRoute({
  path: "/execution/check-existing",
  method: "get",
  tags,
  request: {
    query: z.object({
      projectId: z.coerce.number().int(),
      facilityId: z.coerce.number().int(),
      reportingPeriodId: z.coerce.number().int().optional(),
      schemaId: z.coerce.number().int().optional(),
    }),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      z.object({
        exists: z.boolean(),
        data: selectExecutionDataSchema.nullable(),
        message: z.string(),
      }),
      "Check if execution data exists for the given parameters"
    ),
  },
});

export const compiled = createRoute({
  path: "/execution/compiled",
  method: "get",
  tags,
  summary: "Get compiled execution data",
  description: "Aggregates execution data across multiple facilities with hierarchical activity structure. Supports filtering by project type, facility type, reporting period, and quarter.",
  request: {
    query: compiledExecutionQuerySchema,
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      compiledExecutionResponseSchema,
      "Compiled execution data aggregated across multiple facilities with hierarchical activity structure"
    ),
    [HttpStatusCodes.BAD_REQUEST]: jsonContent(
      z.object({
        message: z.string().describe("Error message describing the validation failure"),
        errors: z.array(z.object({
          field: z.string().describe("Field that failed validation"),
          message: z.string().describe("Specific validation error message"),
          code: z.string().describe("Error code for programmatic handling"),
        })).optional().describe("Array of specific validation errors"),
      }),
      "Invalid query parameters or validation errors"
    ),
    [HttpStatusCodes.INTERNAL_SERVER_ERROR]: jsonContent(
      z.object({
        message: z.string().describe("General error message"),
        error: z.string().optional().describe("Detailed error information for debugging"),
      }),
      "Server error during data aggregation or processing"
    ),
  },
});


export type ListRoute = typeof list;
export type GetOneRoute = typeof getOne;
export type CreateRoute = typeof create;
export type UpdateRoute = typeof update;
export type RemoveRoute = typeof remove;
export type CalculateBalancesRoute = typeof calculateBalances;
export type ValidateAccountingEquationRoute = typeof validateAccountingEquation;
export type QuarterlySummaryRoute = typeof quarterlySummary;
export type GetActivitiesRoute = typeof getActivities;
export type GetFormSchemaRoute = typeof getFormSchema;
export type CheckExistingRoute = typeof checkExisting;
export type CompiledRoute = typeof compiled;