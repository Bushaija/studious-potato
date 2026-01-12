"use client";

import { useParams, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, Lock, ArrowLeft, Edit, Loader2, Download } from "lucide-react";
import { useGetFinancialReportById } from "@/hooks/queries/financial-reports";
import useGenerateStatement from "@/hooks/mutations/financial-reports/use-generate-statement";
import { ApprovalStatusBadge } from "@/components/financial-reports";
import type { ReportStatus } from "@/types/financial-reports-approval";
import { SnapshotIndicator } from "@/components/reports/snapshot-indicator";
import { PeriodLockBadge } from "@/components/reports/period-lock-badge";
import { VersionHistory } from "@/components/reports/version-history";
import { useReportVersions } from "@/hooks/queries/financial-reports/use-report-versions";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ReportFacilityContext } from "@/components/financial-reports/report-facility-context";
import { FacilityHierarchyTree } from "@/components/facility-hierarchy-tree";
import { DynamicStatementRenderer, StatementTypeBadge } from "@/components/reports/dynamic-statement-renderer";
import useExportStatementPdf from "@/hooks/mutations/financial-reports/use-generate-pdf";
import { toast } from "sonner";

// Statuses that should use snapshot data (via generate-statement with reportId)
const snapshotStatuses = [
  'submitted',
  'pending_daf_approval',
  'approved_by_daf',
  'fully_approved',
  'approved'
] as const;

