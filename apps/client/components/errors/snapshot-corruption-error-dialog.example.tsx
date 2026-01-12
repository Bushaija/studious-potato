/**
 * Snapshot Corruption Error Dialog - Usage Examples
 * 
 * Task 22: Add Snapshot Integrity Validation
 * Requirements: 10.1, 10.2, 10.3, 10.4, 10.5
 * 
 * This file demonstrates various ways to integrate snapshot corruption error handling
 * into your components.
 */

"use client";

import { useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useSnapshotCorruptionError } from "@/hooks/use-snapshot-corruption-error";
import { SnapshotCorruptionErrorDialog } from "@/components/errors";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

// ============================================================================
// Example 1: Basic Financial Report Viewer
// ============================================================================

interface FinancialReportViewerProps {
  reportId: number;
}

export function BasicFinancialReportViewer({ reportId }: FinancialReportViewerProps) {
  const { 
    handleError, 
    showCorruptionDialog, 
    setShowCorruptionDialog, 
    corruptionError 
  } = useSnapshotCorruptionError();

  // Fetch report
  const { data: report, error, isLoading } = useQuery({
    queryKey: ["financial-report", reportId],
    queryFn: async () => {
      const response = await fetch(`/api/financial-reports/${reportId}`);
      if (!response.ok) throw new Error("Failed to fetch report");
      return response.json();
    },
  });

  // Check for corruption in query errors
  useEffect(() => {
    if (error) {
      handleError(error);
    }
  }, [error, handleError]);

  // Check for corruption flag in report data
  useEffect(() => {
    if (report?.snapshotCorrupted) {
      handleError(report);
    }
  }, [report, handleError]);

  if (isLoading) return <div>Loading report...</div>;
  if (!report) return <div>Report not found</div>;

  return (
    <>
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Financial Report {reportId}</h1>
        
        {/* Report content */}
        <div className="bg-white p-6 rounded-lg shadow">
          <p>Status: {report.status}</p>
          <p>Facility: {report.facility?.name}</p>
          {/* ... more report details ... */}
        </div>
      </div>
      
      {/* Corruption error dialog */}
      <SnapshotCorruptionErrorDialog
        open={showCorruptionDialog}
        onOpenChange={setShowCorruptionDialog}
        reportId={corruptionError.reportId}
        reportStatus={corruptionError.reportStatus}
      />
    </>
  );
}

// ============================================================================
// Example 2: Statement Generator with Corruption Handling
// ============================================================================

interface StatementGeneratorProps {
  reportId?: number;
  statementCode: string;
  reportingPeriodId: number;
}

export function StatementGeneratorWithCorruptionHandling({
  reportId,
  statementCode,
  reportingPeriodId,
}: StatementGeneratorProps) {
  const { 
    handleError, 
    showCorruptionDialog, 
    setShowCorruptionDialog, 
    corruptionError 
  } = useSnapshotCorruptionError();

  // Generate statement mutation
  const generateMutation = useMutation({
    mutationFn: async (params: any) => {
      const response = await fetch("/api/financial-reports/generate-statement", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw error;
      }
      
      return response.json();
    },
    onError: (error) => {
      // Try to handle as corruption error first
      const handled = handleError(error);
      
      // If not a corruption error, show generic error
      if (!handled) {
        toast.error("Failed to generate statement");
      }
    },
    onSuccess: () => {
      toast.success("Statement generated successfully");
    },
  });

  const handleGenerate = () => {
    generateMutation.mutate({
      reportId,
      statementCode,
      reportingPeriodId,
    });
  };

  return (
    <>
      <div className="space-y-4">
        <Button 
          onClick={handleGenerate}
          disabled={generateMutation.isPending}
        >
          {generateMutation.isPending ? "Generating..." : "Generate Statement"}
        </Button>
      </div>
      
      {/* Corruption error dialog */}
      <SnapshotCorruptionErrorDialog
        open={showCorruptionDialog}
        onOpenChange={setShowCorruptionDialog}
        reportId={corruptionError.reportId}
        reportStatus={corruptionError.reportStatus}
      />
    </>
  );
}

// ============================================================================
// Example 3: Report List with Corruption Indicators
// ============================================================================

interface Report {
  id: number;
  status: string;
  snapshotCorrupted?: boolean;
  snapshotError?: string;
}

