"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle } from "lucide-react";

interface ApprovalActionsCardProps {
  onApprove: () => void;
  onReject: () => void;
  isLoading?: boolean;
  disabled?: boolean;
}

export function ApprovalActionsCard({
  onApprove,
  onReject,
  isLoading = false,
  disabled = false,
}: ApprovalActionsCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Review Actions</CardTitle>
      </CardHeader>
      <CardContent className="flex gap-3">
        <Button
          onClick={onApprove}
          disabled={isLoading || disabled}
          className="flex-1"
          size="lg"
        >
          <CheckCircle className="mr-2 h-4 w-4" />
          Approve
        </Button>
        <Button
          onClick={onReject}
          disabled={isLoading || disabled}
          variant="destructive"
          className="flex-1"
          size="lg"
        >
          <XCircle className="mr-2 h-4 w-4" />
          Reject
        </Button>
      </CardContent>
    </Card>
  );
}
