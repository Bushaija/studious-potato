import { Alert, AlertDescription } from "@/components/ui/alert";
import { Lock, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface ReportLockIndicatorProps {
  locked: boolean;
  status?: string;
  className?: string;
  variant?: "default" | "inline";
}

export function ReportLockIndicator({
  locked,
  status,
  className,
  variant = "default",
}: ReportLockIndicatorProps) {
  if (!locked) {
    return null;
  }

  const getMessage = () => {
    if (status === "fully_approved") {
      return "This report has been fully approved and is permanently locked. No further edits are allowed.";
    }
    if (status === "pending_daf_approval" || status === "approved_by_daf") {
      return "This report is currently under review and cannot be edited.";
    }
    return "This report is locked and cannot be edited.";
  };

  if (variant === "inline") {
    return (
      <div
        className={cn(
          "inline-flex items-center gap-1.5 text-sm text-muted-foreground",
          className
        )}
      >
        <Lock className="h-3.5 w-3.5" aria-hidden="true" />
        <span>Locked</span>
      </div>
    );
  }

  return (
    <Alert className={cn("border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30", className)}>
      <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-500" />
      <AlertDescription className="text-amber-800 dark:text-amber-300">
        <div className="flex items-start gap-2">
          <Lock className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{getMessage()}</span>
        </div>
      </AlertDescription>
    </Alert>
  );
}
