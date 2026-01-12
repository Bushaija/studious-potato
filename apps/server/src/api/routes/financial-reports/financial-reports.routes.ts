import { createRoute, z } from "@hono/zod-openapi";
import * as HttpStatusCodes from "stoker/http-status-codes";
import { jsonContent } from "stoker/openapi/helpers";
import { IdParamsSchema } from "stoker/openapi/schemas";
import {
  financialReportWithRelationsSchema,
  financialReportListRequestSchema,
  financialReportListResponseSchema,
  generateStatementRequestSchema,
  generateStatementResponseSchema,
  exportStatementRequestSchema,
  submitForApprovalRequestSchema,
  approvalActionRequestSchema,
  rejectionActionRequestSchema,
  approvalActionResponseSchema,
  workflowLogsResponseSchema,
  patchFinancialReportSchema,
  getPeriodLocksRequestSchema,
  getPeriodLocksResponseSchema,
  unlockPeriodRequestSchema,
  unlockPeriodResponseSchema,
  getPeriodLockAuditResponseSchema,
  getVersionsResponseSchema,
  getVersionResponseSchema,
  compareVersionsRequestSchema,
  compareVersionsResponseSchema,
} from "./financial-reports.types";
import {
  createReportFromStatementRequestSchema,
  createReportFromStatementResponseSchema,
} from "./create-report-from-statement.types";
import { notFoundSchema } from "@/api/lib/constants";

const tags = ["financial-reports"];

export const list = createRoute({
  path: "/financial-reports",
  method: "get",
  tags,
  request: {
    query: financialReportListRequestSchema,
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      financialReportListResponseSchema,
      "Financial reports retrieved successfully"
    ),
  },
});

export const getOne = createRoute({
  path: "/financial-reports/{id}",
  method: "get",
  tags,
  request: {
    params: IdParamsSchema,
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      financialReportWithRelationsSchema,
      "Financial report retrieved successfully"
    ),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(
      notFoundSchema,
      "Financial report not found"
    ),
  },
});

export const patch = createRoute({
  path: "/financial-reports/{id}",
  method: "patch",
  tags,
  request: {
    params: IdParamsSchema,
    body: jsonContent(
      patchFinancialReportSchema,
      "Financial report update data"
    ),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      financialReportWithRelationsSchema,
      "Financial report updated successfully"
    ),
    [HttpStatusCodes.BAD_REQUEST]: jsonContent(
      z.object({
        message: z.string(),
        error: z.string().optional(),
      }),
      "Invalid request or report is locked"
    ),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(
      notFoundSchema,
      "Financial report not found"
    ),
    [HttpStatusCodes.FORBIDDEN]: jsonContent(
      z.object({ message: z.string() }),
      "Cannot edit locked report"
    ),
  },
});

export const remove = createRoute({
  path: "/financial-reports/{id}",
  method: "delete",
  tags,
  request: {
    params: IdParamsSchema,
  },
  responses: {
    [HttpStatusCodes.NO_CONTENT]: {
      description: "Financial report deleted successfully",
    },
    [HttpStatusCodes.NOT_FOUND]: jsonContent(
      notFoundSchema,
      "Financial report not found"
    ),
  },
});

export const generateStatement = createRoute({
  path: "/financial-reports/generate-statement",
  method: "post",
  tags,
  summary: "Generate financial statement using template-driven approach",
  description: "Generate standardized financial statements (Revenue & Expenditure, Balance Sheet, Cash Flow, Net Assets Changes, Budget vs Actual) from planning and execution data using predefined templates",
  request: {
    body: jsonContent(
      generateStatementRequestSchema,
      "Statement generation parameters"
    ),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      generateStatementResponseSchema,
      "Financial statement generated successfully"
    ),
    [HttpStatusCodes.BAD_REQUEST]: jsonContent(
      z.object({
        message: z.string(),
        errors: z.array(z.string()).optional(),
      }),
      "Invalid request parameters"
    ),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(
      z.object({
        message: z.string(),
        details: z.string().optional(),
      }),
      "Template or data not found"
    ),
    [HttpStatusCodes.INTERNAL_SERVER_ERROR]: jsonContent(
      z.object({
        message: z.string(),
        error: z.string().optional(),
      }),
      "Statement generation failed"
    ),
  },
});

