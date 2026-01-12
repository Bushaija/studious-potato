import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface RejectionAlertProps {
  status: string;
  dafComment?: string | null;
  dgComment?: string | null;
  className?: string;
}

export function RejectionAlert({
  status,
  dafComment,
  dgComment,
  className,
}: RejectionAlertProps) {
  const isRejectedByDaf = status === "rejected_by_daf";
  const isRejectedByDg = status === "rejected_by_dg";

  if (!isRejectedByDaf && !isRejectedByDg) {
    return null;
  }

  const rejector = isRejectedByDaf ? "DAF" : "DG";
  const comment = isRejectedByDaf ? dafComment : dgComment;

  return (
    <Alert
      variant="destructive"
      className={cn("border-red-300 bg-red-50 dark:border-red-900 dark:bg-red-950/30", className)}
    >
      <AlertCircle className="h-5 w-5" />
      <AlertTitle className="text-base font-semibold">
        Report Rejected by {rejector}
      </AlertTitle>
      <AlertDescription className="mt-2">
        {comment ? (
          <div className="space-y-1">
            <p className="text-sm font-medium">Reason for rejection:</p>
            <p className="text-sm">{comment}</p>
          </div>
        ) : (
          <p className="text-sm">No comment provided.</p>
        )}
      </AlertDescription>
    </Alert>
  );
}
