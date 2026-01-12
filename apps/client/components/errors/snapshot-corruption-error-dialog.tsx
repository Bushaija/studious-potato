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
import { AlertTriangle, ShieldAlert } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

/**
 * Props for SnapshotCorruptionErrorDialog component
 */
interface SnapshotCorruptionErrorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reportId?: number;
  reportStatus?: string;
  onContactAdmin?: () => void;
}

/**
 * SnapshotCorruptionErrorDialog Component
 * 
 * Displays a critical error dialog when snapshot integrity validation fails.
 * This prevents display of corrupted financial reports and guides users to contact administrators.
 * 
 * Task 22: Add Snapshot Integrity Validation
 * Requirements: 10.3, 10.4, 10.5
 * 
 * @example
 * ```tsx
 * <SnapshotCorruptionErrorDialog
 *   open={showError}
 *   onOpenChange={setShowError}
 *   reportId={123}
 *   reportStatus="approved"
 * />
 * ```
 */
export function SnapshotCorruptionErrorDialog({
  open,
  onOpenChange,
  reportId,
  reportStatus,
  onContactAdmin,
}: SnapshotCorruptionErrorDialogProps) {
  const handleContactAdmin = () => {
    if (onContactAdmin) {
      onContactAdmin();
    } else {
      // Default behavior: open email client
      const subject = encodeURIComponent(
        `Snapshot Corruption - Report ${reportId || 'Unknown'}`
      );
      const body = encodeURIComponent(
        `A snapshot integrity check has failed for the following report:\n\n` +
        `Report ID: ${reportId || 'Unknown'}\n` +
        `Report Status: ${reportStatus || 'Unknown'}\n` +
        `Timestamp: ${new Date().toISOString()}\n\n` +
        `Please investigate this issue as soon as possible.`
      );
      window.location.href = `mailto:admin@example.com?subject=${subject}&body=${body}`;
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-2xl">
        <AlertDialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-red-100 rounded-full">
              <ShieldAlert className="h-6 w-6 text-red-600" />
            </div>
            <AlertDialogTitle className="text-xl">
              Report Data Integrity Error
            </AlertDialogTitle>
          </div>
          <AlertDialogDescription className="text-base space-y-4">
            <p>
              The financial report you are trying to view has failed an integrity check. 
              This means the snapshot data may have been corrupted or tampered with.
            </p>

            <Alert variant="destructive" className="border-red-300 bg-red-50">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="ml-2">
                <strong>Security Notice:</strong> For data security and compliance reasons, 
                this report cannot be displayed until the issue is resolved.
              </AlertDescription>
            </Alert>

            {(reportId || reportStatus) && (
              <div className="bg-gray-50 p-4 rounded-md space-y-2 text-sm">
                <h4 className="font-semibold text-gray-900">Report Details:</h4>
                {reportId && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Report ID:</span>
                    <span className="font-mono text-gray-900">{reportId}</span>
                  </div>
                )}
                {reportStatus && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Status:</span>
                    <span className="font-medium text-gray-900">{reportStatus}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-600">Error Type:</span>
                  <span className="font-medium text-red-600">Checksum Validation Failed</span>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <h4 className="font-semibold text-gray-900">What should I do?</h4>
              <ul className="list-disc list-inside space-y-1 text-sm text-gray-700">
                <li>Contact your system administrator immediately</li>
                <li>Do not attempt to modify or access this report</li>
                <li>Provide the report ID and error details to the administrator</li>
                <li>Wait for the administrator to investigate and resolve the issue</li>
              </ul>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col sm:flex-row gap-2">
          <AlertDialogAction
            onClick={handleContactAdmin}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            Contact Administrator
          </AlertDialogAction>
          <AlertDialogAction
            onClick={() => onOpenChange(false)}
            className="bg-gray-100 hover:bg-gray-200 text-gray-900"
          >
            Close
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
