"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Lock, Mail } from "lucide-react";

interface PeriodLockErrorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  periodName?: string;
  projectName?: string;
  facilityName?: string;
  lockedBy?: string;
  lockedAt?: string;
  adminEmail?: string;
}

/**
 * Period Lock Error Dialog
 * 
 * Displays a user-friendly error message when an edit operation is blocked
 * due to a locked reporting period. Shows period lock information and provides
 * a way to contact administrators for unlock requests.
 * 
 * @example
 * ```tsx
 * const [showError, setShowError] = useState(false);
 * 
 * // In your mutation error handler:
 * onError: (error) => {
 *   if (error.message.includes('locked')) {
 *     setShowError(true);
 *   }
 * }
 * 
 * <PeriodLockErrorDialog
 *   open={showError}
 *   onOpenChange={setShowError}
 *   periodName="January 2024"
 *   projectName="Malaria Control"
 *   facilityName="Central Hospital"
 * />
 * ```
 */
export function PeriodLockErrorDialog({
  open,
  onOpenChange,
  periodName,
  projectName,
  facilityName,
  lockedBy,
  lockedAt,
  adminEmail = "admin@example.com",
}: PeriodLockErrorDialogProps) {
  const handleContactAdmin = () => {
    const subject = encodeURIComponent(
      `Period Unlock Request: ${periodName || "Unknown Period"}`
    );
    const body = encodeURIComponent(
      `Hello,\n\nI need to edit data for the following locked period:\n\n` +
      `Period: ${periodName || "N/A"}\n` +
      `Project: ${projectName || "N/A"}\n` +
      `Facility: ${facilityName || "N/A"}\n\n` +
      `Reason for unlock request:\n[Please describe your reason here]\n\n` +
      `Thank you.`
    );
    window.location.href = `mailto:${adminEmail}?subject=${subject}&body=${body}`;
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 rounded-full bg-destructive/10">
              <Lock className="h-5 w-5 text-destructive" />
            </div>
            <AlertDialogTitle>Period Locked</AlertDialogTitle>
          </div>
          <AlertDialogDescription className="text-left space-y-3">
            <p>
              This reporting period is locked due to an approved financial report.
              You cannot create or edit data for this period.
            </p>

            {(periodName || projectName || facilityName) && (
              <div className="bg-muted p-3 rounded-md space-y-2 text-sm">
                <p className="font-semibold text-foreground">Period Information:</p>
                {periodName && (
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">Period:</span>
                    <Badge variant="outline">{periodName}</Badge>
                  </div>
                )}
                {projectName && (
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">Project:</span>
                    <span className="text-foreground">{projectName}</span>
                  </div>
                )}
                {facilityName && (
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">Facility:</span>
                    <span className="text-foreground">{facilityName}</span>
                  </div>
                )}
                {lockedBy && (
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">Locked by:</span>
                    <span className="text-foreground">{lockedBy}</span>
                  </div>
                )}
                {lockedAt && (
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">Locked at:</span>
                    <span className="text-foreground">
                      {new Date(lockedAt).toLocaleString()}
                    </span>
                  </div>
                )}
              </div>
            )}

            <p className="text-sm">
              If you need to make changes to this period, please contact an
              administrator to request an unlock.
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col sm:flex-row gap-2">
          <button
            onClick={handleContactAdmin}
            className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2 w-full sm:w-auto"
          >
            <Mail className="h-4 w-4 mr-2" />
            Contact Administrator
          </button>
          <AlertDialogAction
            onClick={() => onOpenChange(false)}
            className="w-full sm:w-auto"
          >
            Close
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