export const createReportFromStatement = createRoute({
  path: "/financial-reports/create-report",
  method: "post",
  tags,
  summary: "Create a formal financial report from generated statement data",
  description: "Creates a financial_reports record from a generated statement, enabling approval workflow tracking. This separates 'viewing data' from 'creating a formal report for approval'.",
  request: {
    body: jsonContent(
      createReportFromStatementRequestSchema,
      "Parameters to generate and save the statement as a formal report"
    ),
  },
  responses: {
    [HttpStatusCodes.CREATED]: jsonContent(
      createReportFromStatementResponseSchema,
      "Financial report created successfully"
    ),
    [HttpStatusCodes.BAD_REQUEST]: jsonContent(
      z.object({
        message: z.string(),
        error: z.string().optional(),
      }),
      "Invalid request parameters"
    ),
    [HttpStatusCodes.CONFLICT]: jsonContent(
      z.object({
        message: z.string(),
        existingReportId: z.number().optional(),
      }),
      "Report already exists for this period/project/statement combination"
    ),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(
      z.object({
        message: z.string(),
        details: z.string().optional(),
      }),
      "Project or reporting period not found"
    ),
    [HttpStatusCodes.INTERNAL_SERVER_ERROR]: jsonContent(
      z.object({
        message: z.string(),
        error: z.string().optional(),
      }),
      "Report creation failed"
    ),
  },
});

export const exportStatement = createRoute({
  path: "/financial-reports/export-statement",
  method: "post",
  tags,
  summary: "Export financial statement to various formats",
  description: "Export a generated financial statement to PDF, Excel, or CSV format with customizable formatting options",
  request: {
    body: jsonContent(
      exportStatementRequestSchema,
      "Statement export parameters"
    ),
  },
  responses: {
    [HttpStatusCodes.OK]: {
      description: "Financial statement exported successfully",
      content: {
        'application/pdf': {
          schema: {
            type: 'string',
            format: 'binary',
          },
        },
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': {
          schema: {
            type: 'string',
            format: 'binary',
          },
        },
        'text/csv': {
          schema: {
            type: 'string',
          },
        },
      },
    },
    [HttpStatusCodes.BAD_REQUEST]: jsonContent(
      z.object({
        message: z.string(),
        errors: z.array(z.string()).optional(),
      }),
      "Invalid export parameters"
    ),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(
      z.object({
        message: z.string(),
        details: z.string().optional(),
      }),
      "Statement data not found"
    ),
    [HttpStatusCodes.INTERNAL_SERVER_ERROR]: jsonContent(
      z.object({
        message: z.string(),
        error: z.string().optional(),
      }),
      "Export failed"
    ),
  },
});

export const generatePdf = createRoute({
  path: "/financial-reports/{id}/generate-pdf",
  method: "post",
  tags,
  summary: "Generate PDF for a financial report",
  description: "Generate a PDF document for a financial report with approval information and signatures",
  request: {
    params: IdParamsSchema,
  },
  responses: {
    [HttpStatusCodes.OK]: {
      description: "PDF generated successfully",
      content: {
        'application/pdf': {
          schema: {
            type: 'string',
            format: 'binary',
          },
        },
      },
    },
    [HttpStatusCodes.NOT_FOUND]: jsonContent(
      notFoundSchema,
      "Report not found"
    ),
    [HttpStatusCodes.INTERNAL_SERVER_ERROR]: jsonContent(
      z.object({
        message: z.string(),
        error: z.string().optional(),
      }),
      "PDF generation failed"
    ),
  },
});

