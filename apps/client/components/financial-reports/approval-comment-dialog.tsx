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

type ApprovalAction = "approve" | "reject";

interface ApprovalCommentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  action: ApprovalAction;
  reportId: number;
  onConfirm: (comment?: string) => Promise<void>;
  isLoading?: boolean;
  title?: string;
}

export function ApprovalCommentDialog({
  open,
  onOpenChange,
  action,
  reportId,
  onConfirm,
  isLoading = false,
  title,
}: ApprovalCommentDialogProps) {
  const [comment, setComment] = useState("");
  const isReject = action === "reject";

  // Reset comment when dialog closes
  useEffect(() => {
    if (!open) {
      setComment("");
    }
  }, [open]);

  const handleConfirm = async () => {
    await onConfirm(comment.trim() || undefined);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Submit on Ctrl+Enter or Cmd+Enter
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      if (!isLoading && (!isReject || comment.trim())) {
        handleConfirm();
      }
    }
  };

  const dialogTitle = title || (isReject ? "Reject Report" : "Approve Report");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent onKeyDown={handleKeyDown}>
        <DialogHeader>
          <DialogTitle id="approval-dialog-title">{dialogTitle}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="approval-comment">
              Comment{" "}
              {isReject && (
                <span className="text-destructive" aria-label="required">
                  *
                </span>
              )}
            </Label>
            <Textarea
              id="approval-comment"
              placeholder={
                isReject
                  ? "Please provide a reason for rejection..."
                  : "Optional comments..."
              }
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={4}
              required={isReject}
              aria-required={isReject}
              aria-invalid={isReject && !comment.trim()}
              aria-describedby={isReject ? "comment-requirement" : undefined}
              disabled={isLoading}
              autoFocus
            />
            {isReject && (
              <p
                id="comment-requirement"
                className="text-xs text-muted-foreground"
              >
                A comment is required when rejecting a report.
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
            disabled={isLoading || (isReject && !comment.trim())}
            type="button"
            aria-label={
              isReject
                ? "Confirm rejection with comment"
                : "Confirm approval"
            }
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isLoading ? "Processing..." : isReject ? "Reject" : "Approve"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
