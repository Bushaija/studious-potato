import { honoClient as client } from "@/api-client/index";

// Request type
export interface CreateReportFromStatementRequest {
  statementCode: "REV_EXP" | "ASSETS_LIAB" | "CASH_FLOW" | "NET_ASSETS_CHANGES" | "BUDGET_VS_ACTUAL";
  reportingPeriodId: number;
  projectType: "HIV" | "Malaria" | "TB";
  facilityId?: number;
  title?: string;
  includeComparatives?: boolean;
}

// Response type
export interface CreateReportFromStatementResponse {
  reportId: number;
  message: string;
  report: {
    id: number;
    reportCode: string;
    title: string;
    status: string;
    createdAt: string;
    projectId: number;
    facilityId: number;
    reportingPeriodId: number;
  };
}

export async function createReportFromStatement(json: CreateReportFromStatementRequest) {
  try {
    const response = await (client as any)["financial-reports"]["create-report"].$post({
      json,
    });

    if (!response.ok) {
      // Clone the response so we can read it multiple times if needed
      const clonedResponse = response.clone();
      
      try {
        const errorData = await response.json();
        const errorMessage = errorData.message || errorData.error || `HTTP ${response.status}: ${response.statusText}`;
        
        // If it's a conflict (409), include the existing report ID
        if (response.status === 409 && errorData.existingReportId) {
          const conflictError = new Error(errorMessage);
          (conflictError as any).existingReportId = errorData.existingReportId;
          (conflictError as any).isConflict = true;
          throw conflictError;
        }
        
        throw new Error(errorMessage);
      } catch (parseError) {
        // If we already threw a conflict error, re-throw it
        if (parseError instanceof Error && (parseError as any).isConflict) {
          throw parseError;
        }
        
        // Otherwise try to get text from cloned response
        try {
          const errorText = await clonedResponse.text();
          throw new Error(errorText || `HTTP ${response.status}: ${response.statusText}`);
        } catch {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
      }
    }

    const data = await response.json();
    return data as CreateReportFromStatementResponse;
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Failed to create financial report');
  }
}
