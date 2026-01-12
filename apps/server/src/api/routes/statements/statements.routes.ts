import { createRoute, z } from "@hono/zod-openapi";
import * as HttpStatusCodes from "stoker/http-status-codes";
import { jsonContent, jsonContentRequired } from "stoker/openapi/helpers";
import { IdParamsSchema } from "stoker/openapi/schemas";
import {
  reportActionRequestSchema,
  reportActionResponseSchema,
  workflowHistoryListResponseSchema,
  bulkApprovalRequestSchema,
  bulkApprovalResponseSchema,
  approvalQueueRequestSchema,
  approvalQueueResponseSchema,
  notificationPreferenceSchema,
} from "./statements.types";
import { notFoundSchema } from "@/api/lib/constants";

const tags = ["statements"];

export const submitReport = createRoute({
  path: "/statements/{id}/submit",
  method: "post",
  tags,
  request: {
    params: IdParamsSchema,
    body: jsonContentRequired(
      reportActionRequestSchema.omit({ action: true }),
      "Submission details"
    ),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      reportActionResponseSchema,
      "Report submitted successfully"
    ),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(
      notFoundSchema,
      "Report not found"
    ),
    [HttpStatusCodes.BAD_REQUEST]: jsonContent(
      z.object({ 
        message: z.string(),
        validationErrors: z.array(z.string()).optional(),
      }),
      "Invalid submission request"
    ),
  },
});

export const approveReport = createRoute({
  path: "/statements/{id}/approve",
  method: "post",
  tags,
  request: {
    params: IdParamsSchema,
    body: jsonContentRequired(
      reportActionRequestSchema.omit({ action: true }),
      "Approval details"
    ),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      reportActionResponseSchema,
      "Report approved successfully"
    ),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(
      notFoundSchema,
      "Report not found"
    ),
    [HttpStatusCodes.FORBIDDEN]: jsonContent(
      z.object({ message: z.string() }),
      "Insufficient permissions to approve report"
    ),
  },
});

export const rejectReport = createRoute({
  path: "/statements/{id}/reject",
  method: "post",
  tags,
  request: {
    params: IdParamsSchema,
    body: jsonContentRequired(
      reportActionRequestSchema.omit({ action: true }),
      "Rejection details"
    ),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      reportActionResponseSchema,
      "Report rejected successfully"
    ),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(
      notFoundSchema,
      "Report not found"
    ),
  },
});

export const requestChanges = createRoute({
  path: "/statements/{id}/request-changes",
  method: "post",
  tags,
  request: {
    params: IdParamsSchema,
    body: jsonContentRequired(
      reportActionRequestSchema.omit({ action: true }),
      "Change request details"
    ),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      reportActionResponseSchema,
      "Changes requested successfully"
    ),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(
      notFoundSchema,
      "Report not found"
    ),
  },
});

export const recallReport = createRoute({
  path: "/statements/{id}/recall",
  method: "post",
  tags,
  request: {
    params: IdParamsSchema,
    body: jsonContentRequired(
      reportActionRequestSchema.omit({ action: true }),
      "Recall details"
    ),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      reportActionResponseSchema,
      "Report recalled successfully"
    ),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(
      notFoundSchema,
      "Report not found"
    ),
    [HttpStatusCodes.FORBIDDEN]: jsonContent(
      z.object({ message: z.string() }),
      "Cannot recall report in current state"
    ),
  },
});

export const getWorkflowHistory = createRoute({
  path: "/statements/{id}/workflow-history",
  method: "get",
  tags,
  request: {
    params: IdParamsSchema,
    query: z.object({
      page: z.number().int().default(1),
      limit: z.number().int().default(20),
    }),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      workflowHistoryListResponseSchema,
      "Workflow history retrieved successfully"
    ),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(
      notFoundSchema,
      "Report not found"
    ),
  },
});

export const bulkApproval = createRoute({
  path: "/statements/bulk-approval",
  method: "post",
  tags,
  request: {
    body: jsonContentRequired(
      bulkApprovalRequestSchema,
      "Bulk approval request"
    ),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      bulkApprovalResponseSchema,
      "Bulk approval completed"
    ),
    [HttpStatusCodes.BAD_REQUEST]: jsonContent(
      z.object({ message: z.string() }),
      "Invalid bulk approval request"
    ),
  },
});

export const getApprovalQueue = createRoute({
  path: "/statements/approval-queue",
  method: "get",
  tags,
  request: {
    query: approvalQueueRequestSchema,
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      approvalQueueResponseSchema,
      "Approval queue retrieved successfully"
    ),
  },
});

export const getNotificationPreferences = createRoute({
  path: "/statements/notification-preferences",
  method: "get",
  tags,
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      notificationPreferenceSchema,
      "Notification preferences retrieved successfully"
    ),
  },
});

export const updateNotificationPreferences = createRoute({
  path: "/statements/notification-preferences",
  method: "put",
  tags,
  request: {
    body: jsonContentRequired(
      notificationPreferenceSchema.omit({ userId: true }),
      "Notification preferences"
    ),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      notificationPreferenceSchema,
      "Notification preferences updated successfully"
    ),
  },
});

export type SubmitReportRoute = typeof submitReport;
export type ApproveReportRoute = typeof approveReport;
export type RejectReportRoute = typeof rejectReport;
export type RequestChangesRoute = typeof requestChanges;
export type RecallReportRoute = typeof recallReport;
export type GetWorkflowHistoryRoute = typeof getWorkflowHistory;
export type BulkApprovalRoute = typeof bulkApproval;
export type GetApprovalQueueRoute = typeof getApprovalQueue;
export type GetNotificationPreferencesRoute = typeof getNotificationPreferences;
export type UpdateNotificationPreferencesRoute = typeof updateNotificationPreferences;
