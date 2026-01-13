"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Send, Lock, Edit, Eye } from "lucide-react";
import { useGetFinancialReports } from "@/hooks/queries/financial-reports";
import { useSubmitForApproval } from "@/hooks/mutations/financial-reports";
import { useToast } from "@/hooks/use-toast";
import { ApprovalStatusBadge, RejectionAlert } from "@/components/financial-reports";
import type { ReportStatus } from "@/types/financial-reports-approval";
import { format } from "date-fns";

interface FinancialReportsTableProps {
  userId?: number;
}

export function FinancialReportsTable({ userId }: FinancialReportsTableProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [submittingId, setSubmittingId] = useState<number | null>(null);

  // Fetch financial reports - filter for editable statuses
  const { data, isLoading, error, refetch } = useGetFinancialReports({
    // Add status filter if the API supports it
    // status: 'draft,rejected_by_daf,rejected_by_dg'
  });

  const { submit, isSubmitting } = useSubmitForApproval();

  const handleSubmit = async (reportId: number) => {
    try {
      setSubmittingId(reportId);
      await submit(reportId);
      toast({
        title: "Success",
        description: "Report submitted for DAF approval",
      });
      refetch();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to submit report",
        variant: "destructive",
      });
    } finally {
      setSubmittingId(null);
    }
  };

  const handleEdit = (reportId: number) => {
    router.push(`/dashboard/financial-reports/${reportId}/edit`);
  };

  const handleView = (reportId: number) => {
    router.push(`/dashboard/financial-reports/${reportId}`);
  };

  // Filter reports to show only editable ones (draft, rejected_by_daf, rejected_by_dg)
  const reports = Array.isArray(data?.data) ? data.data : [];
  const editableReports = reports.filter((report: any) => {
    const status = report.status as ReportStatus;
    return (
      status === "draft" ||
      status === "rejected_by_daf" ||
      status === "rejected_by_dg"
    );
  });

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Failed to load financial reports. Please try again.
        </AlertDescription>
      </Alert>
    );
  }

  if (editableReports.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">
          No draft or rejected reports found. All your reports are either submitted or approved.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Report Code</TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Updated</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {editableReports.map((report: any) => {
              const isLocked = report.locked;
              const status = report.status as ReportStatus;
              const canSubmit =
                status === "draft" ||
                status === "rejected_by_daf" ||
                status === "rejected_by_dg";
              const isSubmitting = submittingId === report.id;

              return (
                <TableRow key={report.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      {report.reportCode}
                      {isLocked && (
                        <Lock className="h-3.5 w-3.5 text-muted-foreground" />
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="max-w-md truncate">{report.title}</div>
                  </TableCell>
                  <TableCell>
                    <ApprovalStatusBadge status={status} />
                  </TableCell>
                  <TableCell>
                    {report.createdAt
                      ? format(new Date(report.createdAt), "MMM d, yyyy")
                      : "-"}
                  </TableCell>
                  <TableCell>
                    {report.updatedAt
                      ? format(new Date(report.updatedAt), "MMM d, yyyy")
                      : "-"}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      {!isLocked && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(report.id)}
                        >
                          <Edit className="h-4 w-4 mr-1" />
                          Edit
                        </Button>
                      )}
                      {isLocked && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleView(report.id)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                      )}
                      {canSubmit && !isLocked && (
                        <Button
                          size="sm"
                          onClick={() => handleSubmit(report.id)}
                          disabled={isSubmitting}
                        >
                          <Send className="h-4 w-4 mr-1" />
                          {isSubmitting ? "Submitting..." : "Submit"}
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Show rejection alerts for rejected reports */}
      {editableReports
        .filter(
          (report: any) =>
            report.status === "rejected_by_daf" ||
            report.status === "rejected_by_dg"
        )
        .map((report: any) => (
          <RejectionAlert
            key={report.id}
            status={report.status}
            dafComment={report.dafComment}
            dgComment={report.dgComment}
          />
        ))}
    </div>
  );
}