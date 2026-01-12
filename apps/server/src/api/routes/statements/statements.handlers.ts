// import { eq, and, desc, asc, inArray, gte, lte } from "drizzle-orm";
import * as HttpStatusCodes from "stoker/http-status-codes";

// import { db } from "@/api/db";
// import { 
//   enhancedFinancialReports, 
//   enhancedUsers,
//   systemConfigurations,
//   configurationAuditLog,
// } from "@/api/db/schema";
import type { AppRouteHandler } from "@/api/lib/types";
import type {
  SubmitReportRoute,
  ApproveReportRoute,
  RejectReportRoute,
  RequestChangesRoute,
  RecallReportRoute,
  GetWorkflowHistoryRoute,
  BulkApprovalRoute,
  GetApprovalQueueRoute,
  GetNotificationPreferencesRoute,
  UpdateNotificationPreferencesRoute,
} from "./statements.routes";
import { statementWorkflowService } from "./statements.service";

export const submitReport: AppRouteHandler<SubmitReportRoute> = async (c) => {
  const { id } = c.req.param();
  const reportId = parseInt(id);
  const requestData = await c.req.json();
  const user = c.get("user");

  try {
    const result = await statementWorkflowService.executeAction(reportId, {
      action: 'submit',
      ...requestData,
      actionBy: user.id,
    });

    return c.json(result, HttpStatusCodes.OK);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes("not found")) {
        return c.json({ message: "Report not found" }, HttpStatusCodes.NOT_FOUND);
      }
      if (error.message.includes("validation")) {
        return c.json({
          message: "Report validation failed",
          validationErrors: [error.message],
        }, HttpStatusCodes.BAD_REQUEST);
      }
    }

    console.error("Error submitting report:", error);
    return c.json({
      message: "Failed to submit report",
    }, HttpStatusCodes.BAD_REQUEST);
  }
};

export const approveReport: AppRouteHandler<ApproveReportRoute> = async (c) => {
  const { id } = c.req.param();
  const reportId = parseInt(id);
  const requestData = await c.req.json();
  const user = c.get("user");

  // Check if user has approval permissions
  if (!user.permissions.includes('approve_reports') && user.role !== 'admin') {
    return c.json({
      message: "Insufficient permissions to approve reports",
    }, HttpStatusCodes.FORBIDDEN);
  }

  try {
    const result = await statementWorkflowService.executeAction(reportId, {
      action: 'approve',
      ...requestData,
      actionBy: user.id,
    });

    return c.json(result, HttpStatusCodes.OK);
  } catch (error) {
    if (error instanceof Error && error.message.includes("not found")) {
      return c.json({ message: "Report not found" }, HttpStatusCodes.NOT_FOUND);
    }

    console.error("Error approving report:", error);
    return c.json({
      message: "Failed to approve report",
    }, HttpStatusCodes.BAD_REQUEST);
  }
};

export const rejectReport: AppRouteHandler<RejectReportRoute> = async (c) => {
  const { id } = c.req.param();
  const reportId = parseInt(id);
  const requestData = await c.req.json();
  const user = c.get("user");

  try {
    const result = await statementWorkflowService.executeAction(reportId, {
      action: 'reject',
      ...requestData,
      actionBy: user.id,
    });

    return c.json(result, HttpStatusCodes.OK);
  } catch (error) {
    if (error instanceof Error && error.message.includes("not found")) {
      return c.json({ message: "Report not found" }, HttpStatusCodes.NOT_FOUND);
    }

    console.error("Error rejecting report:", error);
    return c.json({
      message: "Failed to reject report",
    }, HttpStatusCodes.BAD_REQUEST);
  }
};

export const requestChanges: AppRouteHandler<RequestChangesRoute> = async (c) => {
  const { id } = c.req.param();
  const reportId = parseInt(id);
  const requestData = await c.req.json();
  const user = c.get("user");

  try {
    const result = await statementWorkflowService.executeAction(reportId, {
      action: 'request_changes',
      ...requestData,
      actionBy: user.id,
    });

    return c.json(result, HttpStatusCodes.OK);
  } catch (error) {
    if (error instanceof Error && error.message.includes("not found")) {
      return c.json({ message: "Report not found" }, HttpStatusCodes.NOT_FOUND);
    }

    console.error("Error requesting changes:", error);
    return c.json({
      message: "Failed to request changes",
    }, HttpStatusCodes.BAD_REQUEST);
  }
};

