import { createRoute, z } from "@hono/zod-openapi";
import * as HttpStatusCodes from "stoker/http-status-codes";
import { jsonContent, jsonContentRequired } from "stoker/openapi/helpers";
import { IdParamsSchema } from "stoker/openapi/schemas";
import {
  selectPlanningDataSchema,
  selectPlanningDataWithDistrictSchema,
  insertPlanningDataSchema,
  patchPlanningDataSchema,
  planningListQuerySchema,
  calculatePlanningTotalsSchema,
  planningTotalsResponseSchema,
  validatePlanningDataSchema,
  bulkReviewPlanningSchema,
  reviewPlanningSchema,
  submitForApprovalSchema,
  uploadPlanningFileSchema
} from "./planning.types";
import { notFoundSchema } from "@/api/lib/constants";

const tags = ["planning"];

export const list = createRoute({
  path: "/planning",
  method: "get",
  tags,
  summary: "List planning data entries",
  description: "Retrieves a paginated list of planning data entries. Admin users can filter by district and will receive district information in the response. Non-admin users are restricted to their assigned facilities and will not see district information.",
  request: {
    query: planningListQuerySchema,
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      z.object({
        data: z.array(selectPlanningDataWithDistrictSchema),
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
          approvalStatus: z.string().optional().describe("Applied approval status filter"),
          district: z.string().optional().describe("Applied district filter (admin users only)"),
        }).optional().describe("Applied filters in the current request"),
      }),
      "List of planning data entries with applied filters. District information and filtering are only available for admin users."
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
  path: "/planning/{id}",
  method: "get",
  tags,
  request: {
    params: IdParamsSchema,
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      selectPlanningDataSchema,
      "Planning data entry"
    ),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(
      notFoundSchema,
      "Planning data not found"
    ),
  },
});

export const create = createRoute({
  path: "/planning",
  method: "post",
  tags,
  request: {
    body: jsonContentRequired(insertPlanningDataSchema, "Planning data to create"),
  },
  responses: {
    [HttpStatusCodes.CREATED]: jsonContent(
      selectPlanningDataSchema,
      "Created planning data"
    ),
    [HttpStatusCodes.BAD_REQUEST]: jsonContent(
      z.object({ message: z.string() }),
      "Validation error"
    ),
  },
});

export const update = createRoute({
  path: "/planning/{id}",
  method: "put",
  tags,
  request: {
    params: IdParamsSchema,
    body: jsonContentRequired(patchPlanningDataSchema, "Planning data updates"),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      selectPlanningDataSchema,
      "Updated planning data"
    ),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(
      notFoundSchema,
      "Planning data not found"
    ),
  },
});

export const remove = createRoute({
  path: "/planning/{id}",
  method: "delete",
  tags,
  request: {
    params: IdParamsSchema,
  },
  responses: {
    [HttpStatusCodes.NO_CONTENT]: {
      description: "Planning data deleted successfully",
    },
    [HttpStatusCodes.NOT_FOUND]: jsonContent(
      notFoundSchema,
      "Planning data not found"
    ),
  },
});

export const calculateTotals = createRoute({
  path: "/planning/calculate-totals",
  method: "post",
  tags,
  request: {
    body: jsonContentRequired(calculatePlanningTotalsSchema, "Data for calculation"),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      planningTotalsResponseSchema,
      "Calculated planning totals"
    ),
  },
});

export const validate = createRoute({
  path: "/planning/validate",
  method: "post",
  tags,
  request: {
    body: jsonContentRequired(validatePlanningDataSchema, "Data to validate"),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      z.object({
        isValid: z.boolean(),
        errors: z.array(z.object({
          field: z.string(),
          message: z.string(),
          code: z.string(),
        })),
        computedValues: z.record(z.string(), z.any()),
      }),
      "Validation results"
    ),
  },
});

export const getActivities = createRoute({
  path: "/planning/activities",
  method: "get",
  tags,
  request: {
    query: z.object({
      projectType: z.enum(['HIV', 'Malaria', 'TB']),
      facilityType: z.enum(['hospital', 'health_center']),
    }),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      z.object({
        data: z.array(z.object({
          id: z.number(),
          name: z.string(),
          code: z.string(),
          activityType: z.string(),
          displayOrder: z.number(),
          isAnnualOnly: z.boolean(),
          isTotalRow: z.boolean(),
          categoryId: z.number(),
          categoryName: z.string(),
          categoryCode: z.string(),
          categoryDisplayOrder: z.number(),
        })),
      }),
      "List of planning activities"
    ),
  },
});

