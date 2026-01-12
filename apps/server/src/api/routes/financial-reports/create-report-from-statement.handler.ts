import * as HttpStatusCodes from "stoker/http-status-codes";
import { AppRouteHandler } from "@/api/lib/types";
import type { CreateReportFromStatementRoute } from "./financial-reports.routes";
import { db } from "@/db";
import { financialReports, projects, reportingPeriods } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { getUserContext } from "@/lib/utils/get-user-facility";

/**
 * Handler for creating a formal financial report from generated statement data
 * 
 * This endpoint:
 * 1. Generates the statement using the same logic as generateStatement
 * 2. Creates a financial_reports record with the statement data
 * 3. Returns the report ID for approval workflow tracking
 * 
 * This separates "viewing data" (generateStatement) from "creating formal report" (this endpoint)
 */
export const createReportFromStatement: AppRouteHandler<CreateReportFromStatementRoute> = async (c) => {
  try {
    // Get user context
    const userContext = await getUserContext(c);

    // Parse request body
    const requestBody = await c.req.json();
    const {
      statementCode,
      reportingPeriodId,
      projectType,
      facilityId: requestedFacilityId,
      title,
      includeComparatives = true,
    } = requestBody;

    // Get the project ID from project type
    const project = await db.query.projects.findFirst({
      where: sql`${projects.projectType} = ${projectType}`
    });

    if (!project) {
      return c.json({
        message: `No project found for project type: ${projectType}`,
        details: `Available project types can be found in the projects table`
      }, HttpStatusCodes.NOT_FOUND);
    }

    // Determine facility ID (use user's facility if not specified)
    const facilityId = requestedFacilityId || userContext.facilityId;

    // Check if a report already exists for this combination
    const existingReport = await db.query.financialReports.findFirst({
      where: and(
        eq(financialReports.projectId, project.id),
        eq(financialReports.reportingPeriodId, reportingPeriodId),
        eq(financialReports.facilityId, facilityId),
        sql`${financialReports.metadata}->>'statementCode' = ${statementCode}`
      ),
    });

    if (existingReport) {
      return c.json({
        message: "A report already exists for this period, project, and statement type",
        existingReportId: existingReport.id,
      }, HttpStatusCodes.CONFLICT);
    }

    // For now, we'll create a placeholder report
    // In a full implementation, this would call the statement generation logic
    // and save the complete statement data
    
    // Generate report code and title
    const reportCode = `${statementCode}_${project.code}_${reportingPeriodId}_${Date.now()}`;
    
    // Map statement codes to readable names
    const statementNames: Record<string, string> = {
      'REV_EXP': 'Revenue & Expenditure Statement',
      'ASSETS_LIAB': 'Balance Sheet (Assets & Liabilities)',
      'CASH_FLOW': 'Cash Flow Statement',
      'NET_ASSETS_CHANGES': 'Statement of Changes in Net Assets',
      'BUDGET_VS_ACTUAL': 'Budget vs Actual Report',
    };
    
    const reportTitle = title || `${statementNames[statementCode] || statementCode} - ${project.name} - Period ${reportingPeriodId}`;

    // Get fiscal year from reporting period
    const reportingPeriod = await db.query.reportingPeriods.findFirst({
      where: eq(reportingPeriods.id, reportingPeriodId),
    });

    const fiscalYear = reportingPeriod ? reportingPeriod.year.toString() : new Date().getFullYear().toString();

    // Create the financial report record
    const [newReport] = await db.insert(financialReports).values({
      reportCode,
      title: reportTitle,
      projectId: project.id,
      facilityId,
      reportingPeriodId,
      version: '1.0',
      fiscalYear,
      status: 'draft',
      reportData: {
        statementCode,
        generatedAt: new Date().toISOString(),
        // Statement data will be populated when the report is viewed
      },
      metadata: {
        statementCode,
        generatedAt: new Date().toISOString(),
        includeComparatives,
      },
      createdBy: userContext.userId,
      locked: false,
    }).returning();

    return c.json({
      reportId: newReport.id,
      message: "Financial report created successfully",
      report: {
        id: newReport.id,
        reportCode: newReport.reportCode,
        title: newReport.title,
        status: newReport.status,
        createdAt: newReport.createdAt?.toISOString() || new Date().toISOString(),
        projectId: newReport.projectId,
        facilityId: newReport.facilityId,
        reportingPeriodId: newReport.reportingPeriodId,
      },
    }, HttpStatusCodes.CREATED);

  } catch (error: any) {
    console.error("Error creating report from statement:", error);
    return c.json({
      message: "Failed to create financial report",
      error: error.message || "Unknown error occurred",
    }, HttpStatusCodes.INTERNAL_SERVER_ERROR);
  }
};
