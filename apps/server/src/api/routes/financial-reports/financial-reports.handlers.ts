import { eq, and, desc, gte, lte } from "drizzle-orm";
import * as HttpStatusCodes from "stoker/http-status-codes";
import { sql } from "drizzle-orm";
import PDFDocument from "pdfkit";

import { db } from "@/api/db";
import {
  financialReports,
  projects,
  financialReportWorkflowLogs
} from "@/api/db/schema";
import type { AppRouteHandler } from "@/api/lib/types";
import type {
  ListRoute,
  GetOneRoute,
  PatchRoute,
  RemoveRoute,
  GenerateStatementRoute,
  GetDafQueueRoute,
  GetDgQueueRoute,
  SubmitForApprovalRoute,
  DafApproveRoute,
  DafRejectRoute,
  DgApproveRoute,
  DgRejectRoute,
  GetWorkflowLogsRoute,
  GetPeriodLocksRoute,
  UnlockPeriodRoute,
  GetPeriodLockAuditRoute,
  GetVersionsRoute,
  GetVersionRoute,
  CompareVersionsRoute,
} from "./financial-reports.routes";
import { financialReportWorkflowService } from "./financial-reports-workflow.service";
import { financialReportListRequestSchema } from "./financial-reports.types";
import { TemplateEngine } from "@/lib/statement-engine/engines/template-engine";
import { DataAggregationEngine } from "@/lib/statement-engine/engines/data-aggregation-engine";
import { FormulaEngine } from "@/lib/statement-engine/engines/formula-engine";
import {
  DataFilters,
  EventType,
  StatementLine,
  FinancialStatementResponse
} from "@/lib/statement-engine/types/core.types";
import { reportingPeriods, facilities, districts, provinces } from "@/api/db/schema";
import { buildFacilityFilter } from "@/api/lib/utils/query-filters";
import { BudgetVsActualProcessor } from "./budget-vs-actual-processor";
import { CarryforwardService } from "@/lib/statement-engine/services/carryforward-service";
import type { WorkingCapitalCalculationResult } from "@/lib/statement-engine/services/working-capital-calculator";
import { snapshotService } from "@/lib/services/snapshot-service";
import { pdfGenerationService } from "./pdf-generation.service";
import { notificationService } from "@/lib/services/notification.service";

import { canAccessFacility } from "@/api/lib/utils/get-user-facility";
import { getUserContext } from "@/api/lib/utils/get-user-facility";

export const list: AppRouteHandler<ListRoute> = async (c) => {
  try {
    // Get user context to retrieve accessible facility IDs
    const userContext = await getUserContext(c);
    const accessibleFacilityIds = userContext.accessibleFacilityIds;
    const user = c.get('user');

    // Check if user has access to any facilities
    if (accessibleFacilityIds.length === 0) {
      return c.json({
        reports: [],
        pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
        summary: { totalReports: 0, byType: {}, byFiscalYear: {}, byProject: {} },
        message: "No accessible facilities found for user"
      }, HttpStatusCodes.FORBIDDEN);
    }

    const query = c.req.query();

    // Schema now uses z.coerce to automatically convert string query params to numbers
    const parsed = financialReportListRequestSchema.parse(query);

    const {
      projectId,
      facilityId,
      fiscalYear,
      reportType,
      status,
      createdBy,
      fromDate,
      toDate,
      page,
      limit,
    } = parsed;

    const conditions = [];

    // Add facility filter based on hierarchy access control
    // If a specific facility is requested, check if user has access
    if (facilityId && facilityId > 0) {
      if (!accessibleFacilityIds.includes(facilityId)) {
        return c.json({
          reports: [],
          pagination: { page, limit, total: 0, totalPages: 0 },
          summary: { totalReports: 0, byType: {}, byFiscalYear: {}, byProject: {} },
          message: "Access denied: facility not in your hierarchy"
        }, HttpStatusCodes.FORBIDDEN);
      }
      // Filter by the specific facility
      conditions.push(eq(financialReports.facilityId, facilityId));
    } else {
      // Filter by all accessible facilities from hierarchy
      conditions.push(sql`${financialReports.facilityId} IN (${sql.join(accessibleFacilityIds.map(id => sql`${id}`), sql`, `)})`);
    }

    if (projectId && projectId > 0) conditions.push(eq(financialReports.projectId, projectId));
    if (fiscalYear) conditions.push(eq(financialReports.fiscalYear, fiscalYear));
    if (reportType) {
      // Map reportType enum to actual statementCode stored in metadata
      const reportTypeToStatementCode: Record<string, string> = {
        'revenue_expenditure': 'REV_EXP',
        'balance_sheet': 'ASSETS_LIAB',
        'cash_flow': 'CASH_FLOW',
        'net_assets_changes': 'NET_ASSETS_CHANGES',
        'budget_vs_actual': 'BUDGET_VS_ACTUAL',
      };
      const statementCode = reportTypeToStatementCode[reportType] || reportType;
      conditions.push(sql`${financialReports.metadata}->>'statementCode' = ${statementCode}`);
    }
    if (status) conditions.push(eq(financialReports.status, status));
    if (createdBy) conditions.push(eq(financialReports.createdBy, createdBy));
    if (fromDate) conditions.push(gte(financialReports.createdAt, new Date(fromDate)));
    if (toDate) conditions.push(lte(financialReports.createdAt, new Date(toDate)));

    const offset = (Number(page) - 1) * Number(limit);

    const [reports, totalCount] = await Promise.all([
      db.query.financialReports.findMany({
        where: conditions.length > 0 ? and(...conditions) : undefined,
        orderBy: [desc(financialReports.createdAt)],
        limit,
        offset,
        with: {
          project: true,
          facility: {
            with: {
              district: true,
            },
          },
          reportingPeriod: true,
          creator: true,
          dafApprover: true,
          dgApprover: true,
        },
      }),
      db.$count(financialReports,
        conditions.length > 0 ? and(...conditions) : undefined
      ),
    ]);

    // Get workflow log counts for each report
    const reportIds = reports.map(r => r.id);
    const workflowLogCounts = reportIds.length > 0 ? await db
      .select({
        reportId: financialReportWorkflowLogs.reportId,
        count: sql<number>`count(*)::int`.as('count'),
      })
      .from(financialReportWorkflowLogs)
      .where(sql`${financialReportWorkflowLogs.reportId} IN (${sql.join(reportIds.map(id => sql`${id}`), sql`, `)})`)
      .groupBy(financialReportWorkflowLogs.reportId)
      : [];

    // Create a map of report ID to workflow log count
    const workflowLogCountMap = new Map(
      workflowLogCounts.map(item => [item.reportId, item.count])
    );

    // Add workflow log count and facility hierarchy information to each report
    const reportsWithWorkflowLogCount = reports.map(report => ({
      ...report,
      workflowLogCount: workflowLogCountMap.get(report.id) || 0,
      // Add facility hierarchy information
      facilityHierarchy: {
        isAccessible: accessibleFacilityIds.includes(report.facilityId),
        facilityType: report.facility?.facilityType,
        parentFacilityId: report.facility?.parentFacilityId,
        districtId: report.facility?.districtId,
        districtName: report.facility?.district?.name,
      },
    }));

    // Generate summary statistics
    const [typeCounts, fiscalYearCounts, projectCounts] = await Promise.all([
      // Count by report type (from metadata)
      db.select({
        reportType: sql`metadata->>'statementCode'`.as('reportType'),
        count: sql`count(*)::int`,
      })
        .from(financialReports)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .groupBy(sql`metadata->>'statementCode'`),

      // Count by fiscal year
      db.select({
        fiscalYear: financialReports.fiscalYear,
        count: sql`count(*)::int`,
      })
        .from(financialReports)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .groupBy(financialReports.fiscalYear),

      // Count by project
      db.select({
        projectId: financialReports.projectId,
        count: sql`count(*)::int`,
      })
        .from(financialReports)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .groupBy(financialReports.projectId),
    ]);

    const summary = {
      totalReports: totalCount,
      byType: Object.fromEntries(typeCounts.map(t => [t.reportType || 'unknown', t.count])),
      byFiscalYear: Object.fromEntries(fiscalYearCounts.map(f => [f.fiscalYear, f.count])),
      byProject: Object.fromEntries(projectCounts.map(p => [p.projectId.toString(), p.count])),
    };

    return c.json({
      reports: reportsWithWorkflowLogCount,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / Number(limit)),
      },
      summary,
    });
  } catch (error: any) {
    console.error('Error fetching financial reports:', error);
    return c.json(
      { message: "Failed to fetch financial reports", error: error.message },
      HttpStatusCodes.INTERNAL_SERVER_ERROR
    );
  }
};

export const getOne: AppRouteHandler<GetOneRoute> = async (c) => {
  const { id } = c.req.param();
  const reportId = parseInt(id);

  try {
    // Get user context to retrieve accessible facility IDs
    const userContext = await getUserContext(c);
    const accessibleFacilityIds = userContext.accessibleFacilityIds;
    const user = c.get('user');

    const report = await db.query.financialReports.findFirst({
      where: eq(financialReports.id, reportId),
      with: {
        project: true,
        facility: {
          with: {
            district: true,
          },
        },
        reportingPeriod: true,
        creator: true,
        updater: true,
        submitter: true,
        approver: true,
        dafApprover: true,
        dgApprover: true,
      },
    });

    if (!report) {
      return c.json({
        message: "Financial report not found",
      }, HttpStatusCodes.NOT_FOUND);
    }

    // Validate facility access using hierarchy
    if (!accessibleFacilityIds.includes(report.facilityId)) {
      return c.json(
        { message: "Access denied: facility not in your hierarchy" },
        HttpStatusCodes.FORBIDDEN
      );
    }

    // Task 22: Verify snapshot integrity if report has snapshot data (Requirements: 10.1, 10.2, 10.3)
    const isSubmittedOrApproved = ['submitted', 'pending_daf_approval', 'approved_by_daf',
      'pending_dg_approval', 'fully_approved', 'approved'].includes(report.status);

    if (isSubmittedOrApproved && report.reportData && report.snapshotChecksum) {
      const isValid = await snapshotService.verifyChecksum(report.id);

      if (!isValid) {
        // Log critical error (Requirement 10.4)
        console.error(
          `[CRITICAL] Snapshot integrity validation failed for report ${report.id}. ` +
          `Report: ${report.id}, Status: ${report.status}, Facility: ${report.facilityId}`
        );

        // Notify administrators (Requirement 10.5)
        try {
          const adminUsers = await notificationService.getAdminUsersForNotification();
          if (adminUsers.length > 0) {
            console.error(
              `[ADMIN NOTIFICATION] Snapshot corruption detected for report ${report.id}. ` +
              `Notifying ${adminUsers.length} administrators.`
            );
          }
        } catch (notificationError) {
          console.error('Failed to notify administrators of snapshot corruption:', notificationError);
        }

        // Add corruption flag to response but still return the report metadata
        return c.json({
          ...report,
          snapshotCorrupted: true,
          snapshotError: "Snapshot integrity check failed. Report data may be corrupted.",
          // Add facility hierarchy information
          facilityHierarchy: {
            isAccessible: accessibleFacilityIds.includes(report.facilityId),
            facilityType: report.facility?.facilityType,
            parentFacilityId: report.facility?.parentFacilityId,
            districtId: report.facility?.districtId,
            districtName: report.facility?.district?.name,
          },
        }, HttpStatusCodes.OK);
      }
    }

    // Add facility hierarchy information to response
    const reportWithHierarchy = {
      ...report,
      facilityHierarchy: {
        isAccessible: accessibleFacilityIds.includes(report.facilityId),
        facilityType: report.facility?.facilityType,
        parentFacilityId: report.facility?.parentFacilityId,
        districtId: report.facility?.districtId,
        districtName: report.facility?.district?.name,
      },
    };

    return c.json(reportWithHierarchy, HttpStatusCodes.OK);
  } catch (error: any) {
    console.error('Error fetching financial report:', error);
    return c.json(
      { message: "Failed to fetch financial report", error: error.message },
      HttpStatusCodes.INTERNAL_SERVER_ERROR
    );
  }
};

export const patch: AppRouteHandler<PatchRoute> = async (c) => {
  const { id } = c.req.param();
  const reportId = parseInt(id);

  try {
    // Get user context to retrieve accessible facility IDs
    const userContext = await getUserContext(c);
    const accessibleFacilityIds = userContext.accessibleFacilityIds;
    const user = c.get('user');

    // First, fetch the report to check its facility and lock status
    const report = await db.query.financialReports.findFirst({
      where: eq(financialReports.id, reportId),
    });

    if (!report) {
      return c.json({
        message: "Financial report not found",
      }, HttpStatusCodes.NOT_FOUND);
    }

    // Validate facility access using hierarchy
    if (!accessibleFacilityIds.includes(report.facilityId)) {
      return c.json(
        { message: "Access denied: facility not in your hierarchy" },
        HttpStatusCodes.FORBIDDEN
      );
    }

    // Check if report is locked (Requirement 6.5)
    if (report.locked) {
      return c.json(
        {
          message: "Cannot edit locked report. This report is currently under review or has been approved.",
          error: "Report is locked"
        },
        HttpStatusCodes.FORBIDDEN
      );
    }

    // Parse and validate update data
    const body = await c.req.json();

    // Prevent updating locked field directly through this endpoint
    if ('locked' in body) {
      delete body.locked;
    }

    // Update the report
    const updatedReports = await db.update(financialReports)
      .set({
        ...body,
        updatedBy: parseInt(user.id),
        updatedAt: new Date(),
      })
      .where(eq(financialReports.id, reportId))
      .returning();

    if (updatedReports.length === 0) {
      return c.json({
        message: "Financial report not found",
      }, HttpStatusCodes.NOT_FOUND);
    }

    // Fetch the updated report with relations
    const updatedReport = await db.query.financialReports.findFirst({
      where: eq(financialReports.id, reportId),
      with: {
        project: true,
        facility: {
          with: {
            district: true,
          },
        },
        reportingPeriod: true,
        creator: true,
        updater: true,
        submitter: true,
        approver: true,
        dafApprover: true,
        dgApprover: true,
      },
    });

    // Add facility hierarchy information to response
    const reportWithHierarchy = {
      ...updatedReport,
      facilityHierarchy: {
        isAccessible: accessibleFacilityIds.includes(updatedReport!.facilityId),
        facilityType: updatedReport?.facility?.facilityType,
        parentFacilityId: updatedReport?.facility?.parentFacilityId,
        districtId: updatedReport?.facility?.districtId,
        districtName: updatedReport?.facility?.district?.name,
      },
    };

    return c.json(reportWithHierarchy, HttpStatusCodes.OK);
  } catch (error: any) {
    console.error('Error updating financial report:', error);
    return c.json(
      { message: "Failed to update financial report", error: error.message },
      HttpStatusCodes.INTERNAL_SERVER_ERROR
    );
  }
};

export const remove: AppRouteHandler<RemoveRoute> = async (c) => {
  const { id } = c.req.param();
  const reportId = parseInt(id);

  try {
    // Get user context to retrieve accessible facility IDs
    const userContext = await getUserContext(c);
    const accessibleFacilityIds = userContext.accessibleFacilityIds;
    const user = c.get('user');

    // First, fetch the report to check its facility
    const report = await db.query.financialReports.findFirst({
      where: eq(financialReports.id, reportId),
    });

    if (!report) {
      return c.json({
        message: "Financial report not found",
      }, HttpStatusCodes.NOT_FOUND);
    }

    // Validate facility access using hierarchy
    if (!accessibleFacilityIds.includes(report.facilityId)) {
      return c.json(
        { message: "Access denied: facility not in your hierarchy" },
        HttpStatusCodes.FORBIDDEN
      );
    }

    // Proceed with deletion
    const result = await db.delete(financialReports)
      .where(eq(financialReports.id, reportId))
      .returning();

    if (result.length === 0) {
      return c.json({
        message: "Financial report not found",
      }, HttpStatusCodes.NOT_FOUND);
    }
    return c.body(null, HttpStatusCodes.NO_CONTENT);
  } catch (error: any) {
    console.error('Error deleting financial report:', error);
    return c.json(
      { message: "Failed to delete financial report", error: error.message },
      HttpStatusCodes.INTERNAL_SERVER_ERROR
    );
  }
};

