"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, Lock, ArrowLeft, Save } from "lucide-react";
import { useGetFinancialReportById } from "@/hooks/queries/financial-reports";
import { useUpdateFinancialReport } from "@/hooks/mutations/financial-reports";
import { useToast } from "@/hooks/use-toast";
import { ApprovalStatusBadge } from "@/components/financial-reports";
import type { ReportStatus } from "@/types/financial-reports-approval";

export default function EditFinancialReportPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const reportId = parseInt(params.id as string);

  const { data: report, isLoading, error } = useGetFinancialReportById(reportId);
  const updateMutation = useUpdateFinancialReport();

  const [formData, setFormData] = useState({
    title: "",
    reportData: {},
  });

  useEffect(() => {
    if (report) {
      setFormData({
        title: report.title || "",
        reportData: report.reportData || {},
      });
    }
  }, [report]);

  const handleSave = async () => {
    try {
      await updateMutation.mutateAsync({
        reportId,
        data: formData,
      });
      toast({
        title: "Success",
        description: "Report updated successfully",
      });
      router.push("/rina/dashboard/financial-reports");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update report",
        variant: "destructive",
      });
    }
  };

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

  return (
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
            <h1 className="text-2xl font-bold">
              {isLocked ? "View" : "Edit"} Financial Report
            </h1>
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
        </div>
      </div>

      {/* Lock Warning */}
      {isLocked && (
        <Alert>
          <Lock className="h-4 w-4" />
          <AlertDescription>
            This report is locked and cannot be edited. Reports are locked when they are
            submitted for approval or have been approved. If this report was rejected,
            it should be unlocked automatically.
          </AlertDescription>
        </Alert>
      )}

      {/* Rejection Comment */}
      {(status === "rejected_by_daf" || status === "rejected_by_dg") && (
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
      )}

      {/* Edit Form */}
      <Card>
        <CardHeader>
          <CardTitle>Report Details</CardTitle>
          <CardDescription>
            {isLocked
              ? "View the report details below"
              : "Edit the report details below"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Title</label>
            <input
              type="text"
              className="w-full px-3 py-2 border rounded-md"
              value={formData.title}
              onChange={(e) =>
                setFormData({ ...formData, title: e.target.value })
              }
              disabled={isLocked}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Report Data</label>
            <textarea
              className="w-full px-3 py-2 border rounded-md font-mono text-sm"
              rows={10}
              value={JSON.stringify(formData.reportData, null, 2)}
              onChange={(e) => {
                try {
                  const parsed = JSON.parse(e.target.value);
                  setFormData({ ...formData, reportData: parsed });
                } catch {
                  // Invalid JSON, don't update
                }
              }}
              disabled={isLocked}
            />
          </div>

          <div className="flex items-center gap-3 pt-4">
            <Button
              onClick={handleSave}
              disabled={isLocked || updateMutation.isPending}
            >
              <Save className="h-4 w-4 mr-2" />
              {updateMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
            <Button
              variant="outline"
              onClick={() => router.push("/dashboard/financial-reports")}
            >
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Report Metadata */}
      <Card>
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
      </Card>
    </div>
  );
}