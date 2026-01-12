"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ApprovalStatusBadge } from "./approval-status-badge";
import type { ApprovalStatus } from "@/types/planning-approval";
import { format } from "date-fns";

interface ApprovalStatusSectionProps {
  approvalStatus: ApprovalStatus;
  reviewedBy?: number | null;
  reviewedByName?: string | null;
  reviewedAt?: string | null;
  reviewComments?: string | null;
  reviewer?: {
    id: number;
    name: string;
    email: string;
  } | null;
}

export function ApprovalStatusSection({
  approvalStatus,
  reviewedBy,
  reviewedByName,
  reviewedAt,
  reviewComments,
  reviewer,
}: ApprovalStatusSectionProps) {
  // Determine the reviewer name from available sources
  const displayReviewerName = reviewer?.name || reviewedByName || "Unknown";
  
  // Format the review date if available
  const formattedDate = reviewedAt
    ? format(new Date(reviewedAt), "PPpp") // e.g., "Apr 29, 2023, 9:30 AM"
    : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Approval Status</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Current Status:</span>
          <ApprovalStatusBadge status={approvalStatus} />
        </div>

        {reviewedBy && (
          <>
            <Separator />
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  Reviewed By:
                </span>
                <span className="text-sm font-medium">
                  {displayReviewerName}
                </span>
              </div>

              {formattedDate && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    Reviewed At:
                  </span>
                  <span className="text-sm">{formattedDate}</span>
                </div>
              )}

              {reviewComments && (
                <div className="space-y-1">
                  <span className="text-sm text-muted-foreground">
                    Comments:
                  </span>
                  <p className="text-sm bg-muted p-3 rounded-md whitespace-pre-wrap">
                    {reviewComments}
                  </p>
                </div>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
