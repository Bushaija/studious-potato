"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, Loader2, Download, Lock } from "lucide-react";
import { useGetFinancialReportById } from "@/hooks/queries/financial-reports";
import useGenerateStatement from "@/hooks/mutations/financial-reports/use-generate-statement";
import useExportStatementPdf from "@/hooks/mutations/financial-reports/use-generate-pdf";
import { ApprovalStatusBadge } from "@/components/financial-reports";
import { DynamicStatementRenderer } from "@/components/reports/dynamic-statement-renderer";
import type { ReportStatus } from "@/types/financial-reports-approval";
import { toast } from "sonner";

// Statuses that should use snapshot data
const snapshotStatuses = [
  'submitted',
  'pending_daf_approval',
  'approved_by_daf',
  'fully_approved',
  'approved'
] as const;

interface EmbeddedReportViewerProps {
  reportId: number;
  onApprove?: () => void;
  onReject?: () => void;
  isProcessing?: boolean;
  showActions?: boolean;
}

export function EmbeddedReportViewer({
  reportId,
  onApprove,
  onReject,
  isProcessing = false,
  showActions = true,
}: EmbeddedReportViewerProps) {
  const { data: report, isLoading, error } = useGetFinancialReportById(reportId);
  
  const [statementData, setStatementData] = useState<any>(null);
  const [statementError, setStatementError] = useState<string | null>(null);

  const { mutate: generateStatement, isPending: isGeneratingStatement } = useGenerateStatement({
    onSuccess: (data) => {
      setStatementData(data.statement);
      setStatementError(null);
    },
    onError: (error) => {
      console.error("Failed to generate statement:", error);
      setStatementError(error.message || "Failed to load statement data.");
    }
  });

  const { mutate: exportPdf, isPending: isGeneratingPdf } = useExportStatementPdf({
    onSuccess: (blob) => {
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `financial-statement-${report?.reportCode || reportId}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success("PDF downloaded successfully");
    },
    onError: (error) => {
      toast.error(`Failed to generate PDF: ${error.message}`);
    }
  });

  const handleDownloadPdf = () => {
    if (!report) return;

    const status = report.status as ReportStatus;
    const shouldUseSnapshot = (snapshotStatuses as readonly string[]).includes(status);

    if (shouldUseSnapshot) {
      exportPdf({
        reportId: report.id,
        exportFormat: 'pdf',
        exportOptions: {
          includeMetadata: true,
          includeFootnotes: true,
          pageOrientation: 'portrait',
          fontSize: 'medium',
          showZeroValues: true,
          highlightNegatives: true,
        }
      });
    } else {
      const statementCode = report.reportData?.statement?.statementCode || report.metadata?.statementCode || 'REV_EXP';
      exportPdf({
        statementCode,
        reportingPeriodId: report.reportingPeriodId,
        projectType: report.project?.type || 'HIV',
        facilityId: report.facilityId,
        includeComparatives: true,
        exportFormat: 'pdf',
        exportOptions: {
          includeMetadata: true,
          includeFootnotes: true,
          pageOrientation: 'portrait',
          fontSize: 'medium',
          showZeroValues: true,
          highlightNegatives: true,
        }
      });
    }
  };

  useEffect(() => {
    if (!report) return;

    const status = report.status as ReportStatus;
    const shouldUseSnapshot = (snapshotStatuses as readonly string[]).includes(status);
    const isDraft = status === 'draft';

    if (shouldUseSnapshot) {
      const statementCode = report.reportData?.statement?.statementCode || report.metadata?.statementCode || 'REV_EXP';
      generateStatement({
        reportId: report.id,
        statementCode,
        reportingPeriodId: report.reportingPeriodId,
        projectType: report.project?.type || 'HIV',
        facilityId: report.facilityId
      });
    } else if (isDraft) {
      setStatementData(report.reportData?.statement || null);
      setStatementError(null);
    } else {
      setStatementData(report.reportData?.statement || null);
    }
  }, [report?.id, report?.status, generateStatement]);

  if (isLoading) {
    return (
      <div className="space-y-4 p-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Failed to load financial report. Please try again.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const status = report.status as ReportStatus;
  const isLocked = report.locked;
  
  // Check if report is in a pending state that allows approval actions
  // For DAF queue: pending_daf_approval
  // For DG queue: approved_by_daf (pending DG approval)
  const canShowActions = ['pending_daf_approval', 'approved_by_daf'].includes(status);

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="border-b bg-background p-4">
        <div className="flex items-center justify-between gap-4">
            <div className="flex gap-2 space-y-1 min-w-0">
              <h2 className="text-medium font-bold truncate">
                {report.reportCode}
              </h2>
              <div className="flex items-center gap-2 text-sm capitalize text-muted-foreground flex-wrap">
                <span>{report.facility?.name || 'N/A'}</span>
                <span>·</span>
                <span>FY {report.fiscalYear}</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <ApprovalStatusBadge status={status} />
                {isLocked && <Lock className="h-4 w-4 text-muted-foreground" />}
              </div>
            </div>
        
            {/* Actions */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownloadPdf}
                disabled={isGeneratingPdf}
              >
                {isGeneratingPdf ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Download className="h-4 w-4 mr-2" />
                )}
                Download PDF
              </Button>
              
              {showActions && canShowActions && onApprove && onReject && (
                <>
                  <div className="flex-1" />
                  <Button
                    size="sm"
                    onClick={onApprove}
                    disabled={isProcessing}
                    className="bg-gray-100 border-1 border-gray-300 text-black hover:text-white cursor-pointer duration-300 ease-in-out hover:-translate-y-1 hover:scale-110"
                    >
                    {isProcessing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={onReject}
                    disabled={isProcessing}
                    className="bg-red-100 border-1 border-gray-300 text-red-500 hover:text-white cursor-pointer duration-300 ease-in-out hover:-translate-y-1 hover:scale-110"
                  >
                    Reject
                  </Button>
                </>
              )}
            </div>
          </div>
      </div>

      {/* Statement Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {isGeneratingStatement ? (
          <Card>
            <CardContent className="py-12">
              <div className="flex flex-col items-center justify-center gap-4">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Loading statement data...</p>
              </div>
            </CardContent>
          </Card>
        ) : statementError ? (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{statementError}</AlertDescription>
          </Alert>
        ) : statementData ? (
          <DynamicStatementRenderer statement={statementData} />
        ) : (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              No financial statement data available for this report.
            </AlertDescription>
          </Alert>
        )}
      </div>
    </div>
  );
}