export const generateStatement: AppRouteHandler<GenerateStatementRoute> = async (c) => {
  const startTime = Date.now();
  let requestBody: any = {};

  try {
    // Get user context to retrieve accessible facility IDs
    const userContext = await getUserContext(c);
    const accessibleFacilityIds = userContext.accessibleFacilityIds;
    const user = c.get('user');
    const userFacility = userContext.facilityId;

    // Task 7: Log user context resolution with facility count (Requirement 4.1)

    // Check if user has no accessible facilities
    if (accessibleFacilityIds.length === 0) {
      return c.json(
        { message: "No accessible facilities found for user" },
        HttpStatusCodes.FORBIDDEN
      );
    }

    // Parse and validate request body
    requestBody = await c.req.json();
    const {
      statementCode,
      reportingPeriodId,
      projectType,
      facilityId: requestedFacilityId, // NEW: Extract facilityId from request (optional)
      aggregationLevel = 'DISTRICT', // NEW: Default to district (Subtask 5.1)
      includeFacilityBreakdown = false, // NEW: Default to false (Subtask 5.1)
      includeComparatives = true,
      customMappings = {},
      reportId // NEW: Optional report ID for snapshot-based display (Task 10)
    } = requestBody;

    // Task 10: Check if reportId is provided and handle snapshot data (Requirements: 3.1, 3.2, 3.3, 3.4, 3.5)
    if (reportId) {
      // Fetch the report to check its status
      const report = await db.query.financialReports.findFirst({
        where: eq(financialReports.id, reportId),
        with: {
          project: true,
          facility: {
            with: {
              district: true,
            },
          },
          reportingPeriod: true,
        },
      });

      if (!report) {
        return c.json({
          message: "Financial report not found",
        }, HttpStatusCodes.NOT_FOUND);
      }

      // Validate facility access using hierarchy
      if (!accessibleFacilityIds.includes(report.facilityId)) {
        return c.json(
          { message: "Access denied: facility not in your hierarchy" },
          HttpStatusCodes.FORBIDDEN
        );
      }

      // Check report status - if submitted or approved, return snapshot data
      const isSubmittedOrApproved = ['submitted', 'pending_daf_approval', 'approved_by_daf',
        'pending_dg_approval', 'fully_approved', 'approved'].includes(report.status);

      if (isSubmittedOrApproved && report.reportData) {
        // Task 22: Verify snapshot integrity before displaying (Requirements: 10.1, 10.2, 10.3, 10.4, 10.5)
        const isValid = await snapshotService.verifyChecksum(report.id);

        if (!isValid) {
          // Log critical error (Requirement 10.4)
          console.error(
            `[CRITICAL] Snapshot integrity validation failed for report ${report.id}. ` +
            `Report: ${report.id}, Status: ${report.status}, Facility: ${report.facilityId}`
          );

          // Notify administrators (Requirement 10.5)
          try {
            const adminUsers = await notificationService.getAdminUsersForNotification();
            if (adminUsers.length > 0) {
              // Log the integrity failure for admin review
              console.error(
                `[ADMIN NOTIFICATION] Snapshot corruption detected for report ${report.id}. ` +
                `Notifying ${adminUsers.length} administrators.`
              );
              // Note: In a production system, you would send actual email/in-app notifications here
              // For now, we log the notification intent
            }
          } catch (notificationError) {
            console.error('Failed to notify administrators of snapshot corruption:', notificationError);
          }

          // Prevent display of corrupted report (Requirement 10.5)
          return c.json({
            error: "SNAPSHOT_CORRUPTED",
            message: "Snapshot integrity check failed. Report data may be corrupted.",
            details: "The snapshot checksum does not match the stored value. This report cannot be displayed for security reasons.",
            reportId: report.id,
            reportStatus: report.status,
          }, HttpStatusCodes.INTERNAL_SERVER_ERROR);
        }

        // Return snapshot data from reportData field (Requirement 3.2, 3.3)
        const processingTime = Date.now() - startTime;

        // Task 1: Validate and extract snapshot data (Requirements: 1.1, 1.2, 1.3, 1.4)
        // Step 1: Validate reportData exists and has correct structure
        if (!report.reportData || typeof report.reportData !== 'object') {
          console.error(
            `[SNAPSHOT ERROR] Report ${report.id} has no valid snapshot data. ` +
            `Status: ${report.status}, reportData exists: ${!!report.reportData}`
          );
          return c.json({
            error: "SNAPSHOT_MISSING",
            message: "Snapshot data is missing for this report",
            reportId: report.id,
            reportStatus: report.status,
          }, HttpStatusCodes.INTERNAL_SERVER_ERROR);
        }

        // Step 2: Extract snapshot data
        const snapshotData = report.reportData as any;

        // Step 3: Validate statement exists and has required structure
        if (!snapshotData.statement || !snapshotData.statement.lines) {
          console.error(
            `[SNAPSHOT ERROR] Report ${report.id} has invalid snapshot structure. ` +
            `Has statement: ${!!snapshotData.statement}, ` +
            `Has lines: ${!!snapshotData.statement?.lines}`
          );
          return c.json({
            error: "SNAPSHOT_INVALID",
            message: "Snapshot data structure is invalid",
            reportId: report.id,
            reportStatus: report.status,
          }, HttpStatusCodes.INTERNAL_SERVER_ERROR);
        }

        // Step 3b: If snapshot has no lines, fall back to live generation
        if (Array.isArray(snapshotData.statement.lines) && snapshotData.statement.lines.length === 0) {
          console.warn(
            `[SNAPSHOT WARNING] Report ${report.id} snapshot has 0 lines; ` +
            `falling back to live generation for preview.`
          );
          // Intentionally do not return; continue with live generation logic below
        } else {
          // Step 4: Build response with proper structure
          // Use the snapshot's capturedAt timestamp as generatedAt (Requirement 1.4)
          const response = {
            statement: {
              statementCode: snapshotData.statement.statementCode,
              statementName: snapshotData.statement.statementName,
              reportingPeriod: snapshotData.statement.reportingPeriod,
              facility: snapshotData.statement.facility,
              generatedAt: snapshotData.capturedAt, // Use snapshot timestamp
              lines: snapshotData.statement.lines,
              totals: snapshotData.statement.totals,
              metadata: snapshotData.statement.metadata,
            },
            validation: snapshotData.validation || {
              isValid: true,
              accountingEquation: {
                isValid: true,
                leftSide: 0,
                rightSide: 0,
                difference: 0,
                equation: 'Snapshot'
              },
              businessRules: [],
              warnings: [],
              errors: [],
              formattedMessages: {
                critical: [],
                warnings: [],
                info: []
              },
              summary: {
                totalChecks: 0,
                passedChecks: 0,
                criticalErrors: 0,
                warnings: 0,
                overallStatus: 'VALID'
              }
            },
            performance: {
              processingTimeMs: processingTime,
              linesProcessed: snapshotData.statement.lines.length,
              eventsProcessed: 0,
              formulasCalculated: 0,
            },
            // Task 10: Add snapshot metadata flags (Requirements: 3.4, 3.5)
            snapshotMetadata: {
              isSnapshot: true,
              snapshotTimestamp: snapshotData.capturedAt || report.snapshotTimestamp?.toISOString() || null,
              isOutdated: report.isOutdated || false,
              reportId: report.id,
              reportStatus: report.status,
              version: snapshotData.version || report.version,
            }
          };

          console.log(
            `[SNAPSHOT] Retrieved snapshot for report ${report.id}, ` +
            `status: ${report.status}, lines: ${snapshotData.statement.lines.length}`
          );

          return c.json(response, HttpStatusCodes.OK);
        }
      }

      // If report is draft or rejected, continue with live data generation (Requirement 3.1)
      // Fall through to existing logic below
    }

    // NEW: Integrate aggregation level determination (Subtask 5.2)
    // Determine effective facility IDs based on aggregation level using hierarchy context
    let effectiveFacilityIds: number[];

    // Validate requested facility access if specified
    if (requestedFacilityId) {
      if (!accessibleFacilityIds.includes(requestedFacilityId)) {
        return c.json({
          message: 'Access denied to facility',
          context: {
            facilityId: requestedFacilityId,
            aggregationLevel,
            statementCode,
            reportingPeriodId
          }
        }, HttpStatusCodes.FORBIDDEN);
      }
    }

    // Determine effective facility IDs based on aggregation level
    if (aggregationLevel === 'FACILITY') {
      if (!requestedFacilityId) {
        return c.json({
          message: 'facilityId is required when aggregationLevel is FACILITY',
          context: {
            aggregationLevel,
            statementCode,
            reportingPeriodId
          }
        }, HttpStatusCodes.BAD_REQUEST);
      }
      effectiveFacilityIds = [requestedFacilityId];
    } else {
      // For DISTRICT or PROVINCE level, use all accessible facilities
      effectiveFacilityIds = accessibleFacilityIds;
    }

    // Task 7: Log aggregation level and effective facility count (Requirement 4.2)

    // For backward compatibility, use the first facility ID as the primary facilityId
    // This maintains compatibility with existing code that expects a single facilityId
    const primaryFacilityId = effectiveFacilityIds.length > 0 ? effectiveFacilityIds[0] : (userFacility || undefined);

    // Initialize the three engines
    const templateEngine = new TemplateEngine(db);
    const dataEngine = new DataAggregationEngine(db);
    const formulaEngine = new FormulaEngine();

    // Step 1: Load statement template
    const template = await templateEngine.loadTemplate(statementCode);

    // Step 2: Extract event codes from template lines
    const eventCodes = template.lines
      .flatMap(line => line.eventMappings || [])
      .filter((code, index, array) => array.indexOf(code) === index); // Remove duplicates

    // Step 3: Facility access validation is now handled by buildFacilityFilter above

    // Step 4: Get the correct project ID for the project type
    const project = await db.query.projects.findFirst({
      where: sql`${projects.projectType} = ${projectType}`
    });

    if (!project) {
      return c.json({
        message: `No project found for project type: ${projectType}`,
        details: `Available project types can be found in the projects table`
      }, HttpStatusCodes.NOT_FOUND);
    }

    // Step 5: Set up data filters with effective facility IDs (Subtask 5.2)
    // Use effectiveFacilityIds determined by aggregation level
    const dataFilters: DataFilters = {
      projectId: project.id, // Use the actual project ID for the project type
      facilityId: primaryFacilityId, // Keep for backward compatibility with single facility queries
      facilityIds: effectiveFacilityIds, // Use effectiveFacilityIds from aggregation level determination
      reportingPeriodId,
      projectType,
      entityTypes: statementCode === 'BUDGET_VS_ACTUAL'
        ? [EventType.PLANNING, EventType.EXECUTION]
        : [EventType.EXECUTION]
    };

    // Step 6: Collect event data with district-based access control
    // Track data collection time for performance logging (Requirement 8.4)
    const dataCollectionStartTime = Date.now();
    const eventData = await dataEngine.collectEventData(dataFilters, eventCodes);

    // For BUDGET_VS_ACTUAL, we need separate aggregations for PLANNING and EXECUTION
    let planningData: any = null;
    let executionData: any = null;

    if (statementCode === 'BUDGET_VS_ACTUAL') {
      // Collect PLANNING data separately
      const planningFilters = { ...dataFilters, entityTypes: [EventType.PLANNING] };
      const planningEventData = await dataEngine.collectEventData(planningFilters, eventCodes);
      planningData = await dataEngine.aggregateByEvent(planningEventData);

      // Collect EXECUTION data separately  
      const executionFilters = { ...dataFilters, entityTypes: [EventType.EXECUTION] };
      const executionEventData = await dataEngine.collectEventData(executionFilters, eventCodes);
      executionData = await dataEngine.aggregateByEvent(executionEventData);

      // Budget vs Actual processing will be handled later after variables are declared
    }

    const dataCollectionTime = Date.now() - dataCollectionStartTime;

    // Task 7: Enhanced data collection performance logging (Requirements 4.2, 4.3, 8.4)

    // Task 6: Validate facility data completeness (Subtask 6.2)
    // Call validation after data collection
    const facilityValidation = await validateFacilityDataCompleteness(
      aggregationLevel,
      effectiveFacilityIds,
      planningData,
      executionData,
      reportingPeriodId
    );

    // Return error response for critical validation failures
    if (facilityValidation.errors.length > 0) {
      return c.json({
        message: 'Facility data validation failed',
        errors: facilityValidation.errors,
        warnings: facilityValidation.warnings,
        context: {
          aggregationLevel,
          facilityIds: effectiveFacilityIds,
          statementCode,
          reportingPeriodId
        }
      }, HttpStatusCodes.NOT_FOUND);
    }

    // Include warnings in validation results
    let facilityDataWarnings: string[] = [...facilityValidation.warnings];

    // Check if facilities have data and handle gracefully (legacy check)
    if (primaryFacilityId) {
      const facilitiesWithData = eventData.metadata.facilitiesIncluded;
      if (facilitiesWithData.length === 0) {
        facilityDataWarnings.push(`Facility ${primaryFacilityId} has no data for the specified period and criteria`);
      }
    }

    // Step 6.5: Get carryforward beginning cash for CASH_FLOW statements (Task 7.1)
    let carryforwardResult = null;
    if (statementCode === 'CASH_FLOW') {
      const carryforwardService = new CarryforwardService(db);

      carryforwardResult = await carryforwardService.getBeginningCash({
        reportingPeriodId,
        facilityId: primaryFacilityId,
        facilityIds: effectiveFacilityIds,
        projectType,
        statementCode
      });
    }

    // Step 7: Aggregate event data with facility breakdown
    const aggregationStartTime = Date.now();
    const aggregatedData = await dataEngine.aggregateByEvent(eventData);
    const aggregationTime = Date.now() - aggregationStartTime;

    // Task 7: Log aggregation results (Requirement 4.3)

    // Step 7.5: Inject carryforward beginning cash into aggregated data (Task 7.2)
    if (carryforwardResult && carryforwardResult.success && carryforwardResult.beginningCash !== 0) {
      // Only inject if source is CARRYFORWARD or CARRYFORWARD_AGGREGATED
      // If source is MANUAL_ENTRY, the data is already in the aggregation from execution data
      if (carryforwardResult.source === 'CARRYFORWARD' || carryforwardResult.source === 'CARRYFORWARD_AGGREGATED') {
        // Add to event totals map with CASH_EQUIVALENTS_BEGIN event code (event ID 21)
        const existingAmount = aggregatedData.eventTotals.get('CASH_EQUIVALENTS_BEGIN') || 0;

        // If there's already a manual entry, preserve it (Requirement: 6.1)
        if (existingAmount === 0) {
          // No manual entry, use carryforward
          aggregatedData.eventTotals.set('CASH_EQUIVALENTS_BEGIN', carryforwardResult.beginningCash);
        }
      }
    }



    // Step 6.6: Declare working capital variables (calculation happens after Step 8)
    let workingCapitalResult: WorkingCapitalCalculationResult | null = null;
    let balanceSheetContext: { current: Map<string, number>; previous: Map<string, number> } | undefined;

    // Get facility aggregation information if multiple facilities are involved
    let facilityAggregationInfo = undefined;
    if (eventData.metadata.facilitiesIncluded.length > 1 || (!primaryFacilityId && eventData.metadata.facilitiesIncluded.length > 0)) {
      facilityAggregationInfo = await generateFacilityAggregationInfo(
        eventData.metadata.facilitiesIncluded,
        aggregatedData,
        dataEngine
      );
    }

    // Step 8: Calculate period comparisons if requested
    let periodComparison = null;
    let hasPreviousPeriodData = false;

    if (includeComparatives) {
      if (eventData.previousPeriod.length > 0) {
        const previousAggregation = await dataEngine.aggregateByEvent({
          currentPeriod: eventData.previousPeriod,
          previousPeriod: [],
          metadata: eventData.metadata
        });
        periodComparison = dataEngine.calculatePeriodComparisons(aggregatedData, previousAggregation);
        hasPreviousPeriodData = true;
      } else {
        // Handle missing previous period data gracefully
        const emptyAggregation = {
          eventTotals: new Map<string, number>(),
          facilityTotals: new Map<number, number>(),
          periodTotals: new Map<number, number>(),
          metadata: {
            totalEvents: 0,
            totalFacilities: 0,
            totalAmount: 0,
            aggregationMethod: 'SUM',
            processingTime: 0
          }
        };
        periodComparison = dataEngine.calculatePeriodComparisons(aggregatedData, emptyAggregation);
        hasPreviousPeriodData = false;
      }
    }

    // Step 8.5: Calculate working capital changes for CASH_FLOW statements from aggregated data
    if (statementCode === 'CASH_FLOW') {
      try {
        // Calculate from aggregated event data instead of querying database
        // This works with both traditional schema_form_data_entries and quarterly JSON data
        // Note: Only ADVANCE_PAYMENTS is mapped to receivables activities (VAT refund, Other Receivables)
        const receivablesEventCodes = ['ADVANCE_PAYMENTS'];
        const payablesEventCodes = ['PAYABLES'];

        // Sum current period receivables and payables
        let currentReceivables = 0;
        for (const eventCode of receivablesEventCodes) {
          currentReceivables += aggregatedData.eventTotals.get(eventCode) || 0;
        }

        let currentPayables = 0;
        for (const eventCode of payablesEventCodes) {
          currentPayables += aggregatedData.eventTotals.get(eventCode) || 0;
        }

        // Sum previous period receivables and payables (if comparison data available)
        let previousReceivables = 0;
        let previousPayables = 0;

        if (periodComparison) {
          for (const eventCode of receivablesEventCodes) {
            previousReceivables += periodComparison.previousPeriod.eventTotals.get(eventCode) || 0;
          }
          for (const eventCode of payablesEventCodes) {
            previousPayables += periodComparison.previousPeriod.eventTotals.get(eventCode) || 0;
          }
        }

        // Calculate changes
        const receivablesChange = currentReceivables - previousReceivables;
        const payablesChange = currentPayables - previousPayables;

        // Apply cash flow signs
        const receivablesCashFlowAdjustment = -receivablesChange;
        const payablesCashFlowAdjustment = payablesChange;  // Note: payables increase is positive for cash flow

        // Build working capital result structure
        workingCapitalResult = {
          receivablesChange: {
            accountType: 'RECEIVABLES',
            currentPeriodBalance: currentReceivables,
            previousPeriodBalance: previousReceivables,
            change: receivablesChange,
            cashFlowAdjustment: receivablesCashFlowAdjustment,
            eventCodes: receivablesEventCodes
          },
          payablesChange: {
            accountType: 'PAYABLES',
            currentPeriodBalance: currentPayables,
            previousPeriodBalance: previousPayables,
            change: payablesChange,
            cashFlowAdjustment: payablesCashFlowAdjustment,
            eventCodes: payablesEventCodes
          },
          warnings: [],
          metadata: {
            currentPeriodId: reportingPeriodId,
            previousPeriodId: periodComparison ? eventData.previousPeriod[0]?.reportingPeriodId : null,
            facilitiesIncluded: effectiveFacilityIds || [],
            calculationTimestamp: new Date()
          }
        };

        // Prepare balance sheet context for formula engine
        balanceSheetContext = {
          current: new Map<string, number>(),
          previous: new Map<string, number>()
        };

        balanceSheetContext.current.set('RECEIVABLES_TOTAL', currentReceivables);
        balanceSheetContext.current.set('PAYABLES_TOTAL', currentPayables);
        balanceSheetContext.previous.set('RECEIVABLES_TOTAL', previousReceivables);
        balanceSheetContext.previous.set('PAYABLES_TOTAL', previousPayables);

      } catch (error) {
        // Continue without working capital data if calculation fails
        workingCapitalResult = null;
        balanceSheetContext = undefined;
      }
    }

    // Step 9: Get reporting period for fiscal year context
    const reportingPeriod = await db.query.reportingPeriods.findFirst({
      where: eq(reportingPeriods.id, reportingPeriodId)
    });

    // Get fiscal year context for dynamic placeholders
    const fiscalYearContext = await getFiscalYearContext(reportingPeriod);

    // Step 10: Build event ID to event code mapping for efficient lookup
    const eventIdToCodeMap = new Map<number, string>();
    const allEvents = await db.query.events.findMany();
    for (const event of allEvents) {
      eventIdToCodeMap.set(event.id, event.code);
    }

    // Step 10.5: Calculate cross-statement values for Balance Sheet (ASSETS_LIAB)
    // The surplus/deficit in the equity section should come from Revenue & Expenditure (TOTAL_REVENUE - TOTAL_EXPENSES)
    let crossStatementValues: { surplusDeficit?: number; previousSurplusDeficit?: number } | undefined;
    
    if (statementCode === 'ASSETS_LIAB') {
      // Calculate TOTAL_REVENUE - TOTAL_EXPENSES from the same event data
      // Revenue event codes (from revenueExpenditureTemplates TOTAL_REVENUE formula)
      const revenueEventCodes = [
        'TAX_REVENUE', 'GRANTS', 'TRANSFERS_CENTRAL_TREASURY', 'TRANSFERS_PUBLIC_ENTITIES',
        'FINES_PENALTIES_LICENSES', 'PROPERTY_INCOME', 'SALES_GOODS_SERVICES',
        'PROCEEDS_SALE_CAPITAL', 'OTHER_REVENUE', 'DOMESTIC_BORROWINGS', 'EXTERNAL_BORROWINGS'
      ];
      
      // Expense event codes (from revenueExpenditureTemplates TOTAL_EXPENSES formula)
      const expenseEventCodes = [
        'COMPENSATION_EMPLOYEES', 'GOODS_SERVICES', 'GRANTS_TRANSFERS', 'SUBSIDIES',
        'SOCIAL_ASSISTANCE', 'FINANCE_COSTS', 'ACQUISITION_FIXED_ASSETS',
        'REPAYMENT_BORROWINGS', 'OTHER_EXPENSES'
      ];
      
      // Calculate current period totals
      let totalRevenue = 0;
      let totalExpenses = 0;
      
      for (const eventCode of revenueEventCodes) {
        totalRevenue += aggregatedData.eventTotals.get(eventCode) || 0;
      }
      
      for (const eventCode of expenseEventCodes) {
        totalExpenses += aggregatedData.eventTotals.get(eventCode) || 0;
      }
      
      const currentSurplusDeficit = totalRevenue - totalExpenses;
      
      // Calculate previous period totals if comparison data available
      let previousSurplusDeficit = 0;
      if (periodComparison) {
        let prevTotalRevenue = 0;
        let prevTotalExpenses = 0;
        
        for (const eventCode of revenueEventCodes) {
          prevTotalRevenue += periodComparison.previousPeriod.eventTotals.get(eventCode) || 0;
        }
        
        for (const eventCode of expenseEventCodes) {
          prevTotalExpenses += periodComparison.previousPeriod.eventTotals.get(eventCode) || 0;
        }
        
        previousSurplusDeficit = prevTotalRevenue - prevTotalExpenses;
      }
      
      crossStatementValues = {
        surplusDeficit: currentSurplusDeficit,
        previousSurplusDeficit: previousSurplusDeficit
      };
      
      console.log(`[CrossStatement] Balance Sheet surplus/deficit calculated:`, {
        totalRevenue,
        totalExpenses,
        currentSurplusDeficit,
        previousSurplusDeficit
      });
    }

    // Step 11: Build statement lines from template
    const statementLines: StatementLine[] = [];

    // Track previous period line values for formula calculations
    const previousPeriodLineValues = new Map<string, number>();

    for (const templateLine of template.lines) {
      // Calculate current period value
      let currentPeriodValue = 0;
      let previousPeriodValue = 0;
      let isWorkingCapitalComputed = false;

      // Task 4.2: Inject working capital cash flow adjustments for CHANGES_RECEIVABLES and CHANGES_PAYABLES
      // Note: We show the cash flow adjustment (change with proper sign), not the balance
      if (statementCode === 'CASH_FLOW' && workingCapitalResult) {
        if (templateLine.lineCode === 'CHANGES_RECEIVABLES') {
          currentPeriodValue = workingCapitalResult.receivablesChange.cashFlowAdjustment;
          previousPeriodValue = 0; // Previous period comparison not available for working capital changes
          isWorkingCapitalComputed = true;
        } else if (templateLine.lineCode === 'CHANGES_PAYABLES') {
          currentPeriodValue = workingCapitalResult.payablesChange.cashFlowAdjustment;
          previousPeriodValue = 0; // Previous period comparison not available for working capital changes
          isWorkingCapitalComputed = true;
        }
      }

      // Special processing for NET_ASSETS_CHANGES statement
      let accumulatedSurplus: number | null = null;
      let adjustments: number | null = null;
      let total: number | null = null;

      if (statementCode === 'NET_ASSETS_CHANGES') {
        // Special processing for NET_ASSETS_CHANGES statement

        // Check if we have data for the specific event codes
        // Note: templateLine.eventCodes comes from the template, but processing uses eventMappings
        const eventCodesToCheck = templateLine.eventCodes || templateLine.eventMappings || [];

        if (eventCodesToCheck && eventCodesToCheck.length > 0) {
          for (const eventCodeOrId of eventCodesToCheck) {
            const numericId = parseInt(eventCodeOrId);
            if (!isNaN(numericId)) {
              const eventCode = eventIdToCodeMap.get(numericId);
              if (eventCode) {
                const amount = aggregatedData.eventTotals.get(eventCode) || 0;
              }
            } else {
              const amount = aggregatedData.eventTotals.get(eventCodeOrId) || 0;
            }
          }
        }

        const netAssetsResult = await processNetAssetsChangesStatement(
          templateLine,
          aggregatedData,
          periodComparison,
          eventIdToCodeMap,
          customMappings,
          formulaEngine,
          statementLines,
          periodComparison?.previousPeriod // Pass previous period data for PREV_CURRENT lines
        );


        // For NET_ASSETS_CHANGES, use the calculated values
        currentPeriodValue = netAssetsResult.currentPeriodValue;
        previousPeriodValue = netAssetsResult.previousPeriodValue;
        accumulatedSurplus = netAssetsResult.accumulatedSurplus;
        adjustments = netAssetsResult.adjustments;
        total = netAssetsResult.total;

        isWorkingCapitalComputed = true; // Skip normal processing
      }

      // Only calculate if not already set by working capital logic or NET_ASSETS_CHANGES
      // Note: We check isWorkingCapitalComputed flag because zero is a valid working capital adjustment
      if (!isWorkingCapitalComputed) {
        if (templateLine.calculationFormula || shouldComputeTotal(templateLine.lineCode)) {
          // Use formula engine for calculated lines or handle special total lines
          const context = {
            eventValues: aggregatedData.eventTotals,
            lineValues: new Map(statementLines.map(line => [line.metadata.lineCode, line.currentPeriodValue])),
            previousPeriodValues: new Map(),
            customMappings,
            balanceSheet: balanceSheetContext, // Add balance sheet context for working capital calculations
            crossStatementValues // Add cross-statement values for Balance Sheet surplus/deficit
          };

          try {
            if (templateLine.calculationFormula) {
              currentPeriodValue = await formulaEngine.evaluateFormula(templateLine.calculationFormula, context);
            } else {
              // Handle special total lines that don't have formulas in template
              currentPeriodValue = calculateSpecialTotal(templateLine.lineCode, statementLines, statementCode);
            }
          } catch (error) {
            currentPeriodValue = 0;
          }
        } else {
          // Sum event mappings for data lines - handle both event IDs and event codes
          if (statementCode === 'BUDGET_VS_ACTUAL' && executionData && planningData) {
            // For BUDGET_VS_ACTUAL: currentPeriodValue = EXECUTION, previousPeriodValue = PLANNING
            for (const eventCodeOrId of templateLine.eventMappings || []) {
              let eventCodeToLookup = eventCodeOrId;

              // If it's a number, convert to event code using our mapping
              const numericId = parseInt(eventCodeOrId);
              if (!isNaN(numericId)) {
                const eventCode = eventIdToCodeMap.get(numericId);
                if (eventCode) {
                  eventCodeToLookup = eventCode;
                }
              }

              // Actual (EXECUTION data)
              const actualAmount = executionData.eventTotals.get(eventCodeToLookup) || 0;
              currentPeriodValue += actualAmount;

              // Budget (PLANNING data) - map execution events to their planning counterparts
              const planningEventCode = mapExecutionToPlanningEvent(eventCodeToLookup);
              const budgetAmount = planningData.eventTotals.get(planningEventCode) || 0;
              previousPeriodValue += budgetAmount;
            }
          } else {
            // Regular statement processing
            for (const eventCodeOrId of templateLine.eventMappings || []) {
              let eventCodeToLookup = eventCodeOrId;

              // If it's a number, convert to event code using our mapping
              const numericId = parseInt(eventCodeOrId);
              if (!isNaN(numericId)) {
                const eventCode = eventIdToCodeMap.get(numericId);
                if (eventCode) {
                  eventCodeToLookup = eventCode;
                }
              }

              const amount = aggregatedData.eventTotals.get(eventCodeToLookup) || 0;
              currentPeriodValue += amount;
            }
          }
        }
      } // Close the "if (!isWorkingCapitalComputed)" block

      // Calculate previous period value if comparison data available
      if (periodComparison) {
        // Task 4.2: Handle previous period for working capital lines
        // For working capital, the previous period would show the change from the period before that
        // For simplicity, we'll set it to 0 for now (can be enhanced later to calculate recursively)
        if (isWorkingCapitalComputed) {
          // Previous period working capital changes would require querying two periods back
          // For now, we keep it as 0 (already set above when current period was computed)
        } else if (templateLine.calculationFormula || shouldComputeTotal(templateLine.lineCode)) {
          if (templateLine.calculationFormula) {
            // Use formula engine for calculated lines with previous period context
            // Use the accumulated previous period line values
            const previousContext = {
              eventValues: periodComparison.previousPeriod.eventTotals,
              lineValues: previousPeriodLineValues,
              previousPeriodValues: new Map(),
              customMappings,
              balanceSheet: balanceSheetContext, // Add balance sheet context for working capital calculations
              crossStatementValues: crossStatementValues ? {
                surplusDeficit: crossStatementValues.previousSurplusDeficit,
                previousSurplusDeficit: undefined
              } : undefined // Use previous period surplus/deficit for previous period context
            };

            try {
              previousPeriodValue = await formulaEngine.evaluateFormula(templateLine.calculationFormula, previousContext);
            } catch (error) {
              previousPeriodValue = 0;
            }
          } else {
            // Handle special total lines for previous period
            // Build a temporary array of previous period lines for calculation
            const previousPeriodLines = Array.from(previousPeriodLineValues.entries()).map(([lineCode, value]) => ({
              metadata: { lineCode },
              currentPeriodValue: value,
              previousPeriodValue: 0
            }));
            previousPeriodValue = calculateSpecialTotal(templateLine.lineCode, previousPeriodLines as any, statementCode);
          }
        } else {
          // Sum event mappings for data lines - handle both event IDs and event codes
          for (const eventCodeOrId of templateLine.eventMappings || []) {
            let eventCodeToLookup = eventCodeOrId;

            // If it's a number, convert to event code using our mapping
            const numericId = parseInt(eventCodeOrId);
            if (!isNaN(numericId)) {
              const eventCode = eventIdToCodeMap.get(numericId);
              if (eventCode) {
                eventCodeToLookup = eventCode;
              }
            }

            previousPeriodValue += periodComparison.previousPeriod.eventTotals.get(eventCodeToLookup) || 0;
          }
        }

        // Store previous period value for use in subsequent formula calculations
        previousPeriodLineValues.set(templateLine.lineCode, previousPeriodValue);
      }

      // Calculate variance using the enhanced variance calculator
      let variance = undefined;
      if (includeComparatives && (currentPeriodValue !== 0 || previousPeriodValue !== 0)) {
        if (statementCode === 'BUDGET_VS_ACTUAL') {
          // For BUDGET_VS_ACTUAL: variance = Budget - Actual (previousPeriodValue - currentPeriodValue)
          variance = dataEngine.formatVarianceForDisplay(previousPeriodValue, currentPeriodValue).variance;
        } else {
          // For other statements: variance = Current - Previous
          variance = dataEngine.formatVarianceForDisplay(currentPeriodValue, previousPeriodValue).variance;
        }
      }

      // Determine if this is a working capital line (Task 7: Update statement display formatting)
      const isWorkingCapitalLine = statementCode === 'CASH_FLOW' &&
        (templateLine.lineCode === 'CHANGES_RECEIVABLES' || templateLine.lineCode === 'CHANGES_PAYABLES');

      // Format values for display (Requirements: 8.1, 8.2, 8.3)
      const currentFormatted = formatStatementValue(currentPeriodValue, {
        showZeroValues: true, // Can be made configurable via request options
        negativeFormat: 'parentheses', // Use parentheses for negative values
        isWorkingCapitalLine
      });

      const previousFormatted = formatStatementValue(previousPeriodValue, {
        showZeroValues: true,
        negativeFormat: 'parentheses',
        isWorkingCapitalLine
      });

      // Calculate change values for working capital lines
      let changeInCurrentPeriod: number | undefined;
      let changeInPreviousPeriod: number | undefined;

      if (isWorkingCapitalLine) {
        // For working capital lines, calculate the change (difference between periods)
        changeInCurrentPeriod = currentPeriodValue - previousPeriodValue;
        // For previous period change, assume the period before that was 0
        // This represents the change that occurred in the previous period
        changeInPreviousPeriod = previousPeriodValue - 0;
      }

      // Create statement line with enhanced formatting
      const statementLine: StatementLine = {
        id: `${statementCode}_${templateLine.lineCode}`,
        description: replaceFiscalYearPlaceholders(templateLine.description, fiscalYearContext),
        note: generateFootnoteReference(templateLine, statementCode),
        currentPeriodValue: formatCurrency(currentPeriodValue),
        previousPeriodValue: formatCurrency(previousPeriodValue),
        ...(changeInCurrentPeriod !== undefined && { changeInCurrentPeriodValue: formatCurrency(changeInCurrentPeriod) }),
        ...(changeInPreviousPeriod !== undefined && { changeInPreviousPeriodValue: formatCurrency(changeInPreviousPeriod) }),
        // Add NET_ASSETS_CHANGES specific fields
        ...(statementCode === 'NET_ASSETS_CHANGES' && {
          accumulatedSurplus: accumulatedSurplus !== null ? formatCurrency(accumulatedSurplus) : null,
          adjustments: adjustments !== null ? formatCurrency(adjustments) : null,
          total: total !== null ? formatCurrency(total) : null
        }),
        variance,
        formatting: {
          ...templateLine.formatting,
          // Enhance formatting based on line type and values
          bold: templateLine.formatting.bold || templateLine.formatting.isTotal || templateLine.formatting.isSubtotal,
          italic: templateLine.formatting.italic || (currentPeriodValue < 0 && !templateLine.formatting.isTotal),
          indentLevel: Math.max(0, Math.min(5, templateLine.formatting.indentLevel)), // Clamp between 0-5
          isSection: templateLine.formatting.isSection || templateLine.description.toUpperCase().includes('SECTION'),
          isSubtotal: templateLine.formatting.isSubtotal || templateLine.description.toLowerCase().includes('subtotal'),
          isTotal: templateLine.formatting.isTotal || templateLine.description.toLowerCase().includes('total')
        },
        metadata: {
          lineCode: templateLine.lineCode,
          eventCodes: templateLine.eventMappings || [],
          formula: templateLine.calculationFormula,
          isComputed: !!templateLine.calculationFormula || isWorkingCapitalComputed,
          displayOrder: templateLine.displayOrder
        },
        // Add display formatting metadata (Task 7: Requirements 8.1, 8.2, 8.3)
        displayFormatting: {
          currentPeriodDisplay: currentFormatted.displayValue,
          previousPeriodDisplay: previousFormatted.displayValue,
          showZeroValues: true,
          negativeFormat: 'parentheses',
          isWorkingCapitalLine
        }
      };


      statementLines.push(statementLine);
    }

    // Step 12: Resolve dependencies and reorder lines
    const orderedLines = formulaEngine.resolveDependencies(statementLines);

    // Step 13: Calculate totals
    const totals: Record<string, number> = {};
    for (const line of orderedLines) {
      if (line.formatting.isTotal || line.formatting.isSubtotal) {
        totals[line.metadata.lineCode] = line.currentPeriodValue;
      }
    }

    // Step 14: Perform validation
    const financialStatement = {
      statementCode,
      lines: orderedLines,
      totals,
      metadata: {
        templateId: template.id,
        processingStartTime: new Date(startTime),
        processingEndTime: new Date(),
        formulasEvaluated: orderedLines.filter(l => l.metadata.isComputed).length,
        dependenciesResolved: orderedLines.length
      }
    };

    const validationResults = formulaEngine.validateCalculations(financialStatement);
    const enhancedValidation = enhanceValidationResults(validationResults, statementCode, orderedLines, totals);

    // Add cash reconciliation validation
    const cashReconciliationWarning = validateCashReconciliation(orderedLines, statementCode);

    // Add facility-related warnings, carryforward warnings, working capital warnings, and cash reconciliation warnings to validation results (Task 4.4, Task 7.4)
    const allWarnings = [
      ...enhancedValidation.warnings,
      ...facilityDataWarnings,
      ...(carryforwardResult?.warnings || []), // Add carryforward warnings (Requirement: 5.5)
      ...(workingCapitalResult?.warnings || []), // Task 4.4: Add working capital warnings (Requirements: 7.1, 7.2, 7.3, 7.4)
      ...(cashReconciliationWarning ? [cashReconciliationWarning] : []) // Add cash reconciliation warning if exists
    ];
    enhancedValidation.warnings = allWarnings;

    // Step 15: Get facility info and previous period info
    // (reportingPeriod already retrieved in Step 9)

    // Get previous period info if available
    let previousPeriodInfo = null;
    if (hasPreviousPeriodData && periodComparison) {
      const previousPeriodId = eventData.previousPeriod[0]?.reportingPeriodId;
      if (previousPeriodId) {
        const previousPeriod = await dataEngine.getPeriodInfo(previousPeriodId);
        if (previousPeriod) {
          previousPeriodInfo = {
            id: previousPeriodId,
            year: previousPeriod.year,
            type: previousPeriod.periodType || 'annual',
            startDate: previousPeriod.startDate || new Date(),
            endDate: previousPeriod.endDate || new Date()
          };
        }
      }
    }

    let facilityInfo = undefined;
    if (primaryFacilityId) {
      // Get facility info with data availability check
      const facilityInfoMap = await dataEngine.getFacilityInfo([primaryFacilityId]);
      const facilityData = facilityInfoMap.get(primaryFacilityId);

      if (facilityData) {
        facilityInfo = {
          id: facilityData.id,
          name: facilityData.name,
          type: facilityData.type,
          district: facilityData.district,
          hasData: facilityData.hasData
        };
      } else {
        // Fallback to direct database query if facility info not found
        const facility = await db.query.facilities.findFirst({
          where: eq(facilities.id, primaryFacilityId),
          with: {
            district: true
          }
        });

        if (facility) {
          facilityInfo = {
            id: facility.id,
            name: facility.name,
            type: facility.facilityType,
            district: facility.district?.name,
            hasData: false
          };
        }
      }
    }

    // Handle Budget vs Actual with new processor
    if (statementCode === 'BUDGET_VS_ACTUAL' && planningData && executionData) {
      const budgetVsActualProcessor = new BudgetVsActualProcessor();

      const budgetVsActualStatement = await budgetVsActualProcessor.generateStatement(
        template,
        planningData,
        executionData,
        {
          facilityId: primaryFacilityId,
          reportingPeriodId,
          projectType,
          customMappings
        },
        {
          id: reportingPeriod?.id || reportingPeriodId,
          year: reportingPeriod?.year || new Date().getFullYear(),
          type: reportingPeriod?.periodType || 'annual',
          startDate: reportingPeriod?.startDate ? new Date(reportingPeriod.startDate).toISOString() : new Date().toISOString(),
          endDate: reportingPeriod?.endDate ? new Date(reportingPeriod.endDate).toISOString() : new Date().toISOString()
        },
        facilityInfo ? {
          id: facilityInfo.id,
          name: facilityInfo.name,
          type: facilityInfo.type,
          district: facilityInfo.district
        } : undefined
      );

      // NEW: Build aggregation metadata for Budget vs Actual (Subtask 5.3)
      // Track aggregation metadata generation time (Requirement 8.5)
      const aggregationMetadataStartTime = Date.now();
      const aggregationMetadata = await buildAggregationMetadata(
        aggregationLevel,
        effectiveFacilityIds,
        planningData,
        executionData
      );
      const aggregationMetadataTime = Date.now() - aggregationMetadataStartTime;

      // Log aggregation metadata generation time (Requirement 8.5)
      console.log(`[Performance] Aggregation metadata generation - Time: ${aggregationMetadataTime}ms`);

      // NEW: Generate facility breakdown if requested (Subtask 5.4)
      // Only generate breakdown when includeFacilityBreakdown is true
      // Skip breakdown for FACILITY aggregation level (redundant)
      // Include breakdown for DISTRICT and PROVINCE levels
      let facilityBreakdown: any[] | undefined;
      let facilityBreakdownTime = 0;

      if (includeFacilityBreakdown && aggregationLevel !== 'FACILITY') {
        // Track facility breakdown generation time (Requirement 8.5)
        const facilityBreakdownStartTime = Date.now();
        facilityBreakdown = await generateFacilityBreakdown(
          effectiveFacilityIds,
          planningData,
          executionData
        );
        facilityBreakdownTime = Date.now() - facilityBreakdownStartTime;

        // Log facility breakdown generation time (Requirement 8.5)
        console.log(`[Performance] Facility breakdown generation - Facilities: ${effectiveFacilityIds.length}, ` +
          `Time: ${facilityBreakdownTime}ms`);
      }

      // Return Budget vs Actual response with new format
      const processingTime = Date.now() - startTime;
      const response = {
        statement: budgetVsActualStatement,
        validation: {
          isValid: budgetVsActualStatement.metadata.validationResults.errorCount === 0,
          accountingEquation: {
            isValid: true,
            leftSide: 0,
            rightSide: 0,
            difference: 0,
            equation: 'Budget vs Actual'
          },
          businessRules: [],
          warnings: facilityDataWarnings,
          errors: [],
          formattedMessages: {
            critical: [],
            warnings: facilityDataWarnings.map((w: string) => ({
              type: 'DATA_WARNING',
              message: w,
              severity: 'WARNING',
              actionRequired: false
            })),
            info: []
          },
          summary: {
            totalChecks: 1,
            passedChecks: budgetVsActualStatement.metadata.validationResults.passedRules,
            criticalErrors: budgetVsActualStatement.metadata.validationResults.errorCount,
            warnings: budgetVsActualStatement.metadata.validationResults.warningCount,
            overallStatus: budgetVsActualStatement.metadata.validationResults.errorCount === 0 ? 'VALID' : 'INVALID'
          }
        },
        performance: {
          processingTimeMs: processingTime,
          linesProcessed: budgetVsActualStatement.lines.length,
          eventsProcessed: eventData.metadata.totalEvents,
          formulasCalculated: budgetVsActualStatement.lines.filter(l => l.metadata.isComputed).length,
          // NEW: Performance metrics for aggregation levels (Requirement 8.4, 8.5)
          aggregationLevel,
          dataCollectionTimeMs: dataCollectionTime,
          aggregationMetadataTimeMs: aggregationMetadataTime,
          facilityBreakdownTimeMs: facilityBreakdownTime
        },
        // NEW: Add aggregation metadata and facility breakdown
        aggregationMetadata,
        facilityBreakdown,
        // Task 10: Add snapshot metadata for live data (Requirements: 3.4, 3.5)
        snapshotMetadata: {
          isSnapshot: false,
          snapshotTimestamp: null,
          isOutdated: false,
          reportId: reportId || null,
        }
      };

      // Task 7: Log Budget vs Actual statement generation completion (Requirement 4.4)

      return c.json(response, HttpStatusCodes.OK);
    }

    // Step 16: Build response (for non-Budget vs Actual statements)
    const processingTime = Date.now() - startTime;

    // Build statement metadata with carryforward info (Task 7.3)
    const statementMetadata = generateStatementMetadata(template, orderedLines, processingTime, eventData.metadata.totalEvents, periodComparison);

    // Add carryforward metadata if available (Requirements: 1.4, 5.1, 5.2)
    if (carryforwardResult) {
      statementMetadata.carryforward = {
        source: carryforwardResult.source,
        previousPeriodId: carryforwardResult.metadata.previousPeriodId,
        previousPeriodEndingCash: carryforwardResult.metadata.previousPeriodEndingCash,
        manualEntryAmount: carryforwardResult.metadata.manualEntryAmount,
        discrepancy: carryforwardResult.metadata.discrepancy,
        facilityBreakdown: carryforwardResult.metadata.facilityBreakdown,
        timestamp: carryforwardResult.metadata.timestamp
      };
    }

    // Task 4.3: Add working capital metadata if available (Requirements: 7.5, 4.4)
    if (workingCapitalResult) {
      statementMetadata.workingCapital = {
        receivables: {
          currentBalance: workingCapitalResult.receivablesChange.currentPeriodBalance,
          previousBalance: workingCapitalResult.receivablesChange.previousPeriodBalance,
          change: workingCapitalResult.receivablesChange.change,
          cashFlowAdjustment: workingCapitalResult.receivablesChange.cashFlowAdjustment,
          eventCodes: workingCapitalResult.receivablesChange.eventCodes
        },
        payables: {
          currentBalance: workingCapitalResult.payablesChange.currentPeriodBalance,
          previousBalance: workingCapitalResult.payablesChange.previousPeriodBalance,
          change: workingCapitalResult.payablesChange.change,
          cashFlowAdjustment: workingCapitalResult.payablesChange.cashFlowAdjustment,
          eventCodes: workingCapitalResult.payablesChange.eventCodes
        },
        warnings: workingCapitalResult.warnings,
        facilityBreakdown: workingCapitalResult.receivablesChange.facilityBreakdown || workingCapitalResult.payablesChange.facilityBreakdown
          ? {
            receivables: workingCapitalResult.receivablesChange.facilityBreakdown,
            payables: workingCapitalResult.payablesChange.facilityBreakdown
          }
          : undefined
      };
    }

    // NEW: Build aggregation metadata for standard statements (Subtask 5.3)
    // Track aggregation metadata generation time (Requirement 8.5)
    const aggregationMetadataStartTime = Date.now();
    const aggregationMetadata = await buildAggregationMetadata(
      aggregationLevel,
      effectiveFacilityIds,
      planningData,
      executionData
    );
    const aggregationMetadataTime = Date.now() - aggregationMetadataStartTime;

    // Log aggregation metadata generation time (Requirement 8.5)
    console.log(`[Performance] Aggregation metadata generation - Time: ${aggregationMetadataTime}ms`);

    // NEW: Generate facility breakdown if requested (Subtask 5.4)
    // Only generate breakdown when includeFacilityBreakdown is true
    // Skip breakdown for FACILITY aggregation level (redundant)
    // Include breakdown for DISTRICT and PROVINCE levels
    let facilityBreakdown: any[] | undefined;
    let facilityBreakdownTime = 0;

    if (includeFacilityBreakdown && aggregationLevel !== 'FACILITY') {
      // Track facility breakdown generation time (Requirement 8.5)
      const facilityBreakdownStartTime = Date.now();
      facilityBreakdown = await generateFacilityBreakdown(
        effectiveFacilityIds,
        planningData,
        executionData
      );
      facilityBreakdownTime = Date.now() - facilityBreakdownStartTime;

      // Log facility breakdown generation time (Requirement 8.5)
      console.log(`[Performance] Facility breakdown generation - Facilities: ${effectiveFacilityIds.length}, ` +
        `Time: ${facilityBreakdownTime}ms`);
    }

    const response: FinancialStatementResponse = {
      statement: {
        statementCode,
        statementName: template.statementName,
        reportingPeriod: {
          id: reportingPeriod?.id || reportingPeriodId,
          year: reportingPeriod?.year || new Date().getFullYear(),
          type: reportingPeriod?.periodType || 'annual',
          startDate: reportingPeriod?.startDate ? new Date(reportingPeriod.startDate) : new Date(),
          endDate: reportingPeriod?.endDate ? new Date(reportingPeriod.endDate) : new Date()
        },
        previousPeriod: previousPeriodInfo || undefined,
        hasPreviousPeriodData,
        facility: facilityInfo,
        facilityAggregation: facilityAggregationInfo,
        generatedAt: new Date().toISOString(),
        lines: orderedLines,
        totals,
        metadata: statementMetadata
      },
      validation: enhancedValidation,
      performance: {
        processingTimeMs: processingTime,
        linesProcessed: orderedLines.length,
        eventsProcessed: eventData.metadata.totalEvents,
        formulasCalculated: orderedLines.filter(l => l.metadata.isComputed).length,
        // NEW: Performance metrics for aggregation levels (Requirement 8.4, 8.5)
        aggregationLevel,
        dataCollectionTimeMs: dataCollectionTime,
        aggregationMetadataTimeMs: aggregationMetadataTime,
        facilityBreakdownTimeMs: facilityBreakdownTime
      },
      // NEW: Add aggregation metadata and facility breakdown
      aggregationMetadata,
      facilityBreakdown,
      // Task 10: Add snapshot metadata for live data (Requirements: 3.4, 3.5)
      snapshotMetadata: {
        isSnapshot: false,
        snapshotTimestamp: null,
        isOutdated: false,
        reportId: reportId || null,
      }
    };

    // Task 7: Log statement generation completion (Requirement 4.4)

    return c.json(response, HttpStatusCodes.OK);

  } catch (error) {

    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

    // Task 7: Log error details (Requirement 4.4)

    // Handle authentication and authorization errors
    if (errorMessage === "Unauthorized") {
      return c.json(
        { message: "Authentication required" },
        HttpStatusCodes.UNAUTHORIZED
      );
    }

    if (errorMessage === "User not associated with a facility") {
      return c.json(
        { message: "User must be associated with a facility" },
        HttpStatusCodes.FORBIDDEN
      );
    }

    // Handle specific error types with facility context
    if (errorMessage.includes('No active template found')) {
      return c.json({
        message: 'Statement template not found',
        details: errorMessage,
        context: {
          statementCode: requestBody.statementCode,
          facilityId: requestBody.facilityId || null,
          reportingPeriodId: requestBody.reportingPeriodId
        }
      }, HttpStatusCodes.NOT_FOUND);
    }

    if (errorMessage.includes('validation failed') || errorMessage.includes('Invalid')) {
      return c.json({
        message: 'Invalid request parameters',
        errors: [errorMessage],
        context: {
          statementCode: requestBody.statementCode,
          facilityId: requestBody.facilityId || null,
          reportingPeriodId: requestBody.reportingPeriodId
        }
      }, HttpStatusCodes.BAD_REQUEST);
    }

    // Facility-specific errors
    if (errorMessage.includes('facility') || errorMessage.includes('Facility')) {
      return c.json({
        message: 'Facility-related error occurred',
        error: errorMessage,
        context: {
          facilityId: requestBody.facilityId || null,
          statementCode: requestBody.statementCode,
          reportingPeriodId: requestBody.reportingPeriodId
        }
      }, HttpStatusCodes.BAD_REQUEST);
    }

    // Data collection errors
    if (errorMessage.includes('data collection') || errorMessage.includes('event data')) {
      return c.json({
        message: 'Data collection failed',
        error: errorMessage,
        context: {
          facilityId: requestBody.facilityId || null,
          statementCode: requestBody.statementCode,
          reportingPeriodId: requestBody.reportingPeriodId,
          suggestion: requestBody.facilityId
            ? 'Check if the facility has data for the specified period'
            : 'Check if there is data available for the specified criteria'
        }
      }, HttpStatusCodes.INTERNAL_SERVER_ERROR);
    }

    // Generic server error with context
    return c.json({
      message: 'Statement generation failed',
      error: errorMessage,
      context: {
        statementCode: requestBody.statementCode,
        facilityId: requestBody.facilityId || null,
        reportingPeriodId: requestBody.reportingPeriodId
      }
    }, HttpStatusCodes.INTERNAL_SERVER_ERROR);
  }
};