export function ReportListWithCorruptionIndicators() {
  const { 
    handleError, 
    showCorruptionDialog, 
    setShowCorruptionDialog, 
    corruptionError 
  } = useSnapshotCorruptionError();

  const { data: reports, isLoading } = useQuery<Report[]>({
    queryKey: ["financial-reports"],
    queryFn: async () => {
      const response = await fetch("/api/financial-reports");
      if (!response.ok) throw new Error("Failed to fetch reports");
      return response.json();
    },
  });

  const handleViewReport = (report: Report) => {
    // Check if report is corrupted before viewing
    if (report.snapshotCorrupted) {
      handleError(report);
      return;
    }
    
    // Navigate to report view
    window.location.href = `/dashboard/financial-reports/${report.id}`;
  };

  if (isLoading) return <div>Loading reports...</div>;

  return (
    <>
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Financial Reports</h1>
        
        <div className="space-y-2">
          {reports?.map((report) => (
            <div 
              key={report.id}
              className="flex items-center justify-between p-4 bg-white rounded-lg shadow"
            >
              <div>
                <p className="font-medium">Report #{report.id}</p>
                <p className="text-sm text-gray-600">Status: {report.status}</p>
                {report.snapshotCorrupted && (
                  <p className="text-sm text-red-600 font-medium">
                    ⚠️ Data Integrity Issue
                  </p>
                )}
              </div>
              
              <Button
                onClick={() => handleViewReport(report)}
                variant={report.snapshotCorrupted ? "destructive" : "default"}
                disabled={report.snapshotCorrupted}
              >
                {report.snapshotCorrupted ? "Corrupted" : "View"}
              </Button>
            </div>
          ))}
        </div>
      </div>
      
      {/* Corruption error dialog */}
      <SnapshotCorruptionErrorDialog
        open={showCorruptionDialog}
        onOpenChange={setShowCorruptionDialog}
        reportId={corruptionError.reportId}
        reportStatus={corruptionError.reportStatus}
      />
    </>
  );
}

// ============================================================================
// Example 4: Custom Contact Admin Handler
// ============================================================================

export function ReportViewerWithCustomContactHandler({ reportId }: { reportId: number }) {
  const { 
    handleError, 
    showCorruptionDialog, 
    setShowCorruptionDialog, 
    corruptionError 
  } = useSnapshotCorruptionError();

  const { data: report, error } = useQuery({
    queryKey: ["financial-report", reportId],
    queryFn: async () => {
      const response = await fetch(`/api/financial-reports/${reportId}`);
      if (!response.ok) throw new Error("Failed to fetch report");
      return response.json();
    },
  });

  useEffect(() => {
    if (error) handleError(error);
    if (report?.snapshotCorrupted) handleError(report);
  }, [error, report, handleError]);

  // Custom handler to create support ticket
  const handleContactAdmin = async () => {
    try {
      await fetch("/api/support/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "snapshot_corruption",
          reportId: corruptionError.reportId,
          reportStatus: corruptionError.reportStatus,
          description: corruptionError.errorMessage,
        }),
      });
      
      toast.success("Support ticket created. An administrator will investigate.");
      setShowCorruptionDialog(false);
    } catch (error) {
      toast.error("Failed to create support ticket");
    }
  };

  return (
    <>
      <div>
        {/* Report content */}
      </div>
      
      {/* Corruption error dialog with custom handler */}
      <SnapshotCorruptionErrorDialog
        open={showCorruptionDialog}
        onOpenChange={setShowCorruptionDialog}
        reportId={corruptionError.reportId}
        reportStatus={corruptionError.reportStatus}
        onContactAdmin={handleContactAdmin}
      />
    </>
  );
}

// ============================================================================
// Example 5: Multiple Reports with Shared Error Handler
// ============================================================================

export function MultiReportDashboard() {
  const { 
    handleError, 
    showCorruptionDialog, 
    setShowCorruptionDialog, 
    corruptionError,
    resetError,
  } = useSnapshotCorruptionError();

  const { data: report1, error: error1 } = useQuery({
    queryKey: ["report", 1],
    queryFn: async () => {
      const response = await fetch("/api/financial-reports/1");
      return response.json();
    },
  });

  const { data: report2, error: error2 } = useQuery({
    queryKey: ["report", 2],
    queryFn: async () => {
      const response = await fetch("/api/financial-reports/2");
      return response.json();
    },
  });

  // Handle errors from multiple sources
  useEffect(() => {
    if (error1) handleError(error1);
    if (error2) handleError(error2);
    if (report1?.snapshotCorrupted) handleError(report1);
    if (report2?.snapshotCorrupted) handleError(report2);
  }, [error1, error2, report1, report2, handleError]);

  // Reset error when dialog closes
  const handleDialogChange = (open: boolean) => {
    setShowCorruptionDialog(open);
    if (!open) {
      resetError();
    }
  };

  return (
    <>
      <div className="grid grid-cols-2 gap-4">
        <div>Report 1</div>
        <div>Report 2</div>
      </div>
      
      {/* Shared corruption error dialog */}
      <SnapshotCorruptionErrorDialog
        open={showCorruptionDialog}
        onOpenChange={handleDialogChange}
        reportId={corruptionError.reportId}
        reportStatus={corruptionError.reportStatus}
      />
    </>
  );
}