export const recallReport: AppRouteHandler<RecallReportRoute> = async (c) => {
  const { id } = c.req.param();
  const reportId = parseInt(id);
  const requestData = await c.req.json();
  const user = c.get("user");

  try {
    const result = await statementWorkflowService.executeAction(reportId, {
      action: 'recall',
      ...requestData,
      actionBy: user.id,
    });

    return c.json(result, HttpStatusCodes.OK);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes("not found")) {
        return c.json({ message: "Report not found" }, HttpStatusCodes.NOT_FOUND);
      }
      if (error.message.includes("Cannot recall")) {
        return c.json({
          message: error.message,
        }, HttpStatusCodes.FORBIDDEN);
      }
    }

    console.error("Error recalling report:", error);
    return c.json({
      message: "Failed to recall report",
    }, HttpStatusCodes.BAD_REQUEST);
  }
};

export const getWorkflowHistory: AppRouteHandler<GetWorkflowHistoryRoute> = async (c) => {
  const { id } = c.req.param();
  const reportId = parseInt(id);
  const { page = 1, limit = 20 } = c.req.query();

  try {
    const history = await statementWorkflowService.getWorkflowHistory(reportId, {
      page,
      limit,
    });

    return c.json(history, HttpStatusCodes.OK);
  } catch (error) {
    if (error instanceof Error && error.message.includes("not found")) {
      return c.json({ message: "Report not found" }, HttpStatusCodes.NOT_FOUND);
    }

    console.error("Error getting workflow history:", error);
    return c.json({
      message: "Failed to get workflow history",
    }, HttpStatusCodes.BAD_REQUEST);
  }
};

export const bulkApproval: AppRouteHandler<BulkApprovalRoute> = async (c) => {
  const requestData = await c.req.json();
  const user = c.get("user");

  // Check bulk approval permissions
  if (!user.permissions.includes('bulk_approve_reports') && user.role !== 'admin') {
    return c.json({
      message: "Insufficient permissions for bulk approval",
    }, HttpStatusCodes.FORBIDDEN);
  }

  try {
    const result = await statementWorkflowService.executeBulkAction({
      ...requestData,
      actionBy: user.id,
    });

    return c.json(result, HttpStatusCodes.OK);
  } catch (error) {
    console.error("Error in bulk approval:", error);
    return c.json({
      message: "Bulk approval operation failed",
    }, HttpStatusCodes.BAD_REQUEST);
  }
};

export const getApprovalQueue: AppRouteHandler<GetApprovalQueueRoute> = async (c) => {
  const query = c.req.query();
  const user = c.get("user");

  try {
    // Filter by user's facility if not admin
    const effectiveQuery = user.role === 'admin' ? query : {
      ...query,
      facilityId: query.facilityId || user.facilityId,
    };

    const queue = await statementWorkflowService.getApprovalQueue(effectiveQuery);
    return c.json(queue, HttpStatusCodes.OK);
  } catch (error) {
    console.error("Error getting approval queue:", error);
    return c.json({
      message: "Failed to get approval queue",
    }, HttpStatusCodes.BAD_REQUEST);
  }
};

export const getNotificationPreferences: AppRouteHandler<GetNotificationPreferencesRoute> = async (c) => {
  const user = c.get("user");

  try {
    const preferences = await statementWorkflowService.getNotificationPreferences(user.id);
    return c.json(preferences, HttpStatusCodes.OK);
  } catch (error) {
    console.error("Error getting notification preferences:", error);
    return c.json({
      message: "Failed to get notification preferences",
    }, HttpStatusCodes.BAD_REQUEST);
  }
};

export const updateNotificationPreferences: AppRouteHandler<UpdateNotificationPreferencesRoute> = async (c) => {
  const user = c.get("user");
  const preferences = await c.req.json();

  try {
    const updatedPreferences = await statementWorkflowService.updateNotificationPreferences(
      user.id,
      preferences
    );
    return c.json(updatedPreferences, HttpStatusCodes.OK);
  } catch (error) {
    console.error("Error updating notification preferences:", error);
    return c.json({
      message: "Failed to update notification preferences",
    }, HttpStatusCodes.BAD_REQUEST);
  }
};