// ============================================================================
// Aggregation Level Determination Functions (Task 2)
// ============================================================================

/**
 * Determine effective facility IDs based on aggregation level
 * 
 * This function implements the core logic for determining which facilities
 * should be included in a financial statement based on the requested aggregation level.
 * 
 * @param aggregationLevel - The organizational level for data aggregation
 * @param facilityId - Optional specific facility ID (required for FACILITY level)
 * @param userContext - User context with access control information
 * @returns Promise resolving to array of facility IDs to include in the statement
 * @throws Error if validation fails or access is denied
 * 
 * Requirements: 1.1, 1.3, 1.4, 1.5, 2.1, 2.3, 3.1, 3.2, 3.3, 3.4, 3.5
 */
async function determineEffectiveFacilityIds(
  aggregationLevel: 'FACILITY' | 'DISTRICT' | 'PROVINCE',
  facilityId: number | undefined,
  userContext: UserContext
): Promise<number[]> {

  switch (aggregationLevel) {
    case 'FACILITY':
      // Single facility mode - facilityId is required
      if (!facilityId) {
        throw new Error('facilityId is required when aggregationLevel is FACILITY');
      }

      // Validate access control - user must have access to the requested facility
      if (!userContext.accessibleFacilityIds.includes(facilityId)) {
        throw new Error('Access denied to facility');
      }

      return [facilityId];

    case 'DISTRICT':
      // District aggregation mode - use all accessible facilities (current behavior)
      // This returns all facilities the user can access in their district
      return userContext.accessibleFacilityIds;

    case 'PROVINCE':
      // Province aggregation mode - get all facilities in user's province
      // This requires querying all facilities in the province and filtering by access
      return await getProvinceFacilityIds(userContext);

    default:
      throw new Error(`Invalid aggregation level: ${aggregationLevel}`);
  }
}