// ============================================================================
// APPROVAL WORKFLOW ROUTES
// ============================================================================

export const getDafQueue = createRoute({
  path: "/financial-reports/daf-queue",
  method: "get",
  tags,
  summary: "Get DAF approval queue",
  description: "Retrieves financial reports accessible to DAF users based on facility hierarchy. Supports filtering by status (pending/approved/rejected/all).",
  request: {
    query: z.object({
      page: z.coerce.number().int().default(1),
      limit: z.coerce.number().int().default(20),
      status: z.enum(['pending', 'approved', 'rejected', 'all']).optional().default('pending'),
    }),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      z.object({
        reports: z.array(financialReportWithRelationsSchema),
        pagination: z.object({
          page: z.number(),
          limit: z.number(),
          total: z.number(),
          totalPages: z.number(),
        }),
      }),
      "DAF approval queue retrieved successfully"
    ),
    [HttpStatusCodes.UNAUTHORIZED]: jsonContent(
      z.object({ message: z.string() }),
      "Authentication required"
    ),
    [HttpStatusCodes.FORBIDDEN]: jsonContent(
      z.object({ message: z.string() }),
      "User does not have DAF role or access to facilities"
    ),
  },
});

export const getDgQueue = createRoute({
  path: "/financial-reports/dg-queue",
  method: "get",
  tags,
  summary: "Get DG approval queue",
  description: "Retrieves financial reports accessible to DG users based on facility hierarchy. Supports filtering by status (pending/approved/rejected/all).",
  request: {
    query: z.object({
      page: z.coerce.number().int().default(1),
      limit: z.coerce.number().int().default(20),
      status: z.enum(['pending', 'approved', 'rejected', 'all']).optional().default('pending'),
    }),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      z.object({
        reports: z.array(financialReportWithRelationsSchema),
        pagination: z.object({
          page: z.number(),
          limit: z.number(),
          total: z.number(),
          totalPages: z.number(),
        }),
      }),
      "DG approval queue retrieved successfully"
    ),
    [HttpStatusCodes.UNAUTHORIZED]: jsonContent(
      z.object({ message: z.string() }),
      "Authentication required"
    ),
    [HttpStatusCodes.FORBIDDEN]: jsonContent(
      z.object({ message: z.string() }),
      "User does not have DG role or access to facilities"
    ),
  },
});

export const submitForApproval = createRoute({
  path: "/financial-reports/{id}/submit",
  method: "post",
  tags,
  summary: "Submit financial report for DAF approval",
  description: "Accountant submits a draft or rejected report for DAF approval. Report will be locked during approval process.",
  request: {
    params: IdParamsSchema,
    body: jsonContent(
      submitForApprovalRequestSchema,
      "Submit for approval (no body required)"
    ),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      approvalActionResponseSchema,
      "Report submitted successfully"
    ),
    [HttpStatusCodes.BAD_REQUEST]: jsonContent(
      z.object({
        message: z.string(),
        error: z.string().optional(),
      }),
      "Invalid request or report state"
    ),
    [HttpStatusCodes.UNAUTHORIZED]: jsonContent(
      z.object({ message: z.string() }),
      "Authentication required"
    ),
    [HttpStatusCodes.FORBIDDEN]: jsonContent(
      z.object({ message: z.string() }),
      "User does not have permission to submit this report"
    ),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(
      notFoundSchema,
      "Financial report not found"
    ),
  },
});

