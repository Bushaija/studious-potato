import { honoClient as client } from "@/api-client/index";

export interface UpdateFinancialReportData {
  title?: string;
  reportData?: Record<string, any>;
  metadata?: Record<string, any>;
  computedTotals?: Record<string, any>;
  validationResults?: Record<string, any>;
  status?: string;
  version?: string;
}

/**
 * Update a financial report with hierarchy access validation
 * Requirements: 2.1-2.4, 4.1-4.5
 * 
 * This method validates that the user has permission to update the report based on:
 * - Facility hierarchy access (user must have access to the report's facility)
 * - Role-based permissions (accountants can update their own facility's reports)
 * 
 * Returns 403 Forbidden if the user doesn't have access to modify the report.
 * 
 * @param reportId - The financial report ID to update
 * @param data - The report data to update
 * @returns The updated financial report
 */
export async function updateFinancialReport(
  reportId: number,
  data: UpdateFinancialReportData
) {
  const response = await (client as any)["financial-reports"][":id"].$patch({
    param: { id: reportId.toString() },
    json: data,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error);
  }

  const result = await response.json();
  return result;
}
