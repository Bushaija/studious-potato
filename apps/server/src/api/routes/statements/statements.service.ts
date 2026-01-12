import { eq, and, desc, asc, inArray, sql, gte, lte } from "drizzle-orm";
import { db } from "@/api/db";
import { 
  financialReports, 
  users,
  systemConfigurations,
  configurationAuditLog,
} from "@/api/db/schema";
import { financialReportService } from "../financial-reports/financial-reports.service";

type Status = 'draft' | 'submitted' | 'changes_requested' | 'approved' | 'rejected';

interface WorkflowAction {
  action: 'submit' | 'approve' | 'reject' | 'request_changes' | 'recall';
  actionBy: number;
  comments?: string;
  attachments?: string[];
  notifyUsers?: number[];
  scheduledDate?: string;
}

interface BulkWorkflowAction {
  reportIds: number[];
  action: 'submit' | 'approve' | 'reject' | 'request_changes';
  actionBy: number;
  comments?: string;
  skipValidation?: boolean;
}

export class StatementWorkflowService {
  private readonly statusTransitions = {
    draft: ['submitted'],
    submitted: ['approved', 'rejected', 'changes_requested'],
    changes_requested: ['submitted'],
    approved: [],
    rejected: ['submitted'], // Allow resubmission after rejection
  };

  async executeAction(reportId: number, actionData: WorkflowAction) {
    const report = await db.query.financialReports.findFirst({
      where: eq(financialReports.id, reportId),
      with: {
        creator: true,
        facility: true,
        project: true,
      },
    });

    if (!report) {
      throw new Error("Financial report not found");
    }

    const { action, actionBy, comments, attachments, notifyUsers } = actionData;
    const currentStatus = report.status;
    let newStatus: Status;
    let validationResults;

    // Determine new status based on action
    switch (action) {
      case 'submit':
        newStatus = 'submitted';
        // Validate report before submission
        validationResults = await financialReportService.validateReport(reportId);
        if (!validationResults.isValid) {
          throw new Error(`Report validation failed: ${validationResults.errors.join(', ')}`);
        }
        break;
      case 'approve':
        newStatus = 'approved';
        break;
      case 'reject':
        newStatus = 'rejected';
        break;
      case 'request_changes':
        newStatus = 'changes_requested';
        break;
      case 'recall':
        if (currentStatus === 'approved') {
          throw new Error("Cannot recall approved report");
        }
        newStatus = 'draft';
        break;
      default:
        throw new Error(`Invalid action: ${action}`);
    }

    // Validate status transition
    if (currentStatus && !(this.statusTransitions as any)[currentStatus]?.includes(newStatus) && action !== 'recall') {
      throw new Error(`Invalid status transition from ${currentStatus} to ${newStatus}`);
    }

    // Update report status and metadata
    const updateData: any = {
      status: newStatus,
      updatedAt: new Date(),
      updatedBy: actionBy,
    };

    // Set specific fields based on action
    if (action === 'submit') {
      updateData.submittedBy = actionBy;
      updateData.submittedAt = new Date();
    } else if (action === 'approve') {
      updateData.approvedBy = actionBy;
      updateData.approvedAt = new Date();
    }

    // Update metadata with workflow action
    const currentMetadata = report.metadata || {};
    updateData.metadata = {
      ...currentMetadata,
      lastWorkflowAction: {
        action,
        actionBy,
        actionAt: new Date().toISOString(),
        comments,
        fromStatus: currentStatus,
        toStatus: newStatus,
      },
      workflowHistory: [
        ...((currentMetadata as any).workflowHistory || []),
        {
          action,
          actionBy,
          actionAt: new Date().toISOString(),
          comments,
          fromStatus: currentStatus,
          toStatus: newStatus,
          attachments,
        },
      ],
    };

    const [updatedReport] = await db.update(financialReports)
      .set(updateData)
      .where(eq(financialReports.id, reportId))
      .returning();

    // Log the workflow action
    await this.logWorkflowAction({
      reportId,
      action,
      fromStatus: currentStatus || 'unknown',
      toStatus: newStatus,
      actionBy,
      comments,
      attachments,
    });

    // Send notifications
    await this.sendWorkflowNotifications({
      report: updatedReport,
      action,
      actionBy,
      comments,
      notifyUsers,
    });

    // Get user who performed the action
    const actionByUser = await db.query.users.findFirst({
      where: eq(users.id, actionBy),
    });

    return {
      reportId,
      action,
      previousStatus: currentStatus,
      newStatus,
      actionBy: {
        id: actionByUser?.id || actionBy,
        name: actionByUser?.name || 'Unknown User',
        email: actionByUser?.email || '',
        role: actionByUser?.role || '',
      },
      actionAt: new Date().toISOString(),
      comments,
      validationResults,
    };
  }

  async executeBulkAction(actionData: BulkWorkflowAction) {
    const { reportIds, action, actionBy, comments, skipValidation = false } = actionData;
    
    const successful: any[] = [];
    const failed: any[] = [];

    for (const reportId of reportIds) {
      try {
        const result = await this.executeAction(reportId, {
          action,
          actionBy,
          comments,
        });

        successful.push({
          reportId,
          action,
          newStatus: result.newStatus,
        });
      } catch (error) {
        failed.push({
          reportId,
          error: error instanceof Error ? error.message : 'Unknown error',
          validationErrors: error instanceof Error && error.message.includes('validation') 
            ? [error.message] 
            : undefined,
        });
      }
    }

    return {
      successful,
      failed,
      summary: {
        totalProcessed: reportIds.length,
        successCount: successful.length,
        failureCount: failed.length,
      },
    };
  }

  async getApprovalQueue(params: {
    userId?: number;
    facilityId?: number;
    projectType?: string;
    priority?: 'high' | 'medium' | 'low';
    dueBefore?: string;
    status?: string[];
    page?: number;
    limit?: number;
  }) {
    const {
      userId,
      facilityId,
      projectType,
      priority,
      dueBefore,
      status = ['submitted', 'changes_requested'],
      page = 1,
      limit = 20,
    } = params;

    const conditions = [];
    conditions.push(inArray(financialReports.status, status as any[]));

    if (facilityId) {
      conditions.push(eq(financialReports.facilityId, facilityId));
    }
    if (dueBefore) {
      conditions.push(lte(financialReports.submittedAt, new Date(dueBefore)));
    }

    const offset = (page - 1) * limit;

    const reports = await db.query.financialReports.findMany({
      where: and(...conditions),
      orderBy: [asc(financialReports.submittedAt)],
      limit,
      offset,
      with: {
        facility: true,
        project: true,
        submitter: true,
      },
    });

    const totalCount = await db.$count(
      financialReports,
      and(...conditions)
    );

    // Calculate queue items with additional metadata
    const queueItems = await Promise.all(
      reports.map(async (report) => {
        const submittedAt = report.submittedAt || report.createdAt;
        const daysInQueue = Math.floor(
          (Date.now() - submittedAt!.getTime()) / (1000 * 60 * 60 * 24)
        );

        // Determine priority based on days in queue and other factors
        let calculatedPriority: 'high' | 'medium' | 'low' = 'medium';
        if (daysInQueue > 14) calculatedPriority = 'high';
        else if (daysInQueue > 7) calculatedPriority = 'medium';
        else calculatedPriority = 'low';

        // Get validation status
        const validationResults = await financialReportService.validateReport(report.id);

        return {
          reportId: report.id,
          report: {
            title: report.title,
            reportCode: report.reportCode,
            fiscalYear: report.fiscalYear,
            status: report.status,
            createdAt: report.createdAt!.toISOString(),
            submittedAt: report.submittedAt?.toISOString() || null,
          },
          facility: {
            id: (report.facility as any).id,
            name: (report.facility as any).name,
            facilityType: (report.facility as any).facilityType,
          },
          project: {
            id: (report.project as any).id,
            name: (report.project as any).name,
            projectType: (report.project as any).projectType,
          },
          submitter: report.submitter ? {
            id: (report.submitter as any).id,
            name: (report.submitter as any).name,
            email: (report.submitter as any).email,
          } : null,
          daysInQueue,
          priority: calculatedPriority,
          validationStatus: {
            isValid: validationResults.isValid,
            errorCount: validationResults.errors.length,
            warningCount: validationResults.warnings.length,
          },
        };
      })
    );

    // Calculate summary statistics
    const summary = {
      totalPending: totalCount,
      byPriority: {
        high: queueItems.filter(item => item.priority === 'high').length,
        medium: queueItems.filter(item => item.priority === 'medium').length,
        low: queueItems.filter(item => item.priority === 'low').length,
      },
      averageDaysInQueue: Math.round(
        queueItems.reduce((sum, item) => sum + item.daysInQueue, 0) / queueItems.length || 0
      ),
      oldestSubmission: queueItems.length > 0 
        ? queueItems.sort((a, b) => a.daysInQueue - b.daysInQueue)[queueItems.length - 1]?.report.submittedAt || null
        : null,
    };

    return {
      queue: queueItems,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
      summary,
    };
  }

  async getWorkflowHistory(reportId: number, params: { page?: number; limit?: number }) {
    const { page = 1, limit = 20 } = params;

    // First verify report exists
    const report = await db.query.financialReports.findFirst({
      where: eq(financialReports.id, reportId),
    });

    if (!report) {
      throw new Error("Financial report not found");
    }

    // Get workflow history from metadata
    const metadata = report.metadata || {};
    const workflowHistory = (metadata as any).workflowHistory || [];

    // Paginate the history
    const offset = (page - 1) * limit;
    const paginatedHistory = workflowHistory
      .slice(offset, offset + limit)
      .reverse(); // Most recent first

    // Enrich with user details
    const enrichedHistory = await Promise.all(
      paginatedHistory.map(async (entry: any) => {
        const user = await db.query.users.findFirst({
          where: eq(users.id, entry.actionBy),
        });

        return {
          id: Date.now() + Math.random(), // Mock ID for response
          reportId,
          action: entry.action,
          fromStatus: entry.fromStatus,
          toStatus: entry.toStatus,
          actionBy: entry.actionBy,
          actionByUser: {
            id: user?.id || entry.actionBy,
            name: user?.name || 'Unknown User',
            email: user?.email || '',
            role: user?.role || '',
          },
          comments: entry.comments || null,
          attachments: entry.attachments || [],
          metadata: entry.metadata || {},
          actionAt: entry.actionAt,
        };
      })
    );

    return {
      history: enrichedHistory,
      pagination: {
        page,
        limit,
        total: workflowHistory.length,
        totalPages: Math.ceil(workflowHistory.length / limit),
      },
    };
  }

  async getNotificationPreferences(userId: number) {
    const config = await db.query.systemConfigurations.findFirst({
      where: and(
        eq(systemConfigurations.configKey, 'notification_preferences'),
        eq(systemConfigurations.scope, 'USER'),
        eq(systemConfigurations.scopeId, userId)
      ),
    });

    const defaultPreferences = {
      userId,
      emailNotifications: true,
      reportSubmitted: true,
      reportApproved: true,
      reportRejected: true,
      changesRequested: true,
      reminderNotifications: true,
      reminderDays: 7,
    };

    if (!config) {
      return defaultPreferences;
    }

    return {
      ...defaultPreferences,
      ...(config.configValue as any),
      userId,
    };
  }

  async updateNotificationPreferences(userId: number, preferences: any) {
    const existingConfig = await db.query.systemConfigurations.findFirst({
      where: and(
        eq(systemConfigurations.configKey, 'notification_preferences'),
        eq(systemConfigurations.scope, 'USER'),
        eq(systemConfigurations.scopeId, userId)
      ),
    });

    const configValue = { userId, ...preferences };

    if (existingConfig) {
      const [updated] = await db.update(systemConfigurations)
        .set({
          configValue,
          updatedAt: new Date(),
        })
        .where(eq(systemConfigurations.id, existingConfig.id))
        .returning();

      return { userId, ...(updated.configValue as any) };
    } else {
      const [created] = await db.insert(systemConfigurations)
        .values({
          configKey: 'notification_preferences',
          configValue,
          configType: 'user_preferences',
          scope: 'USER',
          scopeId: userId,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();

      return { userId, ...(created.configValue as any) };
    }
  }

  private async logWorkflowAction(params: {
    reportId: number;
    action: string;
    fromStatus: string;
    toStatus: string;
    actionBy: number;
    comments?: string;
    attachments?: string[];
  }) {
    await db.insert(configurationAuditLog).values({
      tableName: 'enhanced_financial_reports',
      recordId: params.reportId,
      operation: 'UPDATE',
      oldValues: { status: params.fromStatus },
      newValues: { status: params.toStatus },
      changedBy: params.actionBy,
      changeReason: `Workflow action: ${params.action}${params.comments ? ` - ${params.comments}` : ''}`,
      changedAt: new Date(),
    });
  }

  private async sendWorkflowNotifications(params: {
    report: any;
    action: string;
    actionBy: number;
    comments?: string;
    notifyUsers?: number[];
  }) {
    // This would integrate with actual notification service
    // For now, just logging the notification intent
    console.log(`Sending notification for report ${params.report.id}:`, {
      action: params.action,
      actionBy: params.actionBy,
      notifyUsers: params.notifyUsers,
    });

    // Would implement:
    // - Email notifications
    // - In-app notifications
    // - SMS notifications (if configured)
    // - Webhook notifications
  }
}

export const statementWorkflowService = new StatementWorkflowService();