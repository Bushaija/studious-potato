"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, FileText } from "lucide-react";
import { DafReviewCard } from "@/components/financial-reports/daf-review-card";
import { EmbeddedReportViewer } from "@/components/financial-reports/embedded-report-viewer";
import { ApprovalCommentDialog } from "@/components/financial-reports/approval-comment-dialog";
import { dafApprove, dafReject } from "@/fetchers/financial-reports";
import { useGetDafQueue } from "@/hooks/queries/financial-reports";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { InfoIcon } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function DafApprovalQueuePage() {
  const queryClient = useQueryClient();
  const [selectedReportId, setSelectedReportId] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending');
  const [dialogState, setDialogState] = useState<{
    open: boolean;
    action: "approve" | "reject";
  }>({ open: false, action: "approve" });

  // Fetch DAF queue
  const { data: queueData, isLoading: isLoadingReports } = useGetDafQueue({
    status: statusFilter,
  });

  // Approve mutation
  const approveMutation = useMutation({
    mutationFn: ({ reportId, comment }: { reportId: number; comment?: string }) =>
      dafApprove(reportId, comment),
    onSuccess: () => {
      toast.success("Report approved successfully");
      queryClient.invalidateQueries({ queryKey: ["financial-reports", "daf-queue"] });
      queryClient.invalidateQueries({ queryKey: ["financial-report"] });
      setDialogState({ open: false, action: "approve" });
      setSelectedReportId(null);
    },
    onError: (error: Error) => {
      toast.error(`Failed to approve: ${error.message}`);
    },
  });

  // Reject mutation
  const rejectMutation = useMutation({
    mutationFn: ({ reportId, comment }: { reportId: number; comment: string }) =>
      dafReject(reportId, comment),
    onSuccess: () => {
      toast.success("Report rejected successfully");
      queryClient.invalidateQueries({ queryKey: ["financial-reports", "daf-queue"] });
      queryClient.invalidateQueries({ queryKey: ["financial-report"] });
      setDialogState({ open: false, action: "reject" });
      setSelectedReportId(null);
    },
    onError: (error: Error) => {
      toast.error(`Failed to reject: ${error.message}`);
    },
  });

  const handleApprove = () => {
    setDialogState({ open: true, action: "approve" });
  };

  const handleReject = () => {
    setDialogState({ open: true, action: "reject" });
  };

  const handleConfirmAction = async (comment?: string) => {
    if (!selectedReportId) return;

    if (dialogState.action === "approve") {
      await approveMutation.mutateAsync({ reportId: selectedReportId, comment });
    } else {
      if (!comment) {
        toast.error("Comment is required for rejection");
        return;
      }
      await rejectMutation.mutateAsync({ reportId: selectedReportId, comment });
    }
  };

  const pendingReports = queueData?.reports || [];
  const isProcessing = approveMutation.isPending || rejectMutation.isPending;

  return (
    <div className="flex h-[calc(100vh-4rem)]">
      {/* Sidebar Queue */}
      <div className="w-80 border-r bg-muted/10 flex flex-col shrink-0">
        {/* Header */}
        <div className="p-4 border-b bg-background">
          <div className="space-y-3">
            <div>
              <h1 className="text-lg font-semibold">DAF Queue</h1>
              <p className="text-xs text-muted-foreground">
                Review financial reports
              </p>
            </div>
            <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as typeof statusFilter)}>
              <SelectTrigger className="h-4 w-full">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="all">All</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Reports List */}
        <div className="flex-1 overflow-y-auto">
          {isLoadingReports ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : pendingReports.length === 0 ? (
            <div className="p-4">
              <Alert>
                <InfoIcon className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  {statusFilter === 'pending' && 'No pending reports'}
                  {statusFilter === 'approved' && 'No approved reports'}
                  {statusFilter === 'rejected' && 'No rejected reports'}
                  {statusFilter === 'all' && 'No reports found'}
                </AlertDescription>
              </Alert>
            </div>
          ) : (
            <div className="divide-y">
              {pendingReports.map((report: any) => (
                <DafReviewCard
                  key={report.id}
                  report={report}
                  onClick={() => setSelectedReportId(report.id)}
                  isSelected={selectedReportId === report.id}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-hidden bg-muted/5 px-8">
        {selectedReportId ? (
          <EmbeddedReportViewer
            reportId={selectedReportId}
            onApprove={handleApprove}
            onReject={handleReject}
            isProcessing={isProcessing}
            showActions={true}
          />
        ) : (
          <div className="h-full flex items-center justify-center">
            <div className="text-center text-muted-foreground space-y-2">
              <FileText className="h-12 w-12 mx-auto opacity-50" />
              <p className="text-sm">Select a report from the queue to review</p>
            </div>
          </div>
        )}
      </div>

      {/* Approval Comment Dialog */}
      <ApprovalCommentDialog
        open={dialogState.open}
        onOpenChange={(open) => setDialogState({ ...dialogState, open })}
        action={dialogState.action}
        reportId={selectedReportId || 0}
        onConfirm={handleConfirmAction}
        isLoading={isProcessing}
      />
    </div>
  );
}