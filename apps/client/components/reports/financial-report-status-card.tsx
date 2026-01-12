"use client";

import { ApprovalStatusBadge } from "@/components/reports/approval-status-badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useFinancialReportMetadata } from "@/hooks/queries/financial-reports/use-financial-report-metadata";
import { useSubmitForApproval } from "@/hooks/mutations/financial-reports/use-submit-for-approval";
import { useCreateReportFromStatement } from "@/hooks/mutations/financial-reports";
import { useToast } from "@/hooks/use-toast";
import { AlertCircle, Loader2, FileText } from "lucide-react";
import type { ReportStatus } from "@/types/financial-reports-approval";

interface FinancialReportStatusCardProps {
  reportId: number | null;
  projectType: "HIV" | "Malaria" | "TB";
  statementType: "revenue-expenditure" | "assets-liabilities" | "cash-flow" | "net-assets-changes" | "budget-vs-actual";
  reportingPeriodId: number;
  onStatusChange?: (newStatus: string) => void;
  onReportCreated?: (reportId: number) => void;
}

// Format date to user-friendly format (e.g., "Jan 15, 2025")
const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

// Determine if submit button should be shown based on status
const canSubmit = (status: ReportStatus): boolean => {
  return (
    status === "draft" ||
    status === "rejected_by_daf" ||
    status === "rejected_by_dg"
  );
};

// Get button text based on status
const getButtonText = (status: ReportStatus): string => {
  if (status === "draft") return "Submit for Approval";
  if (status === "rejected_by_daf" || status === "rejected_by_dg") {
    return "Resubmit for Approval";
  }
  return "";
};

export function FinancialReportStatusCard({
  reportId,
  projectType,
  statementType,
  reportingPeriodId,
  onStatusChange,
  onReportCreated,
}: FinancialReportStatusCardProps) {
  const { toast } = useToast();

  // Fetch report metadata
  const { metadata, isLoading, isError, error, refetch } =
    useFinancialReportMetadata({
      reportId,
      enabled: reportId !== null,
    });

  // Create report mutation
  const { createReport, isCreating } = useCreateReportFromStatement({
    onSuccess: (data) => {
      toast({
        title: "Success",
        description: "Report created successfully. You can now submit it for approval.",
      });
      onReportCreated?.(data.reportId);
    },
    onError: (error: any) => {
      // Check if it's a conflict error (report already exists)
      if (error.isConflict && error.existingReportId) {
        toast({
          title: "Report Already Exists",
          description: "A report for this period already exists. Loading existing report...",
        });
        onReportCreated?.(error.existingReportId);
        return;
      }

      toast({
        title: "Error",
        description: error.message || "Failed to create report",
        variant: "destructive",
      });
    },
  });

  // Submit for approval mutation
  const { submit, isSubmitting } = useSubmitForApproval({
    onSuccess: (data) => {
      toast({
        title: "Success",
        description: "Report submitted for approval successfully",
      });
      refetch();
      onStatusChange?.(data.status);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to submit report for approval",
        variant: "destructive",
      });
    },
  });

  // Handle submit button click
  const handleSubmit = () => {
    if (reportId) {
      submit(reportId);
    }
  };

  // Handle create report button click
  const handleCreateReport = () => {
    // Map statement type to statement code
    const statementCodeMap = {
      "revenue-expenditure": "REV_EXP",
      "assets-liabilities": "ASSETS_LIAB",
      "cash-flow": "CASH_FLOW",
      "net-assets-changes": "NET_ASSETS_CHANGES",
      "budget-vs-actual": "BUDGET_VS_ACTUAL",
    } as const;

    createReport({
      statementCode: statementCodeMap[statementType],
      reportingPeriodId,
      projectType,
      includeComparatives: true,
    });
  };

  // Loading state
  if (isLoading) {
    return (
      <Card className="w-80 sticky top-5">
        <CardContent className="space-y-4">
          <Skeleton className="h-6 w-32" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
          </div>
          <Skeleton className="h-4 w-full" />
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (isError) {
    return (
      <Card className="w-80 sticky top-5">
        <CardContent>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>
              {error?.message || "Failed to load report status. Please try again."}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  // Preview Mode - No formal report created yet
  if (!reportId || !metadata) {
    return (
      <Card className="w-80 sticky top-5">
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
            <FileText className="h-5 w-5" />
            <span className="font-semibold">Preview Mode</span>
          </div>

          <p className="text-sm text-muted-foreground">
            You're viewing live data. Create a formal report to enable the approval workflow.
          </p>

          <div className="border-t pt-4">
            <Button
              onClick={handleCreateReport}
              disabled={isCreating}
              className="w-full"
              variant="default"
            >
              {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Report for Approval
            </Button>
          </div>

          <p className="text-xs text-muted-foreground">
            Creating a report will snapshot the current data and enable submission for DAF approval.
          </p>
        </CardContent>
      </Card>
    );
  }

  const showSubmitButton = canSubmit(metadata.status);
  const buttonText = getButtonText(metadata.status);
  const showApprovalInfo =
    metadata.status === "approved_by_daf" || metadata.status === "fully_approved";

  return (
    <Card className="w-80 sticky top-5">
      <CardContent className="space-y-4">
        {/* Status Badge */}
        <div>
          <ApprovalStatusBadge status={metadata.status} />
        </div>

        {/* Creation Information */}
        <div className="space-y-1">
          <div className="text-sm">
            <span className="text-muted-foreground font-medium">Created: </span>
            <span className="text-foreground">{formatDate(metadata.createdAt)}</span>
          </div>
          {metadata.createdByName && (
            <div className="text-sm">
              <span className="text-muted-foreground font-medium">Created by: </span>
              <span className="text-foreground">{metadata.createdByName}</span>
            </div>
          )}
        </div>

        {/* Approval Information */}
        {showApprovalInfo && (
          <>
            <div className="border-t pt-4 space-y-1">
              {metadata.dafName && (
                <div className="text-sm">
                  <span className="text-muted-foreground font-medium">
                    Approved by:{" "}
                  </span>
                  <span className="text-foreground">{metadata.dafName}</span>
                </div>
              )}
              {metadata.dafApprovedAt && (
                <div className="text-sm">
                  <span className="text-muted-foreground font-medium">
                    Approved:{" "}
                  </span>
                  <span className="text-foreground">
                    {formatDate(metadata.dafApprovedAt)}
                  </span>
                </div>
              )}
            </div>
          </>
        )}

        {/* Submit Button */}
        {showSubmitButton && (
          <div className="border-t pt-4">
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="w-full"
            >
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {buttonText}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