export const dafApprove = createRoute({
  path: "/financial-reports/{id}/daf-approve",
  method: "post",
  tags,
  summary: "DAF approves financial report",
  description: "Director of Administration and Finance approves a report pending DAF review. Report proceeds to DG approval stage.",
  request: {
    params: IdParamsSchema,
    body: jsonContent(
      approvalActionRequestSchema,
      "Optional approval comment"
    ),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      approvalActionResponseSchema,
      "Report reviewed by DAF"
    ),
    [HttpStatusCodes.BAD_REQUEST]: jsonContent(
      z.object({
        message: z.string(),
        error: z.string().optional(),
      }),
      "Invalid request or report state"
    ),
    [HttpStatusCodes.UNAUTHORIZED]: jsonContent(
      z.object({ message: z.string() }),
      "Authentication required"
    ),
    [HttpStatusCodes.FORBIDDEN]: jsonContent(
      z.object({ message: z.string() }),
      "User does not have DAF role"
    ),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(
      notFoundSchema,
      "Financial report not found"
    ),
  },
});

export const dafReject = createRoute({
  path: "/financial-reports/{id}/daf-reject",
  method: "post",
  tags,
  summary: "DAF rejects financial report",
  description: "Director of Administration and Finance rejects a report. Report is unlocked and returned to accountant for revision.",
  request: {
    params: IdParamsSchema,
    body: jsonContent(
      rejectionActionRequestSchema,
      "Rejection comment (required)"
    ),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      approvalActionResponseSchema,
      "Report rejected by DAF"
    ),
    [HttpStatusCodes.BAD_REQUEST]: jsonContent(
      z.object({
        message: z.string(),
        error: z.string().optional(),
      }),
      "Invalid request, missing comment, or invalid report state"
    ),
    [HttpStatusCodes.UNAUTHORIZED]: jsonContent(
      z.object({ message: z.string() }),
      "Authentication required"
    ),
    [HttpStatusCodes.FORBIDDEN]: jsonContent(
      z.object({ message: z.string() }),
      "User does not have DAF role"
    ),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(
      notFoundSchema,
      "Financial report not found"
    ),
  },
});

export const dgApprove = createRoute({
  path: "/financial-reports/{id}/dg-approve",
  method: "post",
  tags,
  summary: "DG provides final approval for financial report",
  description: "Director General provides final approval. Report is permanently locked and PDF snapshot is generated.",
  request: {
    params: IdParamsSchema,
    body: jsonContent(
      approvalActionRequestSchema,
      "Optional approval comment"
    ),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      approvalActionResponseSchema,
      "Report fully approved by DG"
    ),
    [HttpStatusCodes.BAD_REQUEST]: jsonContent(
      z.object({
        message: z.string(),
        error: z.string().optional(),
      }),
      "Invalid request or report state"
    ),
    [HttpStatusCodes.UNAUTHORIZED]: jsonContent(
      z.object({ message: z.string() }),
      "Authentication required"
    ),
    [HttpStatusCodes.FORBIDDEN]: jsonContent(
      z.object({ message: z.string() }),
      "User does not have DG role"
    ),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(
      notFoundSchema,
      "Financial report not found"
    ),
  },
});

export const dgReject = createRoute({
  path: "/financial-reports/{id}/dg-reject",
  method: "post",
  tags,
  summary: "DG rejects financial report",
  description: "Director General rejects a report. Report is unlocked and returned to accountant for revision.",
  request: {
    params: IdParamsSchema,
    body: jsonContent(
      rejectionActionRequestSchema,
      "Rejection comment (required)"
    ),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      approvalActionResponseSchema,
      "Report rejected by DG"
    ),
    [HttpStatusCodes.BAD_REQUEST]: jsonContent(
      z.object({
        message: z.string(),
        error: z.string().optional(),
      }),
      "Invalid request, missing comment, or invalid report state"
    ),
    [HttpStatusCodes.UNAUTHORIZED]: jsonContent(
      z.object({ message: z.string() }),
      "Authentication required"
    ),
    [HttpStatusCodes.FORBIDDEN]: jsonContent(
      z.object({ message: z.string() }),
      "User does not have DG role"
    ),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(
      notFoundSchema,
      "Financial report not found"
    ),
  },
});