/**
 * Get all facility IDs in the user's province that the user can access
 * 
 * This function queries the facilities table to find all facilities in the same
 * province as the user's facility, then filters by the user's accessible facility IDs
 * to ensure proper access control.
 * 
 * @param userContext - User context with facility and access information
 * @returns Promise resolving to array of facility IDs in the province
 * 
 * Requirements: 1.5
 */
async function getProvinceFacilityIds(userContext: UserContext): Promise<number[]> {
  // If user has no district (isolated facility), return only their facility
  if (!userContext.districtId) {
    return [userContext.facilityId];
  }

  // Get the user's facility to determine their province
  const userFacility = await db.query.facilities.findFirst({
    where: eq(facilities.id, userContext.facilityId),
    with: {
      district: true
    }
  });

  if (!userFacility || !userFacility.district) {
    // If facility or district not found, return only user's facility
    return [userContext.facilityId];
  }

  const provinceId = userFacility.district.provinceId;

  // Query all facilities in the same province
  const provinceFacilities = await db
    .select({ id: facilities.id })
    .from(facilities)
    .innerJoin(districts, eq(facilities.districtId, districts.id))
    .where(eq(districts.provinceId, provinceId));

  const allProvinceFacilityIds = provinceFacilities.map(f => f.id);

  // Filter by user's accessible facility IDs for access control
  // This ensures users can only see data from facilities they have access to
  const accessibleProvinceFacilityIds = allProvinceFacilityIds.filter(id =>
    userContext.accessibleFacilityIds.includes(id)
  );

  return accessibleProvinceFacilityIds;
}

/**
 * Build aggregation metadata for the response
 * 
 * This function creates comprehensive metadata about the aggregation level,
 * included facilities, and data completeness statistics. It provides context
 * for understanding the scope and quality of the aggregated financial data.
 * 
 * @param aggregationLevel - The organizational level for data aggregation
 * @param effectiveFacilityIds - Array of facility IDs included in the aggregation
 * @param planningData - Aggregated planning data (budget)
 * @param executionData - Aggregated execution data (actual)
 * @returns Promise resolving to aggregation metadata object
 * 
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 6.1, 6.2
 */
async function buildAggregationMetadata(
  aggregationLevel: 'FACILITY' | 'DISTRICT' | 'PROVINCE',
  effectiveFacilityIds: number[],
  planningData: any,
  executionData: any
): Promise<any> {

  // Task 3.2: Calculate data completeness statistics
  // Analyze planning and execution data to identify facilities with data
  const facilitiesWithPlanning = new Set<number>();
  const facilitiesWithExecution = new Set<number>();

  // Analyze planning data to identify facilities with budget data
  if (planningData && planningData.facilityTotals) {
    for (const facilityId of effectiveFacilityIds) {
      const hasPlanningData = (planningData.facilityTotals.get(facilityId) || 0) > 0;
      if (hasPlanningData) {
        facilitiesWithPlanning.add(facilityId);
      }
    }
  }

  // Analyze execution data to identify facilities with actual data
  if (executionData && executionData.facilityTotals) {
    for (const facilityId of effectiveFacilityIds) {
      const hasExecutionData = (executionData.facilityTotals.get(facilityId) || 0) > 0;
      if (hasExecutionData) {
        facilitiesWithExecution.add(facilityId);
      }
    }
  }

  // Calculate intersection for facilities with both planning and execution data
  const facilitiesWithBoth = [...facilitiesWithPlanning].filter(id =>
    facilitiesWithExecution.has(id)
  );

  // Only include facilities that have execution data (actual expenditure)
  // This ensures the dropdown only shows facilities with data
  const facilitiesWithData = Array.from(facilitiesWithExecution);

  const metadata: any = {
    level: aggregationLevel,
    facilitiesIncluded: facilitiesWithData, // Changed: only include facilities with execution data
    totalFacilities: effectiveFacilityIds.length,
    dataCompleteness: {
      facilitiesWithPlanning: facilitiesWithPlanning.size,
      facilitiesWithExecution: facilitiesWithExecution.size,
      facilitiesWithBoth: facilitiesWithBoth.length
    }
  };

  // Add level-specific metadata based on aggregation level
  if (aggregationLevel === 'FACILITY') {
    // Build facility-level metadata (facilityId, facilityName, facilityType)
    const facilityId = effectiveFacilityIds[0];
    const facility = await db.query.facilities.findFirst({
      where: eq(facilities.id, facilityId)
    });

    if (facility) {
      metadata.facilityId = facility.id;
      metadata.facilityName = facility.name;
      metadata.facilityType = facility.facilityType;
    }
  } else if (aggregationLevel === 'DISTRICT') {
    // Build district-level metadata (districtId, districtName)
    // Get district info from the first facility in the list
    const facility = await db.query.facilities.findFirst({
      where: eq(facilities.id, effectiveFacilityIds[0]),
      with: { district: true }
    });

    if (facility?.district) {
      metadata.districtId = facility.district.id;
      metadata.districtName = facility.district.name;
    }
  } else if (aggregationLevel === 'PROVINCE') {
    // Build province-level metadata (provinceId, provinceName)
    // Get province info from the first facility's district
    const facility = await db.query.facilities.findFirst({
      where: eq(facilities.id, effectiveFacilityIds[0]),
      with: {
        district: {
          with: { province: true }
        }
      }
    });

    if (facility?.district?.province) {
      metadata.provinceId = facility.district.province.id;
      metadata.provinceName = facility.district.province.name;
    }
  }

  return metadata;
}

/**
 * Generate per-facility breakdown for aggregated statements
 * 
 * This function creates detailed per-facility budget and actual amounts
 * for aggregated statements (DISTRICT or PROVINCE level). It calculates
 * variance and variance percentage for each facility and sorts by variance.
 * 
 * @param effectiveFacilityIds - Array of facility IDs included in the aggregation
 * @param planningData - Aggregated planning data (budget)
 * @param executionData - Aggregated execution data (actual)
 * @returns Promise resolving to array of facility breakdown items
 * 
 * Requirements: 5.1, 5.2, 5.4, 5.5
 */
async function generateFacilityBreakdown(
  effectiveFacilityIds: number[],
  planningData: any,
  executionData: any
): Promise<any[]> {

  const breakdown: any[] = [];

  // Query facility details for all effective facility IDs
  const facilitiesData = await db.query.facilities.findMany({
    where: sql`${facilities.id} IN (${sql.join(effectiveFacilityIds.map(id => sql`${id}`), sql`, `)})`,
    columns: {
      id: true,
      name: true,
      facilityType: true
    }
  });

  const facilityMap = new Map(facilitiesData.map(f => [f.id, f]));

  for (const facilityId of effectiveFacilityIds) {
    const facility = facilityMap.get(facilityId);
    if (!facility) continue;

    // Calculate budget amount per facility from planning data
    const budget = planningData?.facilityTotals?.get(facilityId) || 0;

    // Calculate actual amount per facility from execution data
    const actual = executionData?.facilityTotals?.get(facilityId) || 0;

    // Calculate variance and variance percentage per facility
    const variance = actual - budget;
    const variancePercentage = budget !== 0 ? (variance / budget) * 100 : 0;

    // Determine favorability for each facility
    // For expenses, under budget (negative variance) is favorable
    const isFavorable = variance <= 0;

    breakdown.push({
      facilityId: facility.id,
      facilityName: facility.name,
      facilityType: facility.facilityType,
      budget,
      actual,
      variance,
      variancePercentage: Math.round(variancePercentage * 100) / 100,
      isFavorable
    });
  }

  // Sort facilities by variance percentage (descending)
  // Most unfavorable (highest positive variance) first
  breakdown.sort((a, b) => b.variancePercentage - a.variancePercentage);

  return breakdown;
}

/**
 * Validate facility data completeness for facility-level statements
 * 
 * This function checks if a facility has planning and execution data for the
 * reporting period and generates appropriate warnings or errors based on data availability.
 * 
 * @param aggregationLevel - The organizational level for data aggregation
 * @param effectiveFacilityIds - Array of facility IDs included in the statement
 * @param planningData - Aggregated planning data (budget)
 * @param executionData - Aggregated execution data (actual)
 * @param reportingPeriodId - The reporting period ID
 * @returns Object containing validation warnings and errors
 * 
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5
 */
async function validateFacilityDataCompleteness(
  aggregationLevel: 'FACILITY' | 'DISTRICT' | 'PROVINCE',
  effectiveFacilityIds: number[],
  planningData: any,
  executionData: any,
  reportingPeriodId: number
): Promise<{
  warnings: string[];
  errors: string[];
  hasData: boolean;
}> {
  const warnings: string[] = [];
  const errors: string[] = [];

  // Only perform detailed validation for FACILITY level
  // For DISTRICT and PROVINCE, we rely on data completeness metadata
  if (aggregationLevel !== 'FACILITY') {
    return { warnings, errors, hasData: true };
  }

  // For facility-level statements, validate the single facility
  const facilityId = effectiveFacilityIds[0];

  // Check if facility has planning data for reporting period
  const hasPlanningData = planningData &&
    planningData.facilityTotals &&
    (planningData.facilityTotals.get(facilityId) || 0) > 0;

  // Check if facility has execution data for reporting period
  const hasExecutionData = executionData &&
    executionData.facilityTotals &&
    (executionData.facilityTotals.get(facilityId) || 0) > 0;

  // Get facility name for better error messages
  let facilityName = `Facility ${facilityId}`;
  try {
    const facility = await db.query.facilities.findFirst({
      where: eq(facilities.id, facilityId),
      columns: { name: true }
    });
    if (facility) {
      facilityName = facility.name;
    }
  } catch (error) {
    // Continue with default name if query fails
  }

  // Add error if facility has neither planning nor execution data
  if (!hasPlanningData && !hasExecutionData) {
    errors.push(
      `No data available for ${facilityName} in the specified reporting period`
    );
    return { warnings, errors, hasData: false };
  }

  // Add warning if facility has budget but no actual expenditure
  if (hasPlanningData && !hasExecutionData) {
    warnings.push(
      `${facilityName} has budget but no actual expenditure recorded for this period`
    );
  }

  // Add warning if facility has expenditure but no budget
  if (!hasPlanningData && hasExecutionData) {
    warnings.push(
      `${facilityName} has expenditure but no budget allocated for this period`
    );
  }

  return {
    warnings,
    errors,
    hasData: hasPlanningData || hasExecutionData
  };
}

// ============================================================================
// Helper functions for response formatting
// ============================================================================

function formatCurrency(value: number): number {
  // Round to 2 decimal places for currency display
  return Math.round(value * 100) / 100;
}

/**
 * Format a statement line value for display
 * Handles negative values, zero values, and applies proper formatting
 * 
 * @param value - The numeric value to format
 * @param options - Formatting options
 * @returns Formatted value object with display properties
 */
function formatStatementValue(
  value: number,
  options: {
    showZeroValues?: boolean;
    negativeFormat?: 'parentheses' | 'minus';
    isWorkingCapitalLine?: boolean;
  } = {}
): {
  numericValue: number;
  displayValue: string;
  isNegative: boolean;
  isZero: boolean;
} {
  const {
    showZeroValues = true,
    negativeFormat = 'parentheses',
    isWorkingCapitalLine = false
  } = options;

  const roundedValue = formatCurrency(value);
  const isNegative = roundedValue < 0;
  const isZero = roundedValue === 0;
  const absoluteValue = Math.abs(roundedValue);

  // Handle zero values
  if (isZero) {
    return {
      numericValue: 0,
      displayValue: showZeroValues ? '0' : '-',
      isNegative: false,
      isZero: true
    };
  }

  // Format negative values
  let displayValue: string;
  if (isNegative) {
    if (negativeFormat === 'parentheses') {
      displayValue = `(${absoluteValue.toFixed(2)})`;
    } else {
      displayValue = `-${absoluteValue.toFixed(2)}`;
    }
  } else {
    displayValue = absoluteValue.toFixed(2);
  }

  return {
    numericValue: roundedValue,
    displayValue,
    isNegative,
    isZero
  };
}

function generateFootnoteReference(templateLine: any, statementCode: string): number | undefined {
  // Generate footnote references based on line characteristics
  if (templateLine.calculationFormula) {
    return 1; // Formula-based lines get footnote 1
  }

  if (templateLine.eventMappings && templateLine.eventMappings.length > 3) {
    return 2; // Lines with many event mappings get footnote 2
  }

  if (statementCode === 'BUDGET_VS_ACTUAL' && templateLine.description.toLowerCase().includes('variance')) {
    return 3; // Variance lines in budget vs actual get footnote 3
  }

  return undefined;
}

function enhanceValidationResults(
  validationResults: any,
  _statementCode: string,
  _lines: StatementLine[],
  _totals: Record<string, number>
): any {
  // The validation results from FormulaEngine already include comprehensive validation
  // from the ValidationEngine, so we just need to format them properly for UI display
  const enhancedResults = { ...validationResults };

  // Ensure all required fields are present for UI display
  if (!enhancedResults.accountingEquation) {
    enhancedResults.accountingEquation = {
      isValid: true,
      leftSide: 0,
      rightSide: 0,
      difference: 0,
      equation: 'No specific equation validation for this statement type'
    };
  }

  if (!enhancedResults.businessRules) {
    enhancedResults.businessRules = [];
  }

  if (!enhancedResults.warnings) {
    enhancedResults.warnings = [];
  }

  if (!enhancedResults.errors) {
    enhancedResults.errors = [];
  }

  // Add UI-friendly formatting for validation messages
  enhancedResults.formattedMessages = formatValidationMessages(
    enhancedResults.errors,
    enhancedResults.warnings,
    enhancedResults.businessRules
  );

  // Add validation summary for UI display
  enhancedResults.summary = {
    totalChecks: enhancedResults.businessRules.length + 1, // +1 for accounting equation
    passedChecks: enhancedResults.businessRules.filter((rule: any) => rule.isValid).length +
      (enhancedResults.accountingEquation.isValid ? 1 : 0),
    criticalErrors: enhancedResults.errors.length,
    warnings: enhancedResults.warnings.length,
    overallStatus: enhancedResults.isValid ? 'VALID' : 'INVALID'
  };

  return enhancedResults;
}

/**
 * Prepare statement data for CSV/Excel export
 * Task 7.2: Ensure working capital adjustments export with signed values (Requirement: 8.5)
 * 
 * @param statement - The financial statement to export
 * @returns Export-ready data structure
 */
function prepareStatementForExport(statement: any): {
  headers: string[];
  rows: any[][];
  metadata: any;
} {
  const headers = [
    'Line Code',
    'Description',
    'Indent Level',
    'Current Period',
    'Previous Period',
    'Variance',
    'Is Total',
    'Is Subtotal'
  ];

  const rows = statement.lines.map((line: StatementLine) => {
    // Use display formatting if available, otherwise format the numeric value
    const currentDisplay = line.displayFormatting?.currentPeriodDisplay ||
      formatStatementValue(line.currentPeriodValue, {
        showZeroValues: true,
        negativeFormat: 'minus', // Use minus sign for CSV/Excel
        isWorkingCapitalLine: line.displayFormatting?.isWorkingCapitalLine || false
      }).displayValue;

    const previousDisplay = line.displayFormatting?.previousPeriodDisplay ||
      formatStatementValue(line.previousPeriodValue, {
        showZeroValues: true,
        negativeFormat: 'minus',
        isWorkingCapitalLine: line.displayFormatting?.isWorkingCapitalLine || false
      }).displayValue;

    return [
      line.metadata.lineCode,
      line.description,
      line.formatting.indentLevel,
      currentDisplay, // Signed value for working capital lines
      previousDisplay, // Signed value for working capital lines
      line.variance ? `${line.variance.absolute} (${line.variance.percentage}%)` : '',
      line.formatting.isTotal,
      line.formatting.isSubtotal
    ];
  });

  // Include working capital metadata if available (Requirement: 8.5)
  const metadata: any = {
    statementCode: statement.statementCode,
    statementName: statement.statementName,
    reportingPeriod: statement.reportingPeriod,
    generatedAt: statement.generatedAt
  };

  if (statement.metadata?.workingCapital) {
    metadata.workingCapital = {
      receivables: {
        currentBalance: statement.metadata.workingCapital.receivables.currentBalance,
        previousBalance: statement.metadata.workingCapital.receivables.previousBalance,
        change: statement.metadata.workingCapital.receivables.change,
        cashFlowAdjustment: statement.metadata.workingCapital.receivables.cashFlowAdjustment
      },
      payables: {
        currentBalance: statement.metadata.workingCapital.payables.currentBalance,
        previousBalance: statement.metadata.workingCapital.payables.previousBalance,
        change: statement.metadata.workingCapital.payables.change,
        cashFlowAdjustment: statement.metadata.workingCapital.payables.cashFlowAdjustment
      }
    };
  }

  return { headers, rows, metadata };
}

/**
 * Format validation messages for UI display
 */
