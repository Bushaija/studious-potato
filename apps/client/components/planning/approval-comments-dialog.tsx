"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import type { ApprovalAction } from "@/types/planning-approval";

interface ApprovalCommentsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  action: ApprovalAction;
  planningId: number;
  onConfirm: (comments?: string) => Promise<void>;
  isLoading?: boolean;
}

export function ApprovalCommentsDialog({
  open,
  onOpenChange,
  action,
  planningId,
  onConfirm,
  isLoading = false,
}: ApprovalCommentsDialogProps) {
  const [comments, setComments] = useState("");
  const isReject = action === "REJECT";

  // Reset comments when dialog closes
  useEffect(() => {
    if (!open) {
      setComments("");
    }
  }, [open]);

  const handleConfirm = async () => {
    await onConfirm(comments.trim() || undefined);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Submit on Ctrl+Enter or Cmd+Enter
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      if (!isLoading && (!isReject || comments.trim())) {
        handleConfirm();
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent onKeyDown={handleKeyDown}>
        <DialogHeader>
          <DialogTitle id="approval-dialog-title">
            {isReject ? "Reject Plan" : "Approve Plan"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="approval-comments">
              Comments {isReject && <span className="text-destructive" aria-label="required">*</span>}
            </Label>
            <Textarea
              id="approval-comments"
              placeholder={
                isReject
                  ? "Please provide a reason for rejection..."
                  : "Optional comments..."
              }
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              rows={4}
              required={isReject}
              aria-required={isReject}
              aria-invalid={isReject && !comments.trim()}
              aria-describedby={isReject ? "comments-requirement" : undefined}
              disabled={isLoading}
              autoFocus
            />
            {isReject && (
              <p
                id="comments-requirement"
                className="text-xs text-muted-foreground"
              >
                Comments are required when rejecting a plan.
              </p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
            type="button"
          >
            Cancel
          </Button>
          <Button
            variant={isReject ? "destructive" : "default"}
            onClick={handleConfirm}
            disabled={isLoading || (isReject && !comments.trim())}
            type="button"
            aria-label={
              isReject
                ? "Confirm rejection with comments"
                : "Confirm approval"
            }
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isLoading
              ? "Processing..."
              : isReject
                ? "Reject"
                : "Approve"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