export const getWorkflowLogs = createRoute({
  path: "/financial-reports/{id}/workflow-logs",
  method: "get",
  tags,
  summary: "Get workflow logs for financial report",
  description: "Retrieves the complete approval history and audit trail for a financial report.",
  request: {
    params: IdParamsSchema,
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      workflowLogsResponseSchema,
      "Workflow logs retrieved successfully"
    ),
    [HttpStatusCodes.UNAUTHORIZED]: jsonContent(
      z.object({ message: z.string() }),
      "Authentication required"
    ),
    [HttpStatusCodes.FORBIDDEN]: jsonContent(
      z.object({ message: z.string() }),
      "User does not have access to this report"
    ),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(
      notFoundSchema,
      "Financial report not found"
    ),
  },
});

// ============================================================================
// PERIOD LOCK ROUTES
// ============================================================================

export const getPeriodLocks = createRoute({
  path: "/period-locks",
  method: "get",
  tags: ["period-locks"],
  summary: "Get all period locks for a facility",
  description: "Retrieves all period locks with related entities for a specific facility.",
  request: {
    query: z.object({
      facilityId: z.coerce.number().int().positive(),
    }),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      z.object({
        locks: z.array(z.any()),
      }),
      "Period locks retrieved successfully"
    ),
    [HttpStatusCodes.BAD_REQUEST]: jsonContent(
      z.object({
        message: z.string(),
        error: z.string().optional(),
      }),
      "Invalid request parameters"
    ),
    [HttpStatusCodes.UNAUTHORIZED]: jsonContent(
      z.object({ message: z.string() }),
      "Authentication required"
    ),
    [HttpStatusCodes.FORBIDDEN]: jsonContent(
      z.object({ message: z.string() }),
      "User does not have access to this facility"
    ),
  },
});

export const unlockPeriod = createRoute({
  path: "/period-locks/{id}/unlock",
  method: "post",
  tags: ["period-locks"],
  summary: "Unlock a reporting period (admin only)",
  description: "Allows administrators to unlock a period for corrections. Requires admin or superadmin role.",
  request: {
    params: IdParamsSchema,
    body: jsonContent(
      z.object({
        reason: z.string().min(1, 'Unlock reason is required'),
      }),
      "Unlock reason (required for audit)"
    ),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      z.object({
        success: z.boolean(),
        message: z.string(),
        periodLock: z.any(),
      }),
      "Period unlocked successfully"
    ),
    [HttpStatusCodes.BAD_REQUEST]: jsonContent(
      z.object({
        message: z.string(),
        error: z.string().optional(),
      }),
      "Invalid request or missing reason"
    ),
    [HttpStatusCodes.UNAUTHORIZED]: jsonContent(
      z.object({ message: z.string() }),
      "Authentication required"
    ),
    [HttpStatusCodes.FORBIDDEN]: jsonContent(
      z.object({ message: z.string() }),
      "User does not have admin permission"
    ),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(
      notFoundSchema,
      "Period lock not found"
    ),
  },
});

export const getPeriodLockAudit = createRoute({
  path: "/period-locks/audit/{id}",
  method: "get",
  tags: ["period-locks"],
  summary: "Get audit log for a period lock",
  description: "Retrieves the complete audit trail for a specific period lock, including all lock/unlock actions and edit attempts.",
  request: {
    params: IdParamsSchema,
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      z.object({
        auditLogs: z.array(z.any()),
      }),
      "Audit logs retrieved successfully"
    ),
    [HttpStatusCodes.UNAUTHORIZED]: jsonContent(
      z.object({ message: z.string() }),
      "Authentication required"
    ),
    [HttpStatusCodes.FORBIDDEN]: jsonContent(
      z.object({ message: z.string() }),
      "User does not have access to this period lock"
    ),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(
      notFoundSchema,
      "Period lock not found"
    ),
  },
});

// ============================================================================
// VERSION CONTROL ROUTES
// ============================================================================