function formatValidationMessages(
  errors: string[],
  warnings: string[],
  businessRules: any[]
): any {
  const formatted = {
    critical: [] as any[],
    warnings: [] as any[],
    info: [] as any[]
  };

  // Format critical errors
  for (const error of errors) {
    formatted.critical.push({
      type: 'error',
      message: error,
      severity: 'high',
      actionRequired: true
    });
  }

  // Format warnings
  for (const warning of warnings) {
    formatted.warnings.push({
      type: 'warning',
      message: warning,
      severity: 'medium',
      actionRequired: false
    });
  }

  // Format business rule violations
  for (const rule of businessRules) {
    if (!rule.isValid) {
      const severity = rule.ruleId.includes('WARNING') ? 'medium' : 'high';
      const targetArray = severity === 'high' ? formatted.critical : formatted.warnings;

      targetArray.push({
        type: severity === 'high' ? 'error' : 'warning',
        message: rule.message,
        severity,
        actionRequired: severity === 'high',
        ruleId: rule.ruleId,
        ruleName: rule.ruleName,
        affectedFields: rule.affectedFields
      });
    } else {
      formatted.info.push({
        type: 'info',
        message: rule.message,
        severity: 'low',
        actionRequired: false,
        ruleId: rule.ruleId,
        ruleName: rule.ruleName
      });
    }
  }

  return formatted;
}

async function generateFacilityAggregationInfo(
  facilityIds: number[],
  aggregatedData: any,
  dataEngine: DataAggregationEngine
): Promise<any> {
  try {
    // Get facility information
    const facilityInfoMap = await dataEngine.getFacilityInfo(facilityIds);

    // Calculate total amount across all facilities
    const totalAmount: number = Array.from(aggregatedData.eventTotals.values())
      .reduce((sum: number, amount: unknown) => sum + (amount as number), 0);

    // Build facility breakdown
    const facilityBreakdown = [];
    let facilitiesWithData = 0;

    for (const facilityId of facilityIds) {
      const facilityInfo = facilityInfoMap.get(facilityId);
      const facilityTotal = aggregatedData.facilityTotals.get(facilityId) || 0;

      if (facilityInfo) {
        if (facilityInfo.hasData) {
          facilitiesWithData++;
        }

        // Calculate contribution percentage
        const contributionPercentage = totalAmount > 0 ? (facilityTotal / totalAmount) * 100 : 0;

        // Get event breakdown for this facility (simplified - would need enhanced aggregation)
        const eventBreakdown: Record<string, number> = {};
        for (const [eventCode, amount] of aggregatedData.eventTotals.entries()) {
          // This is a simplified calculation - in a real implementation,
          // we'd need the facility-specific event breakdown from aggregateByEventWithFacilities
          eventBreakdown[eventCode] = amount * (contributionPercentage / 100);
        }

        facilityBreakdown.push({
          facility: facilityInfo,
          totalAmount: facilityTotal,
          eventBreakdown,
          contributionPercentage: Math.round(contributionPercentage * 100) / 100
        });
      }
    }

    // Sort by contribution percentage (highest first)
    facilityBreakdown.sort((a, b) => b.contributionPercentage - a.contributionPercentage);

    const facilitiesWithoutData = facilityIds.length - facilitiesWithData;
    const warnings = [];

    if (facilitiesWithoutData > 0) {
      warnings.push(`${facilitiesWithoutData} facilities have no data for the specified criteria`);
    }

    return {
      totalFacilities: facilityIds.length,
      facilitiesWithData,
      facilitiesWithoutData,
      aggregationMethod: facilityIds.length === 1 ? 'SINGLE' : 'CROSS_FACILITY_SUM',
      facilityBreakdown,
      warnings
    };

  } catch (error) {
    return {
      totalFacilities: facilityIds.length,
      facilitiesWithData: 0,
      facilitiesWithoutData: facilityIds.length,
      aggregationMethod: 'CROSS_FACILITY_SUM',
      facilityBreakdown: [],
      warnings: ['Failed to generate facility aggregation information']
    };
  }
}

function generateStatementMetadata(
  template: any,
  lines: StatementLine[],
  processingTime: number,
  eventCount: number,
  periodComparison?: any
): any {
  // Generate comprehensive metadata
  const formulaLines = lines.filter(line => line.metadata.isComputed);
  const dataLines = lines.filter(line => !line.metadata.isComputed);
  const linesWithVariance = lines.filter(line => line.variance);

  // Calculate variance statistics if period comparison is available
  let varianceStats = undefined;
  if (periodComparison) {
    const significantVariances = linesWithVariance.filter(line =>
      line.variance && (Math.abs(line.variance.percentage) > 10 || Math.abs(line.variance.absolute) > 1000)
    );

    varianceStats = {
      totalLinesWithVariance: linesWithVariance.length,
      significantVariances: significantVariances.length,
      averageVariancePercentage: linesWithVariance.length > 0
        ? linesWithVariance.reduce((sum, line) => sum + Math.abs(line.variance!.percentage), 0) / linesWithVariance.length
        : 0,
      maxVariancePercentage: linesWithVariance.length > 0
        ? Math.max(...linesWithVariance.map(line => Math.abs(line.variance!.percentage)))
        : 0
    };
  }

  return {
    templateVersion: template.metadata.version,
    calculationFormulas: Object.fromEntries(
      formulaLines.map(line => [line.metadata.lineCode, line.metadata.formula!])
    ),
    validationResults: {
      totalRules: 5, // Basic validation rules count
      passedRules: 4, // Placeholder - would be calculated based on actual validation
      failedRules: 1,
      warningCount: 0,
      errorCount: 0
    },
    footnotes: [
      {
        number: 1,
        text: "Values calculated using predefined formulas based on event data aggregation",
        relatedLines: formulaLines.map(line => line.metadata.lineCode)
      },
      {
        number: 2,
        text: "Aggregated from multiple event codes and data sources",
        relatedLines: dataLines.filter(line => line.metadata.eventCodes.length > 3).map(line => line.metadata.lineCode)
      },
      {
        number: 3,
        text: "Variance calculated as (Current - Previous) / Previous * 100, with proper handling of division by zero",
        relatedLines: linesWithVariance.map(line => line.metadata.lineCode)
      }
    ].filter(footnote => footnote.relatedLines.length > 0), // Only include footnotes with related lines
    processingStats: {
      totalLines: lines.length,
      formulaLines: formulaLines.length,
      dataLines: dataLines.length,
      processingTimeMs: processingTime,
      eventsProcessed: eventCount
    },
    varianceAnalysis: varianceStats
  };
}/**
 * Ch
eck if a line code should be computed as a total even if no formula is defined
 */
function shouldComputeTotal(lineCode: string): boolean {
  const totalLineCodes = [
    // ASSETS_LIAB totals
    'TOTAL_CURRENT_ASSETS',
    'TOTAL_NON_CURRENT_ASSETS',
    'TOTAL_CURRENT_LIABILITIES',
    'TOTAL_NON_CURRENT_LIABILITIES',
    'TOTAL_NET_ASSETS',
    // CASH_FLOW totals
    'NET_CASH_FLOW_OPERATING',
    'NET_CASH_FLOW_INVESTING',
    'NET_CASH_FLOW_FINANCING',
    'NET_INCREASE_CASH',
    // CASH_ENDING removed - uses event mapping only
    // NET_ASSETS_CHANGES totals (dynamic year codes)
    'BALANCE_JUNE_CURRENT',
    'BALANCE_JULY_CURRENT',
    'BALANCE_PERIOD_END',
    // BUDGET_VS_ACTUAL totals
    'TOTAL_RECEIPTS',
    'TOTAL_EXPENDITURES',
    'NET_LENDING_BORROWING'
  ];

  return totalLineCodes.includes(lineCode);
}

/**
 * Calculate special totals that don't have formulas in the template
 */
function calculateSpecialTotal(
  lineCode: string,
  statementLines: StatementLine[],
  statementCode: string
): number {
  switch (lineCode) {
    // ASSETS_LIAB calculations
    case 'TOTAL_CURRENT_ASSETS':
      return sumLinesByPattern(statementLines, ['CASH_EQUIVALENTS', 'RECEIVABLES_EXCHANGE', 'ADVANCE_PAYMENTS']);

    case 'TOTAL_NON_CURRENT_ASSETS':
      return sumLinesByPattern(statementLines, ['DIRECT_INVESTMENTS']);

    case 'TOTAL_CURRENT_LIABILITIES':
      return sumLinesByPattern(statementLines, ['PAYABLES', 'PAYMENTS_RECEIVED_ADVANCE', 'RETAINED_PERFORMANCE_SECURITIES']);

    case 'TOTAL_NON_CURRENT_LIABILITIES':
      return sumLinesByPattern(statementLines, ['DIRECT_BORROWINGS']);

    case 'TOTAL_NET_ASSETS':
      return sumLinesByPattern(statementLines, ['ACCUMULATED_SURPLUS_DEFICITS', 'PRIOR_YEAR_ADJUSTMENTS', 'SURPLUS_DEFICITS_PERIOD']);



    // CASH_FLOW calculations
    case 'NET_CASH_FLOW_OPERATING':
      return calculateOperatingCashFlow(statementLines);

    case 'NET_CASH_FLOW_INVESTING':
      return calculateInvestingCashFlow(statementLines);

    case 'NET_CASH_FLOW_FINANCING':
      return calculateFinancingCashFlow(statementLines);

    case 'NET_INCREASE_CASH':
      return calculateNetIncreaseCash(statementLines);

    // CASH_ENDING removed - uses event mapping only

    case 'BALANCE_JUNE_CURRENT':
      return calculateBalanceJuneCurrent(statementLines);

    case 'BALANCE_JULY_CURRENT':
      return calculateBalanceJulyCurrent(statementLines);

    case 'BALANCE_PERIOD_END':
      return calculateBalancePeriodEnd(statementLines);

    // BUDGET_VS_ACTUAL calculations
    case 'TOTAL_RECEIPTS':
      return calculateTotalReceipts(statementLines);

    case 'TOTAL_EXPENDITURES':
      return calculateTotalExpenditures(statementLines);

    case 'NET_LENDING_BORROWING':
      return calculateNetLendingBorrowing(statementLines);

    default:
      return 0;
  }
}

/**
 * Sum statement lines by matching line codes
 */
function sumLinesByPattern(statementLines: StatementLine[], patterns: string[]): number {
  let total = 0;

  for (const line of statementLines) {
    if (patterns.includes(line.metadata.lineCode)) {
      total += line.currentPeriodValue;
    }
  }

  return total;
}

/**
 * Get the value to use for a line in cash flow calculations
 * For working capital lines, use the change value instead of the balance
 */
function getLineValueForCashFlow(line: StatementLine): number {
  const isWorkingCapitalLine = line.metadata.lineCode === 'CHANGES_RECEIVABLES' ||
    line.metadata.lineCode === 'CHANGES_PAYABLES';

  if (isWorkingCapitalLine && line.changeInCurrentPeriodValue !== undefined) {
    // Use the change value for working capital lines
    return line.changeInCurrentPeriodValue;
  }

  // Use the current period value for all other lines
  return line.currentPeriodValue;
}

/**
 * Sum statement lines by matching line codes, using appropriate values for working capital
 */
function sumLinesByPatternForCashFlow(statementLines: StatementLine[], patterns: string[]): number {
  let total = 0;

  for (const line of statementLines) {
    if (patterns.includes(line.metadata.lineCode)) {
      total += getLineValueForCashFlow(line);
    }
  }

  return total;
}

/**
 * Calculate operating cash flow (revenues - expenses + adjustments)
 * 
 * This function implements the indirect method for cash flow calculation:
 * - Revenues: Cash inflows from operating activities
 * - Expenses: Cash outflows from operating activities
 * - Adjustments: Working capital changes and prior year adjustments
 * 
 * Working Capital Adjustments (Requirements 3.1, 3.2):
 * - CHANGES_RECEIVABLES: Already signed (increase = negative, decrease = positive)
 * - CHANGES_PAYABLES: Already signed (increase = positive, decrease = negative)
 * - PRIOR_YEAR_ADJUSTMENTS: Adjustments from previous periods
 * 
 * Formula: Operating Cash Flow = Revenues - Expenses + Adjustments
 * 
 * @param statementLines - Array of statement lines with calculated values
 * @returns Net cash flow from operating activities
 */
function calculateOperatingCashFlow(statementLines: StatementLine[]): number {
  // Revenue items (positive cash flow)
  const revenues = sumLinesByPattern(statementLines, [
    'TAX_REVENUE', 'GRANTS', 'TRANSFERS_CENTRAL', 'TRANSFERS_PUBLIC',
    'FINES_PENALTIES', 'PROPERTY_INCOME', 'SALES_GOODS_SERVICES', 'OTHER_REVENUE'
  ]);

  // Expense items (negative cash flow)
  // Note: Expenses are stored as positive values, so we need to subtract them
  const expenses = sumLinesByPattern(statementLines, [
    'COMPENSATION_EMPLOYEES', 'GOODS_SERVICES', 'GRANTS_TRANSFERS',
    'SUBSIDIES', 'SOCIAL_ASSISTANCE', 'FINANCE_COSTS', 'OTHER_EXPENSES'
  ]);

  // Adjustments (working capital changes - use change values, not balances)
  const adjustments = sumLinesByPatternForCashFlow(statementLines, [
    'CHANGES_RECEIVABLES', 'CHANGES_PAYABLES', 'PRIOR_YEAR_ADJUSTMENTS'
  ]);

  const operatingCashFlow = revenues - expenses + adjustments;

  return operatingCashFlow;
}

/**
 * Calculate investing cash flow
 */
function calculateInvestingCashFlow(statementLines: StatementLine[]): number {
  // Cash outflows (negative)
  const outflows = sumLinesByPattern(statementLines, [
    'ACQUISITION_FIXED_ASSETS', 'PURCHASE_SHARES'
  ]);

  // Cash inflows (positive)
  const inflows = sumLinesByPattern(statementLines, [
    'PROCEEDS_SALE_CAPITAL'
  ]);

  return inflows - outflows;
}

/**
 * Calculate financing cash flow
 */
function calculateFinancingCashFlow(statementLines: StatementLine[]): number {
  // Cash inflows (positive)
  const inflows = sumLinesByPattern(statementLines, [
    'PROCEEDS_BORROWINGS'
  ]);

  // Cash outflows (negative)
  const outflows = sumLinesByPattern(statementLines, [
    'REPAYMENT_BORROWINGS'
  ]);

  return inflows - outflows;
}

/**
 * Calculate net increase in cash
 */
function calculateNetIncreaseCash(statementLines: StatementLine[]): number {
  const operating = getLineValue(statementLines, 'NET_CASH_FLOW_OPERATING');
  const investing = getLineValue(statementLines, 'NET_CASH_FLOW_INVESTING');
  const financing = getLineValue(statementLines, 'NET_CASH_FLOW_FINANCING');

  const result = operating + investing + financing;

  return result;
}

// calculateCashEnding() function removed - CASH_ENDING now uses event mapping only

/**
 * Get the value of a specific line by line code
 * Enhanced to support NET_ASSETS_CHANGES with priority: total > adjustments > currentPeriodValue
 */
function getLineValue(statementLines: StatementLine[], lineCode: string): number {
  const line = statementLines.find(l => l.metadata.lineCode === lineCode);
  if (!line) {
    return 0;
  }


  // For NET_ASSETS_CHANGES, prefer total value, then adjustments, then currentPeriodValue
  if (line.total !== null && line.total !== undefined) {
    const value = typeof line.total === 'string' ? parseFloat(line.total.replace(/[^0-9.-]/g, '')) || 0 : line.total;
    return value;
  } else if (line.adjustments !== null && line.adjustments !== undefined) {
    const value = typeof line.adjustments === 'string' ? parseFloat(line.adjustments.replace(/[^0-9.-]/g, '')) || 0 : line.adjustments;
    return value;
  } else {
    const value = typeof line.currentPeriodValue === 'string' ? parseFloat(line.currentPeriodValue.replace(/[^0-9.-]/g, '')) || 0 : line.currentPeriodValue || 0;
    return value;
  }
}

/**
 * Validate cash reconciliation for Cash Flow statements
 * 
 * Checks if ending cash equals beginning cash + net increase
 * This is the fundamental cash flow reconciliation formula
 * 
 * @param statementLines Array of statement lines
 * @param statementCode Statement code
 * @returns Validation warning if discrepancy exists, null otherwise
 */
function validateCashReconciliation(
  statementLines: StatementLine[],
  statementCode: string
): string | null {
  // Only validate for Cash Flow statements
  if (statementCode !== 'CASH_FLOW') {
    return null;
  }

  // Get values
  const cashBeginning = getLineValue(statementLines, 'CASH_BEGINNING');
  const netIncrease = getLineValue(statementLines, 'NET_INCREASE_CASH');
  const cashEnding = getLineValue(statementLines, 'CASH_ENDING');

  // Calculate expected ending cash
  const expectedEnding = cashBeginning + netIncrease;

  // Calculate discrepancy
  const discrepancy = Math.abs(cashEnding - expectedEnding);
  const tolerance = 0.01; // Tolerance for floating point comparison

  // If discrepancy is within tolerance, no warning
  if (discrepancy <= tolerance) {
    return null;
  }

  // Generate warning message
  return `Cash reconciliation discrepancy: Ending cash (${cashEnding.toFixed(2)}) ` +
    `does not equal Beginning cash (${cashBeginning.toFixed(2)}) + ` +
    `Net increase (${netIncrease.toFixed(2)}) = ${expectedEnding.toFixed(2)}. ` +
    `Difference: ${discrepancy.toFixed(2)}. ` +
    `This may indicate data entry errors or missing transactions.`;
}

/**
 * Calculate balance as at June (current year)
 */
function calculateBalanceJuneCurrent(statementLines: StatementLine[]): number {
  // Starting balance (June previous year) + changes during previous-current fiscal year
  const startingBalance = getLineValue(statementLines, 'BALANCES_JUNE_PREV');

  // Prior year adjustments (previous-current fiscal year)
  const cashAdjustments = getLineValue(statementLines, 'CASH_EQUIVALENT_PREV_CURRENT');
  const receivablesAdjustments = getLineValue(statementLines, 'RECEIVABLES_PREV_CURRENT');
  const investmentsAdjustments = getLineValue(statementLines, 'INVESTMENTS_PREV_CURRENT');
  const payablesAdjustments = getLineValue(statementLines, 'PAYABLES_PREV_CURRENT');
  const borrowingAdjustments = getLineValue(statementLines, 'BORROWING_PREV_CURRENT');

  // Net surplus/deficit for previous-current fiscal year
  const netSurplus = getLineValue(statementLines, 'NET_SURPLUS_PREV_CURRENT');

  // Assets increase balance, liabilities decrease balance
  const netAdjustments = cashAdjustments + receivablesAdjustments + investmentsAdjustments
    - payablesAdjustments - borrowingAdjustments;

  return startingBalance + netAdjustments + netSurplus;
}

/**
 * Calculate balance as at July (current year) - should equal June current year
 */
function calculateBalanceJulyCurrent(statementLines: StatementLine[]): number {
  // Balance at July 1st should equal balance at June 30th
  return getLineValue(statementLines, 'BALANCE_JUNE_CURRENT');
}

/**
 * Calculate balance as at period end
 */
function calculateBalancePeriodEnd(statementLines: StatementLine[]): number {
  // Starting balance (July current year) + changes during current-next fiscal year
  const startingBalance = getLineValue(statementLines, 'BALANCE_JULY_CURRENT');

  // Prior year adjustments (current-next fiscal year)
  const cashAdjustments = getLineValue(statementLines, 'CASH_EQUIVALENT_CURRENT_NEXT');
  const receivablesAdjustments = getLineValue(statementLines, 'RECEIVABLES_CURRENT_NEXT');
  const investmentsAdjustments = getLineValue(statementLines, 'INVESTMENTS_CURRENT_NEXT');
  const payablesAdjustments = getLineValue(statementLines, 'PAYABLES_CURRENT_NEXT');
  const borrowingAdjustments = getLineValue(statementLines, 'BORROWING_CURRENT_NEXT');

  // Net surplus/deficit for current-next fiscal year
  const netSurplus = getLineValue(statementLines, 'NET_SURPLUS_CURRENT_NEXT');

  // Assets increase balance, liabilities decrease balance
  const netAdjustments = cashAdjustments + receivablesAdjustments + investmentsAdjustments
    - payablesAdjustments - borrowingAdjustments;

  return startingBalance + netAdjustments + netSurplus;
}/*
*
 * Calculate total receipts for budget vs actual
 */
function calculateTotalReceipts(statementLines: StatementLine[]): number {
  return sumLinesByPattern(statementLines, [
    'TAX_REVENUE', 'GRANTS_TRANSFERS', 'OTHER_REVENUE', 'TRANSFERS_PUBLIC'
  ]);
}

/**
 * Calculate total expenditures for budget vs actual
 */
function calculateTotalExpenditures(statementLines: StatementLine[]): number {
  return sumLinesByPattern(statementLines, [
    'COMPENSATION_EMPLOYEES', 'GOODS_SERVICES', 'FINANCE_COSTS',
    'SUBSIDIES', 'GRANTS_OTHER_TRANSFERS', 'SOCIAL_ASSISTANCE', 'OTHER_EXPENSES'
  ]);
}

/**
 * Calculate net lending/borrowing for budget vs actual
 */
function calculateNetLendingBorrowing(statementLines: StatementLine[]): number {
  const totalReceipts = getLineValue(statementLines, 'TOTAL_RECEIPTS');
  const totalExpenditures = getLineValue(statementLines, 'TOTAL_EXPENDITURES');
  const totalNonFinancialAssets = getLineValue(statementLines, 'TOTAL_NON_FINANCIAL_ASSETS');

  return totalReceipts - totalExpenditures - totalNonFinancialAssets;
}/**
 * Get fiscal year context for dynamic placeholder replacement
 */