export default function ViewFinancialReportPage() {
  const params = useParams();
  const router = useRouter();
  const reportId = parseInt(params.id as string);

  const { data: report, isLoading, error } = useGetFinancialReportById(reportId);
  const { data: versionsData } = useReportVersions(reportId);

  // State for statement data from API
  const [statementData, setStatementData] = useState<any>(null);
  const [statementError, setStatementError] = useState<string | null>(null);

  // Hook for generating statement via API
  const { mutate: generateStatement, isPending: isGeneratingStatement } = useGenerateStatement({
    onSuccess: (data) => {
      setStatementData(data.statement);
      setStatementError(null);
    },
    onError: (error) => {
      console.error("Failed to generate statement:", error);
      setStatementError(error.message || "Failed to load statement data. Please try again.");
    }
  });

  // Hook for exporting statement as PDF
  const { mutate: exportPdf, isPending: isGeneratingPdf } = useExportStatementPdf({
    onSuccess: (blob) => {
      // Create download link
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
      // For submitted/approved reports, use snapshot mode (just reportId)
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
      // For draft reports, use live generation mode
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
      // Extract statement code from report data or use default
      const statementCode = report.reportData?.statement?.statementCode || report.metadata?.statementCode || 'REV_EXP';

      generateStatement({
        reportId: report.id,
        statementCode,
        reportingPeriodId: report.reportingPeriodId,
        projectType: report.project?.type || 'HIV',
        facilityId: report.facilityId
      });
    } else if (isDraft) {
      // For draft reports, use the direct data from report.reportData
      setStatementData(report.reportData?.statement || null);
      setStatementError(null);
    } else {
      // For rejected statuses, try to show any existing data
      setStatementData(report.reportData?.statement || null);
    }
  }, [report?.id, report?.status, generateStatement]);

  if (isLoading) {
    return (
      <div className="container mx-auto py-6 space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="container mx-auto py-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Failed to load financial report. Please try again.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const isLocked = report.locked;
  const status = report.status as ReportStatus;

  // Determine if we should use snapshot or live data based on report status
  // Draft reports use live data, submitted/approved reports use snapshot data
  const useSnapshot = status !== 'draft';

  // Check if there are multiple versions
  const hasMultipleVersions = (versionsData?.versions?.length || 0) > 1;

  return (
    <TooltipProvider>
      <div className="container mx-auto py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push("/rina/dashboard/financial-reports")}
              >
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back
              </Button>
              <h1 className="text-2xl font-bold">View Financial Report</h1>
            </div>
            <p className="text-muted-foreground">
              Report Code: {report.reportCode}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <ApprovalStatusBadge status={status} />
            {isLocked && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Lock className="h-4 w-4" />
                <span className="text-sm">Locked</span>
              </div>
            )}
            <Button
              variant="outline"
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
            {!isLocked && (
              <Button
                onClick={() => router.push(`/rina/dashboard/financial-reports/${reportId}/edit`)}
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
            )}
          </div>
        </div>

        {/* Facility Context - Shows facility information and hierarchy */}
        {report.facility && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* <ReportFacilityContext
              facilityName={report.facility.name}
              facilityType={report.facility.type as "hospital" | "health_center"}
              districtName={
                typeof report.facility.district === 'string'
                  ? report.facility.district
                  : report.facility.district?.name || "Unknown District"
              }
              
              
            /> */}
                    {/* Financial Statement */}
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
          <Card>
            <CardContent className="py-8">
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {statementError}
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        ) : statementData ? (
          <DynamicStatementRenderer statement={statementData} />
        ) : (
          <Card>
            <CardContent className="py-8">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  No financial statement data available for this report.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        )}

            {report.facilityId && (
              <FacilityHierarchyTree
                facilityId={report.facilityId}
                showTitle={false}
              />
            )}
          </div>
        )}

        {/* Snapshot Indicator - Shows whether report displays live or snapshot data */}
        {/* <div className="flex items-center gap-3">
          <SnapshotIndicator
            isSnapshot={useSnapshot}
            snapshotTimestamp={report.snapshotTimestamp}
            isOutdated={report.isOutdated}
          />

          {report.periodLock && (
            <PeriodLockBadge
              isLocked={report.periodLock.isLocked}
              lockedAt={report.periodLock.lockedAt}
              lockedBy={report.periodLock.lockedBy?.name}
              lockedReason={report.periodLock.lockedReason}
            />
          )}
        </div> */}

        {/* Lock Status */}
        {/* {isLocked && (
          <Alert>
            <Lock className="h-4 w-4" />
            <AlertDescription>
              This report is locked and cannot be edited. Reports are locked when they are
              submitted for approval or have been approved.
            </AlertDescription>
          </Alert>
        )} */}

        {/* Rejection Comment */}
        {/* {(status === "rejected_by_daf" || status === "rejected_by_dg") && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <div className="font-semibold mb-1">
                {status === "rejected_by_daf" ? "Rejected by DAF" : "Rejected by DG"}
              </div>
              <div>
                {status === "rejected_by_daf" ? report.dafComment : report.dgComment}
              </div>
            </AlertDescription>
          </Alert>
        )} */}

        {/* Report Details */}
        {/* <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Report Details</CardTitle>
                <CardDescription>{report.title}</CardDescription>
              </div>
              {statementData?.statementCode && (
                <StatementTypeBadge statementCode={statementData.statementCode} />
              )}
            </div>
          </CardHeader>
        </Card> */}


        {/* Report Metadata */}
        {/* <Card>
          <CardHeader>
            <CardTitle>Report Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-muted-foreground">Project:</span>{" "}
                <span className="font-medium">{report.project?.name}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Facility:</span>{" "}
                <span className="font-medium">{report.facility?.name}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Fiscal Year:</span>{" "}
                <span className="font-medium">{report.fiscalYear}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Version:</span>{" "}
                <span className="font-medium">{report.version}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Created:</span>{" "}
                <span className="font-medium">
                  {new Date(report.createdAt).toLocaleDateString()}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Updated:</span>{" "}
                <span className="font-medium">
                  {new Date(report.updatedAt).toLocaleDateString()}
                </span>
              </div>
            </div>
          </CardContent>
        </Card> */}

        {/* Version History - Shows if multiple versions exist */}
        {/* {hasMultipleVersions && (
          <VersionHistory
            reportId={reportId}
            onViewVersion={(versionNumber) => {
              // TODO: Implement version viewing functionality
            }}
            onCompareVersion={(versionNumber) => {
              // TODO: Implement version comparison navigation
            }}
          />
        )} */}
      </div>
    </TooltipProvider>
  );
}