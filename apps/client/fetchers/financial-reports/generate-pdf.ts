import { honoClient as client } from "@/api-client/index";

export interface ExportStatementRequest {
  // Two modes:
  // 1. Snapshot mode: Provide reportId to export submitted/approved report snapshot
  // 2. Live mode: Provide statementCode, reportingPeriodId, etc. to generate from live data
  reportId?: number;
  
  // Required for live mode, optional for snapshot mode
  statementCode?: string;
  reportingPeriodId?: number;
  projectType?: string;
  facilityId?: number;
  
  includeComparatives?: boolean;
  exportFormat?: 'pdf' | 'excel' | 'csv';
  exportOptions?: {
    includeMetadata?: boolean;
    includeFootnotes?: boolean;
    includeValidation?: boolean;
    pageOrientation?: 'portrait' | 'landscape';
    fontSize?: 'small' | 'medium' | 'large';
    showZeroValues?: boolean;
    highlightNegatives?: boolean;
    includeCharts?: boolean;
  };
}

export async function exportStatementPdf(request: ExportStatementRequest): Promise<Blob> {
  try {
    const response = await (client as any)["financial-reports"]["export-statement"].$post({
      json: {
        ...request,
        exportFormat: 'pdf',
        includeComparatives: request.includeComparatives ?? true,
        exportOptions: {
          includeMetadata: true,
          includeFootnotes: true,
          includeValidation: false,
          pageOrientation: 'portrait',
          fontSize: 'medium',
          showZeroValues: true,
          highlightNegatives: true,
          includeCharts: false,
          ...request.exportOptions,
        }
      },
    });

    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      
      try {
        const errorData = await response.json();
        errorMessage = errorData.message || errorData.error || errorMessage;
      } catch {
        // Keep the default error message
      }
      
      throw new Error(errorMessage);
    }

    // Return the PDF blob
    const blob = await response.blob();
    return blob;
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Failed to export statement PDF');
  }
}