async function getFiscalYearContext(reportingPeriod: any): Promise<{
  prevYear: number;
  currentYear: number;
  nextYear: number;
  periodEndDate: string;
}> {
  // Use startDate to determine the fiscal year, not the year field
  // For period 2026 (2025-07-01 to 2026-06-30):
  // - startDate year = 2025 (this is the current fiscal year)
  // - prevYear = 2024
  // - nextYear = 2026
  let currentYear = new Date().getFullYear();

  if (reportingPeriod?.startDate) {
    const startDate = new Date(reportingPeriod.startDate);
    currentYear = startDate.getFullYear();
  } else if (reportingPeriod?.year) {
    // Fallback: if no startDate, assume year field is the ending year
    // and subtract 1 to get the starting year
    currentYear = reportingPeriod.year - 1;
  }

  const prevYear = currentYear - 1;
  const nextYear = currentYear + 1;

  // Format period end date (e.g., "30th June 2026")
  let periodEndDate = 'Period End';
  if (reportingPeriod?.endDate) {
    const endDate = new Date(reportingPeriod.endDate);
    const day = endDate.getDate();
    const month = endDate.toLocaleString('en-US', { month: 'long' });
    const year = endDate.getFullYear();

    // Add ordinal suffix (1st, 2nd, 3rd, 4th, etc.)
    const ordinalSuffix = (day: number) => {
      if (day > 3 && day < 21) return 'th';
      switch (day % 10) {
        case 1: return 'st';
        case 2: return 'nd';
        case 3: return 'rd';
        default: return 'th';
      }
    };

    periodEndDate = `${day}${ordinalSuffix(day)} ${month} ${year}`;
  }

  return {
    prevYear,
    currentYear,
    nextYear,
    periodEndDate
  };
}

/**
 * Replace fiscal year placeholders in template descriptions
 */
function replaceFiscalYearPlaceholders(
  description: string,
  context: { prevYear: number; currentYear: number; nextYear: number; periodEndDate: string }
): string {
  return description
    .replace(/\{\{PREV_YEAR\}\}/g, context.prevYear.toString())
    .replace(/\{\{CURRENT_YEAR\}\}/g, context.currentYear.toString())
    .replace(/\{\{NEXT_YEAR\}\}/g, context.nextYear.toString())
    .replace(/\{\{PERIOD_END_DATE\}\}/g, context.periodEndDate);
}

/**

 * Map execution events to their planning counterparts for BUDGET_VS_ACTUAL
 */
function mapExecutionToPlanningEvent(executionEventCode: string): string {
  // The issue is that ALL planning activities are currently mapped to event 43 (GOODS_SERVICES_PLANNING)
  // But they should be mapped to appropriate events based on their purpose.
  // For now, we'll map everything to GOODS_SERVICES_PLANNING since that's where the planning data is.
  // This is a temporary solution until the planning data mapping is fixed in the database.

  const executionToPlanningMap: Record<string, string> = {
    // All execution events map to GOODS_SERVICES_PLANNING because that's where all planning data is stored
    'TAX_REVENUE': 'GOODS_SERVICES_PLANNING',               // Event 1 → Event 43
    'GRANTS': 'GOODS_SERVICES_PLANNING',                    // Event 2 → Event 43
    'TRANSFERS_PUBLIC_ENTITIES': 'GOODS_SERVICES_PLANNING', // Event 4 → Event 43
    'OTHER_REVENUE': 'GOODS_SERVICES_PLANNING',             // Event 9 → Event 43
    'COMPENSATION_EMPLOYEES': 'GOODS_SERVICES_PLANNING',    // Event 12 → Event 43
    'GOODS_SERVICES': 'GOODS_SERVICES_PLANNING',            // Event 13 → Event 43
    'GRANTS_TRANSFERS': 'GOODS_SERVICES_PLANNING',          // Event 14 → Event 43
    'SUBSIDIES': 'GOODS_SERVICES_PLANNING',                 // Event 15 → Event 43
    'SOCIAL_ASSISTANCE': 'GOODS_SERVICES_PLANNING',         // Event 16 → Event 43
    'FINANCE_COSTS': 'GOODS_SERVICES_PLANNING',             // Event 17 → Event 43
    'OTHER_EXPENSES': 'GOODS_SERVICES_PLANNING',            // Event 20 → Event 43
  };

  return executionToPlanningMap[executionEventCode] || executionEventCode;
}

/**
 * Export financial statement to various formats
 */
export const exportStatement: AppRouteHandler<typeof import('./financial-reports.routes').exportStatement> = async (c) => {
  try {
    const requestBody = await c.req.json();
    console.log('[Export] Received request body:', JSON.stringify(requestBody, null, 2));

    const {
      reportId,
      exportFormat = 'pdf',
      exportOptions = {},
    } = requestBody;

    let statementResponse: FinancialStatementResponse;
    let reportData = null;

    // Two modes of operation:
    // 1. If reportId is provided: Use snapshot data from submitted/approved report
    // 2. If no reportId: Generate statement from live data (current behavior)

    if (reportId) {
      // MODE 1: Export snapshot from submitted/approved report
      console.log(`[Export] Using snapshot mode for reportId: ${reportId}`);

      // Fetch the report with all relations
      reportData = await db.query.financialReports.findFirst({
        where: eq(financialReports.id, reportId),
        with: {
          submitter: true,
          dafApprover: true,
          dgApprover: true,
          facility: true,
          project: true,
          reportingPeriod: true,
        }
      });

      if (!reportData) {
        return c.json({
          message: 'Report not found',
          error: `No report found with ID ${reportId}`
        }, HttpStatusCodes.NOT_FOUND);
      }

      // Check if report has statement data
      const reportDataObj = reportData.reportData as any;
      const hasValidSnapshot = reportDataObj?.statement?.lines?.length > 0;

      console.log(`[Export] Has valid snapshot:`, hasValidSnapshot);
      console.log(`[Export] Snapshot lines count:`, reportDataObj?.statement?.lines?.length || 0);

      if (!hasValidSnapshot) {
        // Snapshot is empty or invalid - fall back to live generation
        console.log(`[Export] Snapshot is empty, falling back to live generation`);

        // Extract parameters from report to generate statement
        const statementCode = reportDataObj?.statementCode || reportData.metadata?.statementCode || 'REV_EXP';

        const generateRequestBody = {
          statementCode,
          reportingPeriodId: reportData.reportingPeriodId,
          projectType: reportData.project?.type || 'HIV',
          facilityId: reportData.facilityId,
        };

        console.log(`[Export] Generating with params:`, generateRequestBody);

        // Create a mock context for generateStatement
        const mockContext = {
          ...c,
          req: {
            ...c.req,
            json: async () => generateRequestBody
          }
        } as any;

        // Call generateStatement
        const generateResponse = await (generateStatement as any)(mockContext);
        let responseStatus: number = HttpStatusCodes.OK;

        if (typeof generateResponse === 'object' && 'statement' in generateResponse) {
          statementResponse = generateResponse as unknown as FinancialStatementResponse;
        } else {
          const responseClone = (generateResponse as Response).clone();
          responseStatus = responseClone.status;
          statementResponse = await responseClone.json() as FinancialStatementResponse;
        }

        if (responseStatus !== HttpStatusCodes.OK) {
          return c.json(statementResponse as any, responseStatus as any);
        }

        console.log(`[Export] Generated statement with ${statementResponse.statement.lines?.length || 0} lines`);
      } else {
        // Use the report's statement data (snapshot for submitted/approved reports)
        statementResponse = {
          statement: reportDataObj.statement,
          validation: reportDataObj.validation || { isValid: true, errors: [], warnings: [] },
          performance: reportDataObj.performance || null
        };

        console.log(`[Export] Using snapshot with ${statementResponse.statement.lines?.length || 0} lines`);
      }

    } else {
      // MODE 2: Generate statement from live data
      console.log('[Export] Using live generation mode');

      // Generate the statement using the same logic as generateStatement
      const generateRequestBody = { ...requestBody };
      delete (generateRequestBody as any).exportFormat;
      delete (generateRequestBody as any).exportOptions;
      delete (generateRequestBody as any).reportId; // Remove reportId if accidentally included

      // Create a mock context for generateStatement
      const mockContext = {
        ...c,
        req: {
          ...c.req,
          json: async () => generateRequestBody
        }
      } as any;

      // Call generateStatement with the mock context
      const generateResponse = await (generateStatement as any)(mockContext);

      // Extract the JSON data from the response
      let responseStatus: number = HttpStatusCodes.OK;

      if (typeof generateResponse === 'object' && 'statement' in generateResponse) {
        statementResponse = generateResponse as unknown as FinancialStatementResponse;
        responseStatus = HttpStatusCodes.OK;
      } else {
        const responseClone = (generateResponse as Response).clone();
        responseStatus = responseClone.status;
        statementResponse = await responseClone.json() as FinancialStatementResponse;
      }

      // Check if generation failed
      if (responseStatus !== HttpStatusCodes.OK) {
        return c.json(statementResponse as any, responseStatus as any);
      }
    }

    // Step 3: Transform into format expected by export functions
    const exportData = {
      statement: statementResponse.statement,
      report: reportData
    };

    console.log(`[Export] Passing to PDF generator - Statement lines: ${exportData.statement.lines?.length || 0}`);
    console.log(`[Export] Has report data: ${!!exportData.report}`);

    // Step 4: Export based on format
    switch (exportFormat) {
      case 'pdf':
        return await exportToPDF(exportData, exportOptions || {}, c);

      case 'excel':
        return await exportToExcel(exportData, exportOptions || {}, c);

      case 'csv':
        return await exportToCSV(exportData, exportOptions || {}, c);

      default:
        return c.json({
          message: 'Unsupported export format',
          error: `Format '${exportFormat}' is not supported. Use 'pdf', 'excel', or 'csv'.`
        }, HttpStatusCodes.BAD_REQUEST);
    }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

    return c.json({
      message: 'Statement export failed',
      error: errorMessage
    }, HttpStatusCodes.INTERNAL_SERVER_ERROR);
  }
};

/**
 * Generate PDF for a financial report
 */