export const getFormSchema = createRoute({
  path: "/planning/schema",
  method: "get",
  tags,
  request: {
    query: z.object({
      projectType: z.enum(['HIV', 'Malaria', 'TB']),
      facilityType: z.enum(['hospital', 'health_center']),
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
      "Planning form schema"
    ),
  },
});

export const getDataSummary = createRoute({
  path: "/planning/summary",
  method: "get",
  tags,
  request: {
    query: z.object({
      projectId: z.string(),
      facilityId: z.string(),
      reportingPeriodId: z.string().optional(),
    }),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      z.object({
        data: z.array(z.object({
          id: z.number(),
          entityId: z.number(),
          formData: z.any(),
          computedValues: z.any(),
          metadata: z.any(),
          activityName: z.string(),
          activityCode: z.string(),
          categoryName: z.string(),
          categoryCode: z.string(),
        })),
      }),
      "Planning data summary"
    ),
  },
});

export const uploadFile = createRoute({
  path: "/planning/upload",
  method: "post",
  tags,
  request: {
    body: jsonContentRequired(uploadPlanningFileSchema, "File data for planning upload"),
  },
  responses: {
    [HttpStatusCodes.CREATED]: jsonContent(
      z.object({
        success: z.boolean(),
        message: z.string(),
        planningId: z.number().optional(),
        stats: z.object({
          rowsParsed: z.number(),
          validRows: z.number(),
          invalidRows: z.number(),
          activitiesProcessed: z.number(),
          totalBudget: z.number(),
          warnings: z.array(z.object({
            id: z.number(),
            row: z.number().nullable(),
            type: z.literal('warning'),
            message: z.string(),
            category: z.string()
          })),
          errors: z.array(z.object({
            id: z.number(),
            row: z.number().nullable(),
            type: z.literal('error'),
            message: z.string(),
            category: z.string()
          })),
          warningCount: z.number(),
          errorCount: z.number(),
          hasIssues: z.boolean(),
          dataQuality: z.object({
            score: z.number(),
            grade: z.string(),
            issues: z.array(z.string())
          })
        }),
        record: z.object({
          id: z.number(),
          facilityId: z.number(),
          projectId: z.number(),
          reportingPeriodId: z.number(),
          approvalStatus: z.string(),
          createdAt: z.string().optional(),
          updatedAt: z.string().optional(),
          operation: z.enum(['create', 'update']),
          previousStatus: z.string().nullable(),
          facility: z.object({
            id: z.number(),
            name: z.string(),
            facilityType: z.string()
          }).nullable(),
          project: z.object({
            id: z.number(),
            name: z.string(),
            projectType: z.string()
          }).nullable(),
          reportingPeriod: z.object({
            id: z.number(),
            year: z.number(),
            startDate: z.string(),
            endDate: z.string()
          }).nullable()
        }).nullable(),
        processing: z.object({
          fileName: z.string(),
          uploadedAt: z.string(),
          uploadedBy: z.number().nullable(),
          processingTimeMs: z.number(),
          version: z.string()
        })
      }),
      "File uploaded and parsed successfully"
    ),
    [HttpStatusCodes.BAD_REQUEST]: jsonContent(
      z.object({
        success: z.boolean(),
        message: z.string(),
        planningId: z.number().nullable(),
        stats: z.object({
          rowsParsed: z.number(),
          validRows: z.number(),
          invalidRows: z.number(),
          activitiesProcessed: z.number(),
          totalBudget: z.number(),
          warnings: z.array(z.any()),
          errors: z.array(z.object({
            id: z.number(),
            row: z.number().nullable(),
            type: z.string(),
            message: z.string(),
            category: z.string()
          })),
          warningCount: z.number(),
          errorCount: z.number(),
          hasIssues: z.boolean(),
          dataQuality: z.object({
            score: z.number(),
            grade: z.string(),
            issues: z.array(z.string())
          })
        }),
        record: z.null(),
        processing: z.object({
          fileName: z.string(),
          uploadedAt: z.string(),
          uploadedBy: z.number().nullable(),
          processingTimeMs: z.number(),
          version: z.string()
        })
      }),
      "File parsing failed"
    ),
  },
});

// DOWNLOAD TEMPLATE ROUTE
export const downloadTemplate = createRoute({
  path: "/planning/template",
  method: "get",
  tags,
  request: {
    query: z.object({
      projectType: z.enum(['HIV', 'Malaria', 'TB']),
      facilityType: z.enum(['hospital', 'health_center']),
      format: z.enum(['csv', 'xlsx']).default('xlsx'),
    }),
  },
  responses: {
    [HttpStatusCodes.OK]: {
      description: "Planning template file",
      content: {
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': {
          schema: { type: 'string', format: 'binary' }
        },
        'text/csv': {
          schema: { type: 'string' }
        }
      }
    },
  },
});

