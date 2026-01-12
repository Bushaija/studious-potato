"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";
import { useUser } from "@/components/providers/session-provider";
import { approvePlanning } from "@/api-client/planning-approval";
import { ApprovalCommentsDialog } from "./approval-comments-dialog";
import { useApprovalErrorHandler } from "@/hooks/use-approval-error-handler";
import type { ApprovalStatus, ApprovalAction } from "@/types/planning-approval";

interface ApprovalActionsCardProps {
  planningId: number;
  approvalStatus: ApprovalStatus;
  onRefresh: () => void;
}

export function ApprovalActionsCard({
  planningId,
  approvalStatus,
  onRefresh,
}: ApprovalActionsCardProps) {
  const user = useUser();
  const { handleError, handleSuccess } = useApprovalErrorHandler();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [currentAction, setCurrentAction] = useState<ApprovalAction>("APPROVE");
  const [isLoading, setIsLoading] = useState(false);

  // Check if user is admin or superadmin
  const isAdmin = user?.role === "admin" || user?.role === "superadmin";
  
  // Only show for PENDING status
  const isPending = approvalStatus === "PENDING";
  
  // Only show if user has permission and status is PENDING
  const canApprove = isAdmin && isPending;

  if (!canApprove) {
    return null;
  }

  const handleApprovalAction = async (comments?: string) => {
    try {
      setIsLoading(true);

      const result = await approvePlanning(
        planningId,
        currentAction,
        comments
      );

      // Show success message
      handleSuccess(
        "Success",
        result.message || `Plan ${currentAction === "APPROVE" ? "approved" : "rejected"} successfully`
      );

      setDialogOpen(false);
      
      // Trigger page refresh to show updated data
      onRefresh();
    } catch (error) {
      // Use centralized error handler with context
      const actionContext = currentAction === "APPROVE" ? "approve this plan" : "reject this plan";
      handleError(error, actionContext);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApproveClick = () => {
    setCurrentAction("APPROVE");
    setDialogOpen(true);
  };

  const handleRejectClick = () => {
    setCurrentAction("REJECT");
    setDialogOpen(true);
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Review Actions</CardTitle>
          <CardDescription>
            Approve or reject this planning submission
          </CardDescription>
        </CardHeader>
        <CardContent className="flex gap-3">
          <Button
            variant="default"
            className="flex-1"
            onClick={handleApproveClick}
            disabled={isLoading}
            aria-label="Approve this plan"
          >
            {isLoading && currentAction === "APPROVE" ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle className="mr-2 h-4 w-4" />
            )}
            Approve Plan
          </Button>

          <Button
            variant="destructive"
            className="flex-1"
            onClick={handleRejectClick}
            disabled={isLoading}
            aria-label="Reject this plan"
          >
            {isLoading && currentAction === "REJECT" ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <XCircle className="mr-2 h-4 w-4" />
            )}
            Reject Plan
          </Button>
        </CardContent>
      </Card>

      <ApprovalCommentsDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        action={currentAction}
        planningId={planningId}
        onConfirm={handleApprovalAction}
        isLoading={isLoading}
      />
    </>
  );
}