export const generatePdf: AppRouteHandler<typeof import('./financial-reports.routes').generatePdf> = async (c) => {
  try {
    const { id } = c.req.valid("param");
    const reportId = parseInt(id);

    // Fetch report with all relations needed for PDF
    const report = await db.query.financialReports.findFirst({
      where: eq(financialReports.id, reportId),
      with: {
        submitter: true,
        dafApprover: true,
        dgApprover: true,
        facility: true,
        project: true,
      }
    });

    if (!report) {
      return c.json({
        message: 'Report not found',
      }, HttpStatusCodes.NOT_FOUND);
    }

    // Generate PDF buffer
    const pdfBuffer = await pdfGenerationService.generateFinancialReportPdf(report as any);

    // Convert Buffer to Uint8Array for Hono
    const uint8Array = new Uint8Array(pdfBuffer);

    // Return PDF as response
    return c.body(uint8Array, HttpStatusCodes.OK, {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="financial-report-${reportId}.pdf"`,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

    return c.json({
      message: 'PDF generation failed',
      error: errorMessage
    }, HttpStatusCodes.INTERNAL_SERVER_ERROR);
  }
};

/**
 * Export statement to PDF format with professional government styling
 */
async function exportToPDF(statementData: any, options: any, c: any) {
  const {
    includeMetadata = true,
    includeFootnotes = true,
    includeValidation = false,
    pageOrientation = 'portrait',
    fontSize = 'medium',
    showZeroValues = true,
  } = options;

  // Create PDF document
  const doc = new PDFDocument({
    size: 'A4',
    layout: pageOrientation,
    margins: {
      top: 40,
      bottom: 50,
      left: 40,
      right: 40
    }
  });

  // Collect PDF chunks
  const chunks: Buffer[] = [];
  doc.on('data', (chunk) => chunks.push(chunk));

  // Wait for PDF to finish
  const pdfPromise = new Promise<Buffer>((resolve) => {
    doc.on('end', () => resolve(Buffer.concat(chunks)));
  });

  // Font sizes
  const fontSizes = {
    small: { header: 10, title: 11, body: 9, note: 8 },
    medium: { header: 11, title: 12, body: 10, note: 9 },
    large: { header: 12, title: 13, body: 11, note: 10 }
  };
  const fonts = fontSizes[fontSize as keyof typeof fontSizes] || fontSizes.medium;

  // Professional color scheme (hex colors for PDFKit)
  const colors = {
    mainSection: { bg: '#4A4A4A', text: '#FFFFFF' },      // Dark Gray
    subSection: { bg: '#D3D3D3', text: '#2C2C2C' },       // Light Gray
    lineItem: { bg: '#FFFFFF', text: '#000000' },          // White
    border: '#CCCCCC',                                     // Light gray border
    negative: '#CC0000'                                    // Red for negatives
  };

  // Get project and fiscal year info
  // The reporting period year represents the START of the fiscal year
  // For FY 2025-2026, the year would be 2025
  const reportingPeriod = statementData.statement?.reportingPeriod || {};
  const derivedYear = typeof reportingPeriod.year === 'number'
    ? reportingPeriod.year
    : (reportingPeriod.startDate ? new Date(reportingPeriod.startDate).getFullYear() : new Date().getFullYear());
  const currentFYStart = derivedYear;
  const currentFYEnd = currentFYStart + 1;
  const previousFYStart = currentFYStart - 1;
  const previousFYEnd = currentFYStart;

  const periodEndDate = reportingPeriod.endDate
    ? new Date(reportingPeriod.endDate)
    : (reportingPeriod.startDate ? new Date(reportingPeriod.startDate) : new Date());
  const formattedEndDate = periodEndDate.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  // Report Header Section
  if (includeMetadata) {
    doc.fontSize(fonts.header).font('Helvetica-Bold')
      .fillColor('black')
      .text('Government of Rwanda', { align: 'left' });

    // Get project name from facility or use default
    const projectName = statementData.statement.facility?.name || 'Financial Management Program';
    doc.fontSize(fonts.header).font('Helvetica-Bold')
      .text(projectName, { align: 'left' });

    doc.moveDown(0.3);

    doc.fontSize(fonts.header).font('Helvetica-Bold')
      .text(`Financial Statements for the Year Ended ${formattedEndDate}`, { align: 'left' });

    doc.moveDown(0.8);
  }

  // Statement Title
  doc.fontSize(fonts.title).font('Helvetica-Bold')
    .fillColor('black')
    .text(statementData.statement.statementName, { align: 'left', underline: true });

  doc.moveDown(0.3);

  // doc.fontSize(fonts.body).font('Helvetica')
  //   .text(`for the Period Ended ${formattedEndDate}`, { align: 'left', underline: false });

  doc.moveDown(0.8);

  // Table setup - adjust column widths based on statement type
  const pageWidth = doc.page.width - 80; // Account for margins
  const isBudgetVsActual = statementData.statement.statementCode === 'BUDGET_VS_ACTUAL';

  const colWidths: any = isBudgetVsActual ? {
    description: pageWidth * 0.35,
    note: pageWidth * 0.08,
    budget: pageWidth * 0.15,
    actual: pageWidth * 0.15,
    variance: pageWidth * 0.15,
    performance: pageWidth * 0.12
  } : {
    description: pageWidth * 0.50,
    note: pageWidth * 0.10,
    current: pageWidth * 0.20,
    previous: pageWidth * 0.20
  };

  const tableLeft = 40;
  const rowHeight = 22;

  // Helper function to draw table row with background
  function drawTableRow(y: number, height: number, bgColor: string) {
    doc.rect(tableLeft, y, pageWidth, height)
      .fillColor(bgColor)
      .fillOpacity(1)
      .fill()
      .strokeColor(colors.border)
      .lineWidth(0.5)
      .stroke();
  }

  // Helper function to classify row type
  function getRowType(description: string): 'main' | 'sub' | 'total' | 'item' {
    // Main sections: starts with number followed by dot and all caps
    if (/^\d+\.\s+[A-Z]/.test(description) && !description.includes('TOTAL')) {
      return 'main';
    }
    // Sub-sections: starts with decimal notation (1.1, 1.2, 1.3)
    if (/^\d+\.\d+\s+/.test(description)) {
      return 'sub';
    }
    // Total rows: contains word "TOTAL" in all caps
    if (/TOTAL/.test(description)) {
      return 'total';
    }
    // Everything else is a line item
    return 'item';
  }

  // Table Headers
  let currentY = doc.y;
  drawTableRow(currentY, rowHeight, colors.mainSection.bg);

  doc.fontSize(fonts.body).font('Helvetica-Bold')
    .fillColor(colors.mainSection.text);

  doc.text('DESCRIPTION', tableLeft + 5, currentY + 6, {
    width: colWidths.description - 10,
    continued: false
  });

  doc.text('NOTE', tableLeft + colWidths.description, currentY + 6, {
    width: colWidths.note,
    align: 'center',
    continued: false
  });

  if (isBudgetVsActual) {
    // Budget vs Actual column headers
    doc.text('REVISED BUDGET (A)', tableLeft + colWidths.description + colWidths.note, currentY + 6, {
      width: colWidths.budget, align: 'right', continued: false
    });

    doc.text('ACTUAL (B)', tableLeft + colWidths.description + colWidths.note + colWidths.budget, currentY + 6, {
      width: colWidths.actual, align: 'right', continued: false
    });

    doc.text('VARIANCE (A - B)', tableLeft + colWidths.description + colWidths.note + colWidths.budget + colWidths.actual, currentY + 6, {
      width: colWidths.variance, align: 'right', continued: false
    });

    doc.text('PERFORMANCE %', tableLeft + colWidths.description + colWidths.note + colWidths.budget + colWidths.actual + colWidths.variance, currentY + 6, {
      width: colWidths.performance, align: 'right', continued: false
    });
  } else {
    // Regular statement column headers
    doc.text(`FY ${currentFYStart}/${currentFYEnd} (FRW)`,
      tableLeft + colWidths.description + colWidths.note,
      currentY + 6,
      { width: colWidths.current, align: 'right', continued: false }
    );

    doc.text(`FY ${previousFYStart}/${previousFYEnd} (FRW)`,
      tableLeft + colWidths.description + colWidths.note + colWidths.current,
      currentY + 6,
      { width: colWidths.previous, align: 'right', continued: false }
    );
  }

  currentY += rowHeight;

  // Statement lines
  console.log(`[PDF] Rendering ${statementData.statement.lines?.length || 0} statement lines`);

  for (const line of statementData.statement.lines) {
    // Handle different statement formats
    const isBudgetVsActual = statementData.statement.statementCode === 'BUDGET_VS_ACTUAL';

    // Skip zero values if option is set
    let shouldSkip = false;
    if (isBudgetVsActual) {
      // For BUDGET_VS_ACTUAL: check revisedBudget and actual
      shouldSkip = !showZeroValues && (line.revisedBudget === 0 && line.actual === 0);
    } else {
      // For regular statements: check currentPeriodValue and previousPeriodValue
      shouldSkip = !showZeroValues && (line.currentPeriodValue === 0 && line.previousPeriodValue === 0);
    }

    if (shouldSkip) {
      continue;
    }

    // Check if we need a new page
    if (currentY > doc.page.height - 100) {
      doc.addPage();
      currentY = 40;
    }

    // Determine row type and styling
    const rowType = getRowType(line.description);
    let bgColor: string;
    let textColor: string;
    let isBold = false;
    let indent = 0;

    switch (rowType) {
      case 'main':
        bgColor = colors.mainSection.bg;
        textColor = colors.mainSection.text;
        isBold = true;
        break;
      case 'sub':
        bgColor = colors.subSection.bg;
        textColor = colors.subSection.text;
        isBold = true;
        break;
      case 'total':
        bgColor = colors.mainSection.bg;
        textColor = colors.mainSection.text;
        isBold = true;
        break;
      case 'item':
      default:
        bgColor = colors.lineItem.bg;
        textColor = colors.lineItem.text;
        isBold = false;
        indent = 20; // Indent line items
        break;
    }

    // Draw row background
    drawTableRow(currentY, rowHeight, bgColor);

    // Set text styling
    doc.fontSize(fonts.body)
      .font(isBold ? 'Helvetica-Bold' : 'Helvetica')
      .fillColor(textColor);

    // Description
    doc.text(line.description, tableLeft + 5 + indent, currentY + 6, {
      width: colWidths.description - 10 - indent,
      continued: false
    });

    // Note number
    if (line.note) {
      doc.text(line.note.toString(),
        tableLeft + colWidths.description,
        currentY + 6,
        { width: colWidths.note, align: 'center', continued: false }
      );
    }

    // Handle different statement formats for value display
    let currentValue: string;
    let previousValue: string;
    let currentValueColor: string;
    let previousValueColor: string;

    if (isBudgetVsActual) {
      // For BUDGET_VS_ACTUAL: use revisedBudget and actual
      currentValue = line.actual === 0 ? '-' : formatNumber(line.actual);
      previousValue = line.revisedBudget === 0 ? '-' : formatNumber(line.revisedBudget);
      currentValueColor = line.actual < 0 ? colors.negative : textColor;
      previousValueColor = line.revisedBudget < 0 ? colors.negative : textColor;
    } else {
      // For regular statements: use currentPeriodValue and previousPeriodValue
      currentValue = line.currentPeriodValue === 0 ? '-' : formatNumber(line.currentPeriodValue);
      previousValue = line.previousPeriodValue === 0 ? '-' : formatNumber(line.previousPeriodValue);
      currentValueColor = line.currentPeriodValue < 0 ? colors.negative : textColor;
      previousValueColor = line.previousPeriodValue < 0 ? colors.negative : textColor;
    }

    if (isBudgetVsActual) {
      // Budget vs Actual format: Budget, Actual, Variance, Performance %

      // Revised Budget (A)
      doc.fillColor(previousValueColor);
      doc.text(previousValue,
        tableLeft + colWidths.description + colWidths.note,
        currentY + 6,
        { width: colWidths.budget - 5, align: 'right', continued: false }
      );

      // Actual (B)
      doc.fillColor(currentValueColor);
      doc.text(currentValue,
        tableLeft + colWidths.description + colWidths.note + colWidths.budget,
        currentY + 6,
        { width: colWidths.actual - 5, align: 'right', continued: false }
      );

      // Variance (A - B)
      const varianceValue = line.variance === 0 ? '-' : formatNumber(line.variance);
      const varianceColor = line.variance < 0 ? colors.negative : textColor;
      doc.fillColor(varianceColor);
      doc.text(varianceValue,
        tableLeft + colWidths.description + colWidths.note + colWidths.budget + colWidths.actual,
        currentY + 6,
        { width: colWidths.variance - 5, align: 'right', continued: false }
      );

      // Performance %
      const performanceValue = line.performancePercentage !== undefined ?
        `${line.performancePercentage.toFixed(2)}%` : '-';
      doc.fillColor(textColor);
      doc.text(performanceValue,
        tableLeft + colWidths.description + colWidths.note + colWidths.budget + colWidths.actual + colWidths.variance,
        currentY + 6,
        { width: colWidths.performance - 5, align: 'right', continued: false }
      );
    } else {
      // Regular statement format: Current Period, Previous Period

      // Current period value
      doc.fillColor(currentValueColor);
      doc.text(currentValue,
        tableLeft + colWidths.description + colWidths.note,
        currentY + 6,
        { width: colWidths.current - 5, align: 'right', continued: false }
      );

      // Previous period value
      doc.fillColor(previousValueColor);
      doc.text(previousValue,
        tableLeft + colWidths.description + colWidths.note + colWidths.current,
        currentY + 6,
        { width: colWidths.previous - 5, align: 'right', continued: false }
      );
    }

    currentY += rowHeight;
  }

  // Footnotes section - REMOVED for cleaner PDF
  // if (includeFootnotes && statementData.statement.metadata?.footnotes?.length > 0) {
  //   doc.addPage();
  //   doc.fontSize(fonts.title).font('Helvetica-Bold')
  //     .fillColor('black')
  //     .text('Notes and Footnotes', { align: 'left' });
  //   doc.moveDown(0.5);

  //   doc.fontSize(fonts.note).font('Helvetica');
  //   statementData.statement.metadata.footnotes.forEach((footnote: any) => {
  //     doc.text(`${footnote.number}. ${footnote.text}`, { align: 'left' });
  //     doc.moveDown(0.3);
  //   });
  // }

  // Validation section - REMOVED for cleaner PDF
  // if (includeValidation && statementData.validation) {
  //   doc.addPage();
  //   doc.fontSize(fonts.title).font('Helvetica-Bold')
  //     .fillColor('black')
  //     .text('Validation Results', { align: 'left' });
  //   doc.moveDown(0.5);

  //   doc.fontSize(fonts.body).font('Helvetica');
  //   doc.text(`Overall Status: ${statementData.validation.summary.overallStatus}`, { align: 'left' });
  //   doc.text(`Total Checks: ${statementData.validation.summary.totalChecks}`, { align: 'left' });
  //   doc.text(`Passed: ${statementData.validation.summary.passedChecks}`, { align: 'left' });
  //   doc.text(`Errors: ${statementData.validation.summary.criticalErrors}`, { align: 'left' });
  //   doc.text(`Warnings: ${statementData.validation.summary.warnings}`, { align: 'left' });
  // }

  // Footer on each page
  const range = doc.bufferedPageRange();
  for (let i = 0; i < range.count; i++) {
    // switchToPage uses 0-based indexing, but we need to account for the range start
    doc.switchToPage(range.start + i);

    doc.fontSize(fonts.note).font('Helvetica')
      .fillColor('black')
      .text(
        `Page ${i + 1} of ${range.count}`,
        40,
        doc.page.height - 40,
        { align: 'center' }
      );
  }

  // Add approval signatures if report data is available
  if (statementData.report) {
    addApprovalSignatures(doc, statementData.report, fonts);
  }

  // Finalize PDF
  doc.end();

  // Wait for PDF to be generated
  const pdfBuffer = await pdfPromise;

  // Set response headers for PDF download
  const rpPdf = statementData.statement?.reportingPeriod || {};
  const yearPdf = typeof rpPdf.year === 'number' ? rpPdf.year : (rpPdf.startDate ? new Date(rpPdf.startDate).getFullYear() : new Date().getFullYear());
  const filename = `${statementData.statement.statementCode}_${yearPdf}_${Date.now()}.pdf`;

  c.header('Content-Type', 'application/pdf');
  c.header('Content-Disposition', `attachment; filename="${filename}"`);

  return c.body(pdfBuffer);
}

/**
 * Add approval signatures section to PDF
 */
function addApprovalSignatures(doc: PDFKit.PDFDocument, report: any, fonts: any) {
  // Check if there's enough space on current page for signatures (need ~300 points)
  const currentY = doc.y;
  const pageHeight = doc.page.height;
  const spaceNeeded = 300;
  const spaceAvailable = pageHeight - currentY - 50; // 50 for bottom margin

  // Only add new page if not enough space
  if (spaceAvailable < spaceNeeded) {
    doc.addPage();
  } else {
    // Add minimal spacing before signatures if on same page
    doc.moveDown(1);
  }

  doc.fontSize(fonts.title).font('Helvetica-Bold')
    .fillColor('black')
    .text('Approval Signatures', { underline: true });
  doc.moveDown(1.5);

  doc.fontSize(fonts.body).font('Helvetica');

  // Prepared by (Submitter)
  doc.font('Helvetica-Bold').text('Prepared by:');
  doc.moveDown(0.5);
  if (report.submitter) {
    doc.font('Helvetica').text(`Name: ${report.submitter.name}`);
  } else {
    doc.font('Helvetica').text('Name: _______________________________');
  }
  if (report.submittedAt) {
    const submittedDate = new Date(report.submittedAt).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
    doc.text(`Date: ${submittedDate}`);
  } else {
    doc.text('Date: _______________________________');
  }
  doc.moveDown(0.5);
  doc.text('Signature: _______________________________');
  doc.moveDown(2);

  // Approved by DAF
  doc.font('Helvetica-Bold').text('Reviewed by (DAF):');
  doc.moveDown(0.5);
  if (report.dafApprover) {
    doc.font('Helvetica').text(`Name: ${report.dafApprover.name}`);
  } else {
    doc.font('Helvetica').text('Name: _______________________________');
  }
  if (report.dafApprovedAt) {
    const dafDate = new Date(report.dafApprovedAt).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
    doc.text(`Date: ${dafDate}`);
  } else {
    doc.text('Date: _______________________________');
  }
  doc.moveDown(0.5);
  doc.text('Signature: _______________________________');
  doc.moveDown(2);

  // Final Approval by DG
  doc.font('Helvetica-Bold').text('Approved by (DG):');
  doc.moveDown(0.5);
  if (report.dgApprover) {
    doc.font('Helvetica').text(`Name: ${report.dgApprover.name}`);
  } else {
    doc.font('Helvetica').text('Name: _______________________________');
  }
  if (report.dgApprovedAt) {
    const dgDate = new Date(report.dgApprovedAt).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
    doc.text(`Date: ${dgDate}`);
  } else {
    doc.text('Date: _______________________________');
  }
  doc.moveDown(0.5);
  doc.text('Signature: _______________________________');
}

/**
 * Format number for display
 */
function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);
}

/**
 * Export statement to Excel format
 */
async function exportToExcel(statementData: any, options: any, c: any) {
  // TODO: Implement Excel generation using a library like exceljs
  // For now, return a placeholder response

  const {
    includeMetadata = true,
    includeFootnotes = true,
    showZeroValues = true,
    highlightNegatives = true,
  } = options;

  // Generate Excel content (placeholder)
  const excelContent = generateExcelContent(statementData, {
    includeMetadata,
    includeFootnotes,
    showZeroValues,
    highlightNegatives,
  });

  // Set response headers for Excel download
  const rpExcel = statementData.statement?.reportingPeriod || {};
  const yearExcel = typeof rpExcel.year === 'number' ? rpExcel.year : (rpExcel.startDate ? new Date(rpExcel.startDate).getFullYear() : new Date().getFullYear());
  const filename = `${statementData.statement.statementCode}_${yearExcel}_${Date.now()}.xlsx`;

  c.header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  c.header('Content-Disposition', `attachment; filename="${filename}"`);

  return c.body(excelContent);
}

/**
 * Export statement to CSV format
 */
async function exportToCSV(statementData: any, options: any, c: any) {
  const {
    includeMetadata = true,
    showZeroValues = true,
  } = options;

  // Generate CSV content
  let csvContent = '';

  // Add header metadata
  if (includeMetadata) {
    csvContent += `Statement,${statementData.statement.statementName}\n`;
    csvContent += `Statement Code,${statementData.statement.statementCode}\n`;
    const rpCsv = statementData.statement?.reportingPeriod || {};
    const yearCsv = typeof rpCsv.year === 'number' ? rpCsv.year : (rpCsv.startDate ? new Date(rpCsv.startDate).getFullYear() : new Date().getFullYear());
    csvContent += `Reporting Period,${yearCsv}\n`;
    csvContent += `Generated At,${statementData.statement.generatedAt}\n`;

    if (statementData.statement.facility) {
      csvContent += `Facility,${statementData.statement.facility.name}\n`;
    }

    csvContent += '\n';
  }

  // Add column headers based on statement type
  const isBudgetVsActual = statementData.statement.statementCode === 'BUDGET_VS_ACTUAL';

  const headers = isBudgetVsActual ?
    ['Description', 'Note', 'Revised Budget (A)', 'Actual (B)', 'Variance (A - B)', 'Performance %'] :
    ['Description', 'Current Period', 'Previous Period'];

  if (!isBudgetVsActual && statementData.statement.hasPreviousPeriodData) {
    headers.push('Variance (Absolute)', 'Variance (%)');
  }

  csvContent += headers.join(',') + '\n';

  // Add statement lines
  for (const line of statementData.statement.lines) {
    // Handle different statement formats
    const isBudgetVsActual = statementData.statement.statementCode === 'BUDGET_VS_ACTUAL';

    // Skip zero values if option is set
    let shouldSkip = false;
    if (isBudgetVsActual) {
      // For BUDGET_VS_ACTUAL: check revisedBudget and actual
      shouldSkip = !showZeroValues && (line.revisedBudget === 0 && line.actual === 0);
    } else {
      // For regular statements: check currentPeriodValue and previousPeriodValue
      shouldSkip = !showZeroValues && (line.currentPeriodValue === 0 && line.previousPeriodValue === 0);
    }

    if (shouldSkip) {
      continue;
    }

    // Handle different value formats
    let currentValue: number;
    let previousValue: number;

    if (isBudgetVsActual) {
      // For BUDGET_VS_ACTUAL: use actual and revisedBudget
      currentValue = line.actual || 0;
      previousValue = line.revisedBudget || 0;
    } else {
      // For regular statements: use currentPeriodValue and previousPeriodValue
      currentValue = line.currentPeriodValue || 0;
      previousValue = line.previousPeriodValue || 0;
    }

    if (isBudgetVsActual) {
      // Budget vs Actual format: Description, Note, Revised Budget, Actual, Variance, Performance %
      const noteValue = line.note || '';
      const varianceValue = line.variance || 0;
      const performanceValue = line.performancePercentage !== undefined ?
        `${line.performancePercentage.toFixed(2)}%` : '-';

      const row = [
        `"${line.description}"`,
        noteValue,
        previousValue, // Revised Budget
        currentValue,  // Actual
        varianceValue,
        performanceValue
      ];

      csvContent += row.join(',') + '\n';
    } else {
      // Regular statement format
      const row = [
        `"${line.description}"`,
        currentValue,
        previousValue,
      ];

      // Handle variance for regular statements
      if (statementData.statement.hasPreviousPeriodData) {
        if (line.variance) {
          row.push(line.variance.absolute);
          row.push(line.variance.percentage);
        } else {
          row.push(0, '0.00');
        }
      }

      csvContent += row.join(',') + '\n';
    }
  }

  // Add totals section
  if (includeMetadata) {
    csvContent += '\nTotals\n';
    for (const [key, value] of Object.entries(statementData.statement.totals)) {
      csvContent += `${key},${value}\n`;
    }
  }

  // Set response headers for CSV download
  const rpFile = statementData.statement?.reportingPeriod || {};
  const yearFile = typeof rpFile.year === 'number' ? rpFile.year : (rpFile.startDate ? new Date(rpFile.startDate).getFullYear() : new Date().getFullYear());
  const filename = `${statementData.statement.statementCode}_${yearFile}_${Date.now()}.csv`;

  c.header('Content-Type', 'text/csv');
  c.header('Content-Disposition', `attachment; filename="${filename}"`);

  return c.body(csvContent);
}



/**
 * Generate Excel content (placeholder - to be implemented with actual Excel library)
 */
function generateExcelContent(statementData: any, _options: any): Buffer {
  // TODO: Implement actual Excel generation using exceljs
  // This is a placeholder that returns a simple text representation

  const content = `
Financial Statement Report (Excel Format)
Statement: ${statementData.statement.statementName}
Code: ${statementData.statement.statementCode}
Period: ${(() => { const rp = statementData.statement?.reportingPeriod || {}; return typeof rp.year === 'number' ? rp.year : (rp.startDate ? new Date(rp.startDate).getFullYear() : new Date().getFullYear()); })()}

Note: This is a placeholder. Implement actual Excel generation using exceljs.
  `;

  return Buffer.from(content, 'utf-8');
}

/**
 * Process NET_ASSETS_CHANGES statement with special column logic
 */
async function processNetAssetsChangesStatement(
  templateLine: any,
  aggregatedData: any,
  periodComparison: any,
  eventIdToCodeMap: Map<number, string>,
  customMappings: any,
  formulaEngine: any,
  statementLines: any[],
  previousPeriodData?: any
): Promise<{
  currentPeriodValue: number;
  previousPeriodValue: number;
  accumulatedSurplus: number | null;
  adjustments: number | null;
  total: number | null;
}> {
  const lineCode = templateLine.lineCode;
  const columnType = templateLine.metadata?.columnType;

  // Initialize return values
  let currentPeriodValue = 0;
  let previousPeriodValue = 0;
  let accumulatedSurplus: number | null = null;
  let adjustments: number | null = null;
  let total: number | null = null;

  // Handle different column types

  switch (columnType) {
    case 'ACCUMULATED':
      // For accumulated columns, show carryforward balances
      if (lineCode === 'BALANCES_JUNE_PREV') {
        // Previous year ending balance (should be 0 for first year)
        accumulatedSurplus = 0; // This would come from previous year's ending balance
        adjustments = null;
        total = accumulatedSurplus;
      } else if (lineCode === 'BALANCE_JULY_CURRENT') {
        // Current year beginning balance (same as previous year ending)
        const juneBalance = getLineValue(statementLines, 'BALANCE_JUNE_CURRENT');
        accumulatedSurplus = juneBalance;
        adjustments = null;
        total = accumulatedSurplus;
      } else {
        // Other accumulated lines
        accumulatedSurplus = 0;
        adjustments = null;
        total = accumulatedSurplus;
      }
      break;

    case 'ADJUSTMENT':
      // For adjustment columns in NET_ASSETS_CHANGES, values go to accumulatedSurplus
      // Use eventCodes from template or eventMappings from processing
      const eventCodesToProcess = templateLine.eventCodes || templateLine.eventMappings || [];

      if (eventCodesToProcess && eventCodesToProcess.length > 0) {
        // Calculate value based on event codes
        let eventValue = 0;

        // Determine which data source to use based on line code
        const isPrevCurrentLine = lineCode.includes('PREV_CURRENT');
        const dataSource = isPrevCurrentLine ? previousPeriodData : aggregatedData;

        for (const eventCodeOrId of eventCodesToProcess) {
          let eventCodeToLookup = eventCodeOrId;

          // Convert event ID to code if needed
          const numericId = parseInt(eventCodeOrId);
          if (!isNaN(numericId)) {
            const eventCode = eventIdToCodeMap.get(numericId);
            if (eventCode) {
              eventCodeToLookup = eventCode;
            }
          }

          // Get value from appropriate data source
          const amount = dataSource?.eventTotals?.get(eventCodeToLookup) || 0;
          eventValue += amount;
        }


        // For NET_ASSETS_CHANGES, all values go to accumulatedSurplus column
        // Assets increase net assets, liabilities decrease net assets
        if (lineCode.includes('CASH_EQUIVALENT') ||
          lineCode.includes('RECEIVABLES') ||
          lineCode.includes('INVESTMENTS')) {
          // Assets - positive value
          accumulatedSurplus = eventValue;
          adjustments = 0;
          total = accumulatedSurplus;
        } else if (lineCode.includes('PAYABLES') ||
          lineCode.includes('BORROWING')) {
          // Liabilities - negative value (liabilities decrease net assets)
          accumulatedSurplus = -eventValue;
          adjustments = 0;
          total = accumulatedSurplus;
        } else if (lineCode.includes('NET_SURPLUS')) {
          // Net surplus - calculated from revenue minus expenses
          accumulatedSurplus = eventValue;
          adjustments = 0;
          total = accumulatedSurplus;
        } else {
          // Default: value goes to accumulatedSurplus
          accumulatedSurplus = eventValue;
          adjustments = 0;
          total = accumulatedSurplus;
        }
      } else if (templateLine.calculationFormula) {
        // Handle calculated values - all go to accumulatedSurplus for NET_ASSETS_CHANGES
        const isPrevCurrentLine = lineCode.includes('PREV_CURRENT');
        const dataSource = isPrevCurrentLine ? previousPeriodData : aggregatedData;

        const context = {
          eventValues: dataSource?.eventTotals || new Map(),
          lineValues: new Map(statementLines.map(line => [line.metadata.lineCode, line.currentPeriodValue])),
          previousPeriodValues: new Map(),
          customMappings
        };

        try {
          const formulaResult = await formulaEngine.evaluateFormula(templateLine.calculationFormula, context);

          // All formula results go to accumulatedSurplus for NET_ASSETS_CHANGES
          accumulatedSurplus = formulaResult;
          adjustments = 0;
          total = accumulatedSurplus;
        } catch (error) {
          // Error case - set to 0
          accumulatedSurplus = 0;
          adjustments = 0;
          total = 0;
        }
      } else {
        // No event codes or formula - default to 0
        accumulatedSurplus = 0;
        adjustments = 0;
        total = 0;
      }
      break;

    case 'TOTAL':
      // For total columns, calculate based on previous lines
      if (lineCode === 'BALANCE_JUNE_CURRENT') {
        // Sum of previous year balance + adjustments
        const prevBalance = getLineValue(statementLines, 'BALANCES_JUNE_PREV');
        const cashAdj = getLineValue(statementLines, 'CASH_EQUIVALENT_PREV_CURRENT');
        const receivablesAdj = getLineValue(statementLines, 'RECEIVABLES_PREV_CURRENT');
        const investmentsAdj = getLineValue(statementLines, 'INVESTMENTS_PREV_CURRENT');
        const payablesAdj = getLineValue(statementLines, 'PAYABLES_PREV_CURRENT');
        const borrowingAdj = getLineValue(statementLines, 'BORROWING_PREV_CURRENT');
        const netSurplus = getLineValue(statementLines, 'NET_SURPLUS_PREV_CURRENT');

        // Calculate total balance
        total = prevBalance + cashAdj + receivablesAdj + investmentsAdj - payablesAdj - borrowingAdj + netSurplus;

        // For balance lines, the total goes to accumulatedSurplus, not adjustments
        accumulatedSurplus = total;
        adjustments = 0;

      } else if (lineCode === 'BALANCE_PERIOD_END') {
        // Sum of current year balance + adjustments
        const currentBalance = getLineValue(statementLines, 'BALANCE_JULY_CURRENT');
        const cashAdj = getLineValue(statementLines, 'CASH_EQUIVALENT_CURRENT_NEXT');
        const receivablesAdj = getLineValue(statementLines, 'RECEIVABLES_CURRENT_NEXT');
        const investmentsAdj = getLineValue(statementLines, 'INVESTMENTS_CURRENT_NEXT');
        const payablesAdj = getLineValue(statementLines, 'PAYABLES_CURRENT_NEXT');
        const borrowingAdj = getLineValue(statementLines, 'BORROWING_CURRENT_NEXT');
        const netSurplus = getLineValue(statementLines, 'NET_SURPLUS_CURRENT_NEXT');

        // Calculate total balance
        total = currentBalance + cashAdj + receivablesAdj + investmentsAdj - payablesAdj - borrowingAdj + netSurplus;

        // For balance lines, the total goes to accumulatedSurplus, not adjustments
        accumulatedSurplus = total;
        adjustments = 0;
      } else {
        total = 0;
        accumulatedSurplus = null;
        adjustments = null;
      }
      break;

    default:
      // Default processing
      currentPeriodValue = 0;
      previousPeriodValue = 0;
      accumulatedSurplus = null;
      adjustments = null;
      total = null;
  }

  return {
    currentPeriodValue,
    previousPeriodValue,
    accumulatedSurplus,
    adjustments,
    total
  };
}

// ============================================================================
// APPROVAL WORKFLOW HANDLERS
// ============================================================================

/**
 * Handler for submitting a financial report for DAF approval
 * Requirements: 1.1-1.5
 */
export const submitForApproval: AppRouteHandler<SubmitForApprovalRoute> = async (c) => {
  const { id } = c.req.param();
  const reportId = parseInt(id);

  try {
    // Get user context
    const userContext = await getUserContext(c);
    const userId = userContext.userId;

    // Check if report exists and user has access
    const report = await db.query.financialReports.findFirst({
      where: eq(financialReports.id, reportId),
    });

    if (!report) {
      return c.json({
        message: "Financial report not found",
      }, HttpStatusCodes.NOT_FOUND);
    }

    // Validate facility access
    const hasAccess = canAccessFacility(report.facilityId, userContext);
    if (!hasAccess) {
      return c.json(
        { message: "Access denied: facility not in your district" },
        HttpStatusCodes.FORBIDDEN
      );
    }

    // Execute workflow action
    const result = await financialReportWorkflowService.submitForApproval(reportId, userId);

    return c.json({
      report: result.report,
      message: result.message,
    }, HttpStatusCodes.OK);

  } catch (error: any) {
    if (error.message === "Unauthorized") {
      return c.json(
        { message: "Authentication required" },
        HttpStatusCodes.UNAUTHORIZED
      );
    }

    if (error.message === "User not associated with a facility") {
      return c.json(
        { message: "User must be associated with a facility" },
        HttpStatusCodes.FORBIDDEN
      );
    }

    // Workflow validation errors
    return c.json(
      {
        message: "Failed to submit report",
        error: error.message
      },
      HttpStatusCodes.BAD_REQUEST
    );
  }
};

/**
 * Handler for DAF approval of a financial report
 * Requirements: 2.1-2.4
 */
export const dafApprove: AppRouteHandler<DafApproveRoute> = async (c) => {
  const { id } = c.req.param();
  const reportId = parseInt(id);

  try {
    // Get user context
    const userContext = await getUserContext(c);
    const userId = userContext.userId;

    // Parse request body
    const body = await c.req.json();
    const comment = body.comment;

    // Check if report exists and user has access
    const report = await db.query.financialReports.findFirst({
      where: eq(financialReports.id, reportId),
    });

    if (!report) {
      return c.json({
        message: "Financial report not found",
      }, HttpStatusCodes.NOT_FOUND);
    }

    // Validate facility access
    const hasAccess = canAccessFacility(report.facilityId, userContext);
    if (!hasAccess) {
      return c.json(
        { message: "Access denied: facility not in your district" },
        HttpStatusCodes.FORBIDDEN
      );
    }

    // Execute workflow action
    const result = await financialReportWorkflowService.dafApprove(reportId, userId, comment);

    return c.json({
      report: result.report,
      message: result.message,
    }, HttpStatusCodes.OK);

  } catch (error: any) {
    if (error.message === "Unauthorized") {
      return c.json(
        { message: "Authentication required" },
        HttpStatusCodes.UNAUTHORIZED
      );
    }

    if (error.message === "User not associated with a facility") {
      return c.json(
        { message: "User must be associated with a facility" },
        HttpStatusCodes.FORBIDDEN
      );
    }

    // Workflow validation errors
    return c.json(
      {
        message: "Failed to approve report",
        error: error.message
      },
      HttpStatusCodes.BAD_REQUEST
    );
  }
};

/**
 * Handler for DAF rejection of a financial report
 * Requirements: 2.5-2.8
 */
export const dafReject: AppRouteHandler<DafRejectRoute> = async (c) => {
  const { id } = c.req.param();
  const reportId = parseInt(id);

  try {
    // Get user context
    const userContext = await getUserContext(c);
    const userId = userContext.userId;

    // Parse request body
    const body = await c.req.json();
    const comment = body.comment;

    // Validate comment is provided
    if (!comment || comment.trim().length === 0) {
      return c.json(
        {
          message: "Rejection comment is required",
          error: "Comment field cannot be empty"
        },
        HttpStatusCodes.BAD_REQUEST
      );
    }

    // Check if report exists and user has access
    const report = await db.query.financialReports.findFirst({
      where: eq(financialReports.id, reportId),
    });

    if (!report) {
      return c.json({
        message: "Financial report not found",
      }, HttpStatusCodes.NOT_FOUND);
    }

    // Validate facility access
    const hasAccess = canAccessFacility(report.facilityId, userContext);
    if (!hasAccess) {
      return c.json(
        { message: "Access denied: facility not in your district" },
        HttpStatusCodes.FORBIDDEN
      );
    }

    // Execute workflow action
    const result = await financialReportWorkflowService.dafReject(reportId, userId, comment);

    return c.json({
      report: result.report,
      message: result.message,
    }, HttpStatusCodes.OK);

  } catch (error: any) {
    if (error.message === "Unauthorized") {
      return c.json(
        { message: "Authentication required" },
        HttpStatusCodes.UNAUTHORIZED
      );
    }

    if (error.message === "User not associated with a facility") {
      return c.json(
        { message: "User must be associated with a facility" },
        HttpStatusCodes.FORBIDDEN
      );
    }

    // Workflow validation errors
    return c.json(
      {
        message: "Failed to reject report",
        error: error.message
      },
      HttpStatusCodes.BAD_REQUEST
    );
  }
};

/**
 * Handler for DG final approval of a financial report
 * Requirements: 3.1-3.5
 */
export const dgApprove: AppRouteHandler<DgApproveRoute> = async (c) => {
  const { id } = c.req.param();
  const reportId = parseInt(id);

  try {
    // Get user context
    const userContext = await getUserContext(c);
    const userId = userContext.userId;

    // Parse request body
    const body = await c.req.json();
    const comment = body.comment;

    // Check if report exists and user has access
    const report = await db.query.financialReports.findFirst({
      where: eq(financialReports.id, reportId),
    });

    if (!report) {
      return c.json({
        message: "Financial report not found",
      }, HttpStatusCodes.NOT_FOUND);
    }

    // Validate facility access
    const hasAccess = canAccessFacility(report.facilityId, userContext);
    if (!hasAccess) {
      return c.json(
        { message: "Access denied: facility not in your district" },
        HttpStatusCodes.FORBIDDEN
      );
    }

    // Execute workflow action
    const result = await financialReportWorkflowService.dgApprove(reportId, userId, comment);

    // Note: PDF generation will be handled in task 5

    return c.json({
      report: result.report,
      message: result.message,
    }, HttpStatusCodes.OK);

  } catch (error: any) {
    if (error.message === "Unauthorized") {
      return c.json(
        { message: "Authentication required" },
        HttpStatusCodes.UNAUTHORIZED
      );
    }

    if (error.message === "User not associated with a facility") {
      return c.json(
        { message: "User must be associated with a facility" },
        HttpStatusCodes.FORBIDDEN
      );
    }

    // Workflow validation errors
    return c.json(
      {
        message: "Failed to approve report",
        error: error.message
      },
      HttpStatusCodes.BAD_REQUEST
    );
  }
};

/**
 * Handler for DG rejection of a financial report
 * Requirements: 3.6-3.8
 */
export const dgReject: AppRouteHandler<DgRejectRoute> = async (c) => {
  const { id } = c.req.param();
  const reportId = parseInt(id);

  try {
    // Get user context
    const userContext = await getUserContext(c);
    const userId = userContext.userId;

    // Parse request body
    const body = await c.req.json();
    const comment = body.comment;

    // Validate comment is provided
    if (!comment || comment.trim().length === 0) {
      return c.json(
        {
          message: "Rejection comment is required",
          error: "Comment field cannot be empty"
        },
        HttpStatusCodes.BAD_REQUEST
      );
    }

    // Check if report exists and user has access
    const report = await db.query.financialReports.findFirst({
      where: eq(financialReports.id, reportId),
    });

    if (!report) {
      return c.json({
        message: "Financial report not found",
      }, HttpStatusCodes.NOT_FOUND);
    }

    // Validate facility access
    const hasAccess = canAccessFacility(report.facilityId, userContext);
    if (!hasAccess) {
      return c.json(
        { message: "Access denied: facility not in your district" },
        HttpStatusCodes.FORBIDDEN
      );
    }

    // Execute workflow action
    const result = await financialReportWorkflowService.dgReject(reportId, userId, comment);

    return c.json({
      report: result.report,
      message: result.message,
    }, HttpStatusCodes.OK);

  } catch (error: any) {
    if (error.message === "Unauthorized") {
      return c.json(
        { message: "Authentication required" },
        HttpStatusCodes.UNAUTHORIZED
      );
    }

    if (error.message === "User not associated with a facility") {
      return c.json(
        { message: "User must be associated with a facility" },
        HttpStatusCodes.FORBIDDEN
      );
    }

    // Workflow validation errors
    return c.json(
      {
        message: "Failed to reject report",
        error: error.message
      },
      HttpStatusCodes.BAD_REQUEST
    );
  }
};

/**
 * Handler for retrieving workflow logs for a financial report
 * Requirements: 5.3-5.5
 */
export const getWorkflowLogs: AppRouteHandler<GetWorkflowLogsRoute> = async (c) => {
  const { id } = c.req.param();
  const reportId = parseInt(id);

  try {
    // Get user context
    const userContext = await getUserContext(c);

    // Check if report exists and user has access
    const report = await db.query.financialReports.findFirst({
      where: eq(financialReports.id, reportId),
    });

    if (!report) {
      return c.json({
        message: "Financial report not found",
      }, HttpStatusCodes.NOT_FOUND);
    }

    // Validate facility access
    const hasAccess = canAccessFacility(report.facilityId, userContext);
    if (!hasAccess) {
      return c.json(
        { message: "Access denied: facility not in your district" },
        HttpStatusCodes.FORBIDDEN
      );
    }

    // Retrieve workflow logs
    const logs = await financialReportWorkflowService.getWorkflowLogs(reportId);

    return c.json({
      logs,
    }, HttpStatusCodes.OK);

  } catch (error: any) {
    if (error.message === "Unauthorized") {
      return c.json(
        { message: "Authentication required" },
        HttpStatusCodes.UNAUTHORIZED
      );
    }

    if (error.message === "User not associated with a facility") {
      return c.json(
        { message: "User must be associated with a facility" },
        HttpStatusCodes.FORBIDDEN
      );
    }

    return c.json(
      { message: "Failed to fetch workflow logs" },
      HttpStatusCodes.INTERNAL_SERVER_ERROR
    );
  }
};

// ============================================================================
// PERIOD LOCK HANDLERS
// ============================================================================

/**
 * Handler for retrieving all period locks for a facility
 * Requirements: 6.5, 7.1, 7.2, 7.3, 7.4, 9.1, 9.2
 */
export const getPeriodLocks: AppRouteHandler<GetPeriodLocksRoute> = async (c) => {
  try {
    // Get user context
    const userContext = await getUserContext(c);

    // Parse query parameters
    const query = c.req.query();
    const facilityId = parseInt(query.facilityId);

    if (!facilityId || isNaN(facilityId)) {
      return c.json({
        message: "Invalid facilityId parameter",
        error: "facilityId must be a positive integer",
      }, HttpStatusCodes.BAD_REQUEST);
    }

    // Validate facility access
    const hasAccess = canAccessFacility(facilityId, userContext);
    if (!hasAccess) {
      return c.json(
        { message: "Access denied: facility not in your district" },
        HttpStatusCodes.FORBIDDEN
      );
    }

    // Import period lock service
    const { periodLockService } = await import("@/lib/services/period-lock-service");

    // Retrieve locks for the facility
    const locks = await periodLockService.getLocksForFacility(facilityId);

    return c.json({
      locks,
    }, HttpStatusCodes.OK);

  } catch (error: any) {
    if (error.message === "Unauthorized") {
      return c.json(
        { message: "Authentication required" },
        HttpStatusCodes.UNAUTHORIZED
      );
    }

    if (error.message === "User not associated with a facility") {
      return c.json(
        { message: "User must be associated with a facility" },
        HttpStatusCodes.FORBIDDEN
      );
    }

    return c.json(
      { message: "Failed to fetch period locks", error: error.message },
      HttpStatusCodes.INTERNAL_SERVER_ERROR
    );
  }
};

/**
 * Handler for unlocking a reporting period (admin only)
 * Requirements: 6.5, 7.1, 7.2, 7.3, 7.4, 9.1, 9.2, 9.3, 9.4, 9.5
 */
export const unlockPeriod: AppRouteHandler<UnlockPeriodRoute> = async (c) => {
  const { id } = c.req.param();
  const lockId = parseInt(id);

  try {
    // Get user context
    const userContext = await getUserContext(c);

    // Parse request body
    const body = await c.req.json();
    const { reason } = body;

    if (!reason || reason.trim().length === 0) {
      return c.json({
        message: "Unlock reason is required",
        error: "reason field must not be empty",
      }, HttpStatusCodes.BAD_REQUEST);
    }

    // Import period lock service and schema
    const { periodLockService } = await import("@/lib/services/period-lock-service");
    const { periodLocks } = await import("@/db/schema/period-locks/schema");

    // Check if period lock exists
    const periodLock = await db.query.periodLocks.findFirst({
      where: eq(periodLocks.id, lockId),
      with: {
        reportingPeriod: true,
        project: true,
        facility: true,
      },
    });

    if (!periodLock) {
      return c.json({
        message: "Period lock not found",
      }, HttpStatusCodes.NOT_FOUND);
    }

    // Validate facility access
    const hasAccess = canAccessFacility(periodLock.facilityId, userContext);
    if (!hasAccess) {
      return c.json(
        { message: "Access denied: facility not in your district" },
        HttpStatusCodes.FORBIDDEN
      );
    }

    // Attempt to unlock the period (this will check admin permissions)
    try {
      await periodLockService.unlockPeriod(lockId, userContext.userId, reason);
    } catch (unlockError: any) {
      // Check if error is due to insufficient permissions
      if (unlockError.message.includes("does not have permission")) {
        return c.json(
          { message: "Admin or superadmin role required to unlock periods" },
          HttpStatusCodes.FORBIDDEN
        );
      }
      throw unlockError;
    }

    // Fetch the updated period lock with relations
    const updatedLock = await db.query.periodLocks.findFirst({
      where: eq(periodLocks.id, lockId),
      with: {
        reportingPeriod: true,
        project: true,
        facility: true,
        lockedByUser: {
          columns: {
            id: true,
            name: true,
            email: true,
          },
        },
        unlockedByUser: {
          columns: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return c.json({
      success: true,
      message: "Period unlocked successfully",
      periodLock: updatedLock,
    }, HttpStatusCodes.OK);

  } catch (error: any) {
    if (error.message === "Unauthorized") {
      return c.json(
        { message: "Authentication required" },
        HttpStatusCodes.UNAUTHORIZED
      );
    }

    if (error.message === "User not associated with a facility") {
      return c.json(
        { message: "User must be associated with a facility" },
        HttpStatusCodes.FORBIDDEN
      );
    }

    return c.json(
      { message: "Failed to unlock period", error: error.message },
      HttpStatusCodes.INTERNAL_SERVER_ERROR
    );
  }
};

/**
 * Handler for retrieving audit log for a period lock
 * Requirements: 9.1, 9.2, 9.3, 9.4, 9.5
 */
export const getPeriodLockAudit: AppRouteHandler<GetPeriodLockAuditRoute> = async (c) => {
  const { id } = c.req.param();
  const lockId = parseInt(id);

  try {
    // Get user context
    const userContext = await getUserContext(c);

    // Import schemas
    const { periodLocks } = await import("@/db/schema/period-locks/schema");
    const { periodLockAuditLog } = await import("@/db/schema/period-lock-audit-log/schema");

    // Check if period lock exists
    const periodLock = await db.query.periodLocks.findFirst({
      where: eq(periodLocks.id, lockId),
    });

    if (!periodLock) {
      return c.json({
        message: "Period lock not found",
      }, HttpStatusCodes.NOT_FOUND);
    }

    // Validate facility access
    const hasAccess = canAccessFacility(periodLock.facilityId, userContext);
    if (!hasAccess) {
      return c.json(
        { message: "Access denied: facility not in your district" },
        HttpStatusCodes.FORBIDDEN
      );
    }

    // Retrieve audit logs for this period lock
    const auditLogs = await db.query.periodLockAuditLog.findMany({
      where: eq(periodLockAuditLog.periodLockId, lockId),
      orderBy: [desc(periodLockAuditLog.performedAt)],
      with: {
        performer: {
          columns: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return c.json({
      auditLogs,
    }, HttpStatusCodes.OK);

  } catch (error: any) {
    if (error.message === "Unauthorized") {
      return c.json(
        { message: "Authentication required" },
        HttpStatusCodes.UNAUTHORIZED
      );
    }

    if (error.message === "User not associated with a facility") {
      return c.json(
        { message: "User must be associated with a facility" },
        HttpStatusCodes.FORBIDDEN
      );
    }

    return c.json(
      { message: "Failed to fetch audit logs", error: error.message },
      HttpStatusCodes.INTERNAL_SERVER_ERROR
    );
  }
};

// ============================================================================
// VERSION CONTROL HANDLERS
// ============================================================================

/**
 * Handler for retrieving all versions of a financial report
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5
 */
export const getVersions: AppRouteHandler<GetVersionsRoute> = async (c) => {
  const { id } = c.req.param();
  const reportId = parseInt(id);

  try {
    // Get user context
    const userContext = await getUserContext(c);

    // Check if report exists and user has access
    const report = await db.query.financialReports.findFirst({
      where: eq(financialReports.id, reportId),
    });

    if (!report) {
      return c.json({
        message: "Financial report not found",
      }, HttpStatusCodes.NOT_FOUND);
    }

    // Validate facility access
    const hasAccess = canAccessFacility(report.facilityId, userContext);
    if (!hasAccess) {
      return c.json(
        { message: "Access denied: facility not in your district" },
        HttpStatusCodes.FORBIDDEN
      );
    }

    // Import version service
    const { versionService } = await import("@/lib/services/version-service");

    // Get all versions for this report
    const versions = await versionService.getVersions(reportId);

    // Format response
    const formattedVersions = versions.map(v => ({
      id: v.id,
      reportId: v.reportId,
      versionNumber: v.versionNumber,
      snapshotData: v.snapshotData,
      snapshotChecksum: v.snapshotChecksum,
      snapshotTimestamp: v.snapshotTimestamp.toISOString(),
      createdBy: v.createdBy,
      createdAt: v.createdAt ? v.createdAt.toISOString() : null,
      changesSummary: v.changesSummary,
      creator: v.creator,
    }));

    return c.json({
      reportId,
      currentVersion: report.version,
      versions: formattedVersions,
    }, HttpStatusCodes.OK);

  } catch (error: any) {
    if (error.message === "Unauthorized") {
      return c.json(
        { message: "Authentication required" },
        HttpStatusCodes.UNAUTHORIZED
      );
    }

    if (error.message === "User not associated with a facility") {
      return c.json(
        { message: "User must be associated with a facility" },
        HttpStatusCodes.FORBIDDEN
      );
    }

    return c.json(
      { message: "Failed to fetch report versions", error: error.message },
      HttpStatusCodes.INTERNAL_SERVER_ERROR
    );
  }
};

/**
 * Handler for retrieving a specific version of a financial report
 * Requirements: 5.3, 5.4
 */
export const getVersion: AppRouteHandler<GetVersionRoute> = async (c) => {
  const { id, versionNumber } = c.req.param();
  const reportId = parseInt(id);

  try {
    // Get user context
    const userContext = await getUserContext(c);

    // Check if report exists and user has access
    const report = await db.query.financialReports.findFirst({
      where: eq(financialReports.id, reportId),
    });

    if (!report) {
      return c.json({
        message: "Financial report not found",
      }, HttpStatusCodes.NOT_FOUND);
    }

    // Validate facility access
    const hasAccess = canAccessFacility(report.facilityId, userContext);
    if (!hasAccess) {
      return c.json(
        { message: "Access denied: facility not in your district" },
        HttpStatusCodes.FORBIDDEN
      );
    }

    // Import version service
    const { versionService } = await import("@/lib/services/version-service");

    // Get specific version
    const version = await versionService.getVersion(reportId, versionNumber);

    if (!version) {
      return c.json({
        message: `Version ${versionNumber} not found for report ${reportId}`,
      }, HttpStatusCodes.NOT_FOUND);
    }

    // Format response
    const formattedVersion = {
      id: version.id,
      reportId: version.reportId,
      versionNumber: version.versionNumber,
      snapshotData: version.snapshotData,
      snapshotChecksum: version.snapshotChecksum,
      snapshotTimestamp: version.snapshotTimestamp.toISOString(),
      createdBy: version.createdBy,
      createdAt: version.createdAt ? version.createdAt.toISOString() : null,
      changesSummary: version.changesSummary,
      creator: version.creator,
    };

    return c.json({
      version: formattedVersion,
    }, HttpStatusCodes.OK);

  } catch (error: any) {
    if (error.message === "Unauthorized") {
      return c.json(
        { message: "Authentication required" },
        HttpStatusCodes.UNAUTHORIZED
      );
    }

    if (error.message === "User not associated with a facility") {
      return c.json(
        { message: "User must be associated with a facility" },
        HttpStatusCodes.FORBIDDEN
      );
    }

    return c.json(
      { message: "Failed to fetch report version", error: error.message },
      HttpStatusCodes.INTERNAL_SERVER_ERROR
    );
  }
};

/**
 * Handler for comparing two versions of a financial report
 * Requirements: 8.1, 8.2, 8.3, 8.4, 8.5
 */
export const compareVersions: AppRouteHandler<CompareVersionsRoute> = async (c) => {
  const { id } = c.req.param();
  const reportId = parseInt(id);

  try {
    // Get user context
    const userContext = await getUserContext(c);

    // Check if report exists and user has access
    const report = await db.query.financialReports.findFirst({
      where: eq(financialReports.id, reportId),
    });

    if (!report) {
      return c.json({
        message: "Financial report not found",
      }, HttpStatusCodes.NOT_FOUND);
    }

    // Validate facility access
    const hasAccess = canAccessFacility(report.facilityId, userContext);
    if (!hasAccess) {
      return c.json(
        { message: "Access denied: facility not in your district" },
        HttpStatusCodes.FORBIDDEN
      );
    }

    // Parse request body
    const body = await c.req.json();
    const { version1, version2 } = body;

    if (!version1 || !version2) {
      return c.json(
        {
          message: "Both version1 and version2 are required",
          error: "Missing version parameters"
        },
        HttpStatusCodes.BAD_REQUEST
      );
    }

    // Import version service
    const { versionService } = await import("@/lib/services/version-service");

    // Compare versions
    const comparison = await versionService.compareVersions(
      reportId,
      version1,
      version2
    );

    return c.json(comparison, HttpStatusCodes.OK);

  } catch (error: any) {
    if (error.message === "Unauthorized") {
      return c.json(
        { message: "Authentication required" },
        HttpStatusCodes.UNAUTHORIZED
      );
    }

    if (error.message === "User not associated with a facility") {
      return c.json(
        { message: "User must be associated with a facility" },
        HttpStatusCodes.FORBIDDEN
      );
    }

    if (error.message && error.message.includes("Version not found")) {
      return c.json(
        { message: error.message },
        HttpStatusCodes.NOT_FOUND
      );
    }

    return c.json(
      { message: "Failed to compare versions", error: error.message },
      HttpStatusCodes.INTERNAL_SERVER_ERROR
    );
  }
};
