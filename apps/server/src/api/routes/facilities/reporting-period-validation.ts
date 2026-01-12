import { eq } from "drizzle-orm";
import { db } from "@/api/db";
import { reportingPeriods } from "@/api/db/schema";

export interface ReportingPeriodValidationResult {
  isValid: boolean;
  errorMessage?: string;
}

export type ValidationContext = 'planning' | 'execution';

/**
 * Validates that a reporting period exists and has ACTIVE status
 * @param reportingPeriodId - The ID of the reporting period to validate
 * @param context - The context for validation ('planning' or 'execution') to provide appropriate error messages
 * @returns Promise<ReportingPeriodValidationResult> - Validation result with error message if invalid
 */
export async function validateReportingPeriod(reportingPeriodId: number, context: ValidationContext = 'planning'): Promise<ReportingPeriodValidationResult> {
  try {
    // Query the reporting period by ID
    const reportingPeriod = await db.query.reportingPeriods.findFirst({
      where: eq(reportingPeriods.id, reportingPeriodId),
    });

    // Check if reporting period exists
    if (!reportingPeriod) {
      return {
        isValid: false,
        errorMessage: "Reporting period not found",
      };
    }

    // Check if reporting period status is ACTIVE
    if (reportingPeriod.status === 'INACTIVE') {
      return {
        isValid: false,
        errorMessage: context === 'execution' 
          ? "Cannot execute for inactive reporting periods"
          : "Cannot plan for inactive reporting periods",
      };
    }

    if (reportingPeriod.status === 'CLOSED') {
      return {
        isValid: false,
        errorMessage: context === 'execution'
          ? "Cannot execute for closed reporting periods" 
          : "Cannot plan for closed reporting periods",
      };
    }

    // If we reach here, the reporting period is valid and ACTIVE
    return {
      isValid: true,
    };
  } catch (error) {
    // Handle any database errors
    console.error("Error validating reporting period:", error);
    return {
      isValid: false,
      errorMessage: "Error validating reporting period",
    };
  }
}