// SUBMIT FOR APPROVAL
export const submitForApproval = createRoute({
  path: "/planning/submit-for-approval",
  method: "post",
  tags,
  request: {
    body: jsonContentRequired(submitForApprovalSchema, "Planning IDs to submit for approval"),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      z.object({
        success: z.boolean(),
        message: z.string(),
        updatedCount: z.number(),
      }),
      "Plans submitted for approval"
    ),
  },
});

// APPROVE/REJECT PLANNING
export const reviewPlanning = createRoute({
  path: "/planning/review",
  method: "post",
  tags,
  request: {
    body: jsonContentRequired(reviewPlanningSchema, "Review action for planning"),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      z.object({
        success: z.boolean(),
        message: z.string(),
        data: selectPlanningDataSchema,
      }),
      "Planning reviewed successfully"
    ),
    [HttpStatusCodes.FORBIDDEN]: jsonContent(
      z.object({ message: z.string() }),
      "Insufficient permissions"
    ),
  },
});

// BULK APPROVE/REJECT
export const bulkReviewPlanning = createRoute({
  path: "/planning/bulk-review",
  method: "post",
  tags,
  request: {
    body: jsonContentRequired(bulkReviewPlanningSchema, "Bulk review action for multiple plans"),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      z.object({
        success: z.boolean(),
        message: z.string(),
        updatedCount: z.number(),
        results: z.array(z.object({
          planningId: z.number(),
          success: z.boolean(),
          error: z.string().optional(),
        })),
      }),
      "Bulk review completed"
    ),
  },
});

// APPROVE/REJECT PLANNING - NEW DEDICATED ENDPOINT
export const approvePlanning = createRoute({
  path: "/planning/approve",
  method: "post",
  tags,
  request: {
    body: jsonContentRequired(
      z.object({
        planningId: z.number().int(),
        action: z.enum(['APPROVE', 'REJECT']),
        comments: z.string().optional(),
      }),
      "Approval action for planning"
    ),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      z.object({
        success: z.boolean(),
        message: z.string(),
        record: z.object({
          id: z.number(),
          approvalStatus: z.string(),
          reviewedBy: z.number().nullable(),
          reviewedByName: z.string().nullable(),
          reviewedAt: z.string().nullable(),
          reviewComments: z.string().nullable(),
        }),
      }),
      "Planning approval result"
    ),
    [HttpStatusCodes.BAD_REQUEST]: jsonContent(
      z.object({
        success: z.boolean(),
        message: z.string(),
        code: z.string().optional(),
      }),
      "Validation error or invalid request"
    ),
    [HttpStatusCodes.FORBIDDEN]: jsonContent(
      z.object({
        success: z.boolean(),
        message: z.string(),
      }),
      "Insufficient permissions"
    ),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(
      z.object({
        success: z.boolean(),
        message: z.string(),
      }),
      "Planning not found"
    ),
  },
});

// GET APPROVAL HISTORY
export const getApprovalHistory = createRoute({
  path: "/planning/{id}/approval-history",
  method: "get",
  tags,
  request: {
    params: z.object({
      id: z.string(),
    }),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      z.object({
        planningId: z.number(),
        currentStatus: z.string(),
        history: z.array(z.object({
          status: z.string(),
          reviewedBy: z.object({
            id: z.number(),
            name: z.string(),
            email: z.string(),
          }).nullable(),
          reviewedAt: z.string().nullable(),
          comments: z.string().nullable(),
        })),
      }),
      "Approval history"
    ),
  },
});

export type ListRoute = typeof list;
export type GetOneRoute = typeof getOne;
export type CreateRoute = typeof create;
export type UpdateRoute = typeof update;
export type RemoveRoute = typeof remove;
export type CalculateTotalsRoute = typeof calculateTotals;
export type ValidateRoute = typeof validate;
export type GetActivitiesRoute = typeof getActivities;
export type GetFormSchemaRoute = typeof getFormSchema;
export type GetDataSummaryRoute = typeof getDataSummary;

export type UploadFileRoute = typeof uploadFile;
export type DownloadTemplateRoute = typeof downloadTemplate;
export type SubmitForApprovalRoute = typeof submitForApproval;
export type ReviewPlanningRoute = typeof reviewPlanning;
export type BulkReviewPlanningRoute = typeof bulkReviewPlanning;
export type ApprovePlanningRoute = typeof approvePlanning;
export type GetApprovalHistoryRoute = typeof getApprovalHistory;