export const getVersions = createRoute({
  path: "/financial-reports/{id}/versions",
  method: "get",
  tags: ["financial-reports", "versions"],
  summary: "Get all versions for a financial report",
  description: "Retrieves the complete version history for a financial report, including snapshot metadata and creator information.",
  request: {
    params: IdParamsSchema,
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      getVersionsResponseSchema,
      "Report versions retrieved successfully"
    ),
    [HttpStatusCodes.UNAUTHORIZED]: jsonContent(
      z.object({ message: z.string() }),
      "Authentication required"
    ),
    [HttpStatusCodes.FORBIDDEN]: jsonContent(
      z.object({ message: z.string() }),
      "User does not have access to this report"
    ),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(
      notFoundSchema,
      "Financial report not found"
    ),
  },
});

export const getVersion = createRoute({
  path: "/financial-reports/{id}/versions/{versionNumber}",
  method: "get",
  tags: ["financial-reports", "versions"],
  summary: "Get a specific version of a financial report",
  description: "Retrieves a specific version of a financial report by version number, including complete snapshot data.",
  request: {
    params: z.object({
      id: z.coerce.number().int().positive(),
      versionNumber: z.string().min(1),
    }),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      getVersionResponseSchema,
      "Report version retrieved successfully"
    ),
    [HttpStatusCodes.UNAUTHORIZED]: jsonContent(
      z.object({ message: z.string() }),
      "Authentication required"
    ),
    [HttpStatusCodes.FORBIDDEN]: jsonContent(
      z.object({ message: z.string() }),
      "User does not have access to this report"
    ),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(
      notFoundSchema,
      "Report version not found"
    ),
  },
});

export const compareVersions = createRoute({
  path: "/financial-reports/{id}/versions/compare",
  method: "post",
  tags: ["financial-reports", "versions"],
  summary: "Compare two versions of a financial report",
  description: "Performs a line-by-line comparison between two report versions, highlighting differences and calculating percentage changes.",
  request: {
    params: IdParamsSchema,
    body: jsonContent(
      compareVersionsRequestSchema,
      "Version comparison parameters"
    ),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      compareVersionsResponseSchema,
      "Version comparison completed successfully"
    ),
    [HttpStatusCodes.BAD_REQUEST]: jsonContent(
      z.object({
        message: z.string(),
        error: z.string().optional(),
      }),
      "Invalid request parameters"
    ),
    [HttpStatusCodes.UNAUTHORIZED]: jsonContent(
      z.object({ message: z.string() }),
      "Authentication required"
    ),
    [HttpStatusCodes.FORBIDDEN]: jsonContent(
      z.object({ message: z.string() }),
      "User does not have access to this report"
    ),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(
      notFoundSchema,
      "Report or version not found"
    ),
  },
});

export type ListRoute = typeof list;
export type GetOneRoute = typeof getOne;
export type PatchRoute = typeof patch;
export type RemoveRoute = typeof remove;
export type GenerateStatementRoute = typeof generateStatement;
export type CreateReportFromStatementRoute = typeof createReportFromStatement;
export type ExportStatementRoute = typeof exportStatement;
export type GeneratePdfRoute = typeof generatePdf;
export type GetDafQueueRoute = typeof getDafQueue;
export type GetDgQueueRoute = typeof getDgQueue;
export type SubmitForApprovalRoute = typeof submitForApproval;
export type DafApproveRoute = typeof dafApprove;
export type DafRejectRoute = typeof dafReject;
export type DgApproveRoute = typeof dgApprove;
export type DgRejectRoute = typeof dgReject;
export type GetWorkflowLogsRoute = typeof getWorkflowLogs;
export type GetPeriodLocksRoute = typeof getPeriodLocks;
export type UnlockPeriodRoute = typeof unlockPeriod;
export type GetPeriodLockAuditRoute = typeof getPeriodLockAudit;
export type GetVersionsRoute = typeof getVersions;
export type GetVersionRoute = typeof getVersion;
export type CompareVersionsRoute = typeof compareVersions;