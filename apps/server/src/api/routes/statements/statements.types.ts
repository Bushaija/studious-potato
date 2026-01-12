import { z } from "@hono/zod-openapi";

// Workflow action schemas
export const reportActionEnum = z.enum(['submit', 'approve', 'reject', 'request_changes', 'recall']);
export const workflowStageEnum = z.enum(['draft', 'submitted', 'under_review', 'approved', 'rejected', 'changes_requested']);

export const reportActionRequestSchema = z.object({
  action: reportActionEnum,
  comments: z.string().optional(),
  attachments: z.array(z.string()).optional(),
  notifyUsers: z.array(z.number().int()).optional(),
  scheduledDate: z.string().optional(), // For scheduled approvals
});

export const reportActionResponseSchema = z.object({
  reportId: z.number().int(),
  action: reportActionEnum,
  previousStatus: z.string(),
  newStatus: z.string(),
  actionBy: z.object({
    id: z.number(),
    name: z.string(),
    email: z.string(),
    role: z.string(),
  }),
  actionAt: z.string(),
  comments: z.string().nullable(),
  validationResults: z.object({
    isValid: z.boolean(),
    errors: z.array(z.string()),
    warnings: z.array(z.string()),
  }).optional(),
});

// Workflow history schemas
export const workflowHistorySchema = z.object({
  id: z.number().int(),
  reportId: z.number().int(),
  action: reportActionEnum,
  fromStatus: z.string(),
  toStatus: z.string(),
  actionBy: z.number().int(),
  actionByUser: z.object({
    id: z.number(),
    name: z.string(),
    email: z.string(),
    role: z.string(),
  }),
  comments: z.string().nullable(),
  attachments: z.array(z.string()).nullable(),
  metadata: z.record(z.string(), z.any()).nullable(),
  actionAt: z.string(),
});

export const workflowHistoryListResponseSchema = z.object({
  history: z.array(workflowHistorySchema),
  pagination: z.object({
    page: z.number(),
    limit: z.number(),
    total: z.number(),
    totalPages: z.number(),
  }),
});

// Bulk operations schemas
export const bulkApprovalRequestSchema = z.object({
  reportIds: z.array(z.number().int()),
  action: reportActionEnum,
  comments: z.string().optional(),
  skipValidation: z.boolean().default(false),
});

export const bulkApprovalResponseSchema = z.object({
  successful: z.array(z.object({
    reportId: z.number(),
    action: reportActionEnum,
    newStatus: z.string(),
  })),
  failed: z.array(z.object({
    reportId: z.number(),
    error: z.string(),
    validationErrors: z.array(z.string()).optional(),
  })),
  summary: z.object({
    totalProcessed: z.number(),
    successCount: z.number(),
    failureCount: z.number(),
  }),
});

// Approval queue schemas
export const approvalQueueRequestSchema = z.object({
  userId: z.number().int().optional(),
  facilityId: z.number().int().optional(),
  projectType: z.string().optional(),
  priority: z.enum(['high', 'medium', 'low']).optional(),
  dueBefore: z.string().optional(),
  status: z.array(workflowStageEnum).optional(),
  page: z.number().int().default(1),
  limit: z.number().int().default(20),
});

export const approvalQueueItemSchema = z.object({
  reportId: z.number().int(),
  report: z.object({
    title: z.string(),
    reportCode: z.string(),
    fiscalYear: z.string(),
    status: z.string(),
    createdAt: z.string(),
    submittedAt: z.string().nullable(),
  }),
  facility: z.object({
    id: z.number(),
    name: z.string(),
    facilityType: z.string(),
  }),
  project: z.object({
    id: z.number(),
    name: z.string(),
    projectType: z.string().nullable(),
  }),
  submitter: z.object({
    id: z.number(),
    name: z.string(),
    email: z.string(),
  }).nullable(),
  daysInQueue: z.number(),
  priority: z.enum(['high', 'medium', 'low']),
  validationStatus: z.object({
    isValid: z.boolean(),
    errorCount: z.number(),
    warningCount: z.number(),
  }),
});

export const approvalQueueResponseSchema = z.object({
  queue: z.array(approvalQueueItemSchema),
  pagination: z.object({
    page: z.number(),
    limit: z.number(),
    total: z.number(),
    totalPages: z.number(),
  }),
  summary: z.object({
    totalPending: z.number(),
    byPriority: z.record(z.string(), z.any()),
    averageDaysInQueue: z.number(),
    oldestSubmission: z.string().nullable(),
  }),
});

// Notification schemas
export const notificationPreferenceSchema = z.object({
  userId: z.number().int(),
  emailNotifications: z.boolean().default(true),
  reportSubmitted: z.boolean().default(true),
  reportApproved: z.boolean().default(true),
  reportRejected: z.boolean().default(true),
  changesRequested: z.boolean().default(true),
  reminderNotifications: z.boolean().default(true),
  reminderDays: z.number().int().default(7),
});
