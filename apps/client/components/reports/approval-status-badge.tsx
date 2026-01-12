import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { ReportStatus } from "@/types/financial-reports-approval";

interface ApprovalStatusBadgeProps {
  status: ReportStatus;
  className?: string;
}

// Status to color variant mapping
const statusColorMap: Record<ReportStatus, string> = {
  draft: "bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-800 dark:text-gray-200 dark:border-gray-700",
  submitted: "bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-200 dark:border-yellow-800",
  pending_daf_approval: "bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-200 dark:border-yellow-800",
  approved_by_daf: "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-200 dark:border-blue-800",
  fully_approved: "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-200 dark:border-green-800",
  approved: "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-200 dark:border-green-800",
  rejected_by_daf: "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-200 dark:border-red-800",
  rejected_by_dg: "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-200 dark:border-red-800",
  rejected: "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-200 dark:border-red-800",
};

// Status to user-friendly label mapping
const statusLabelMap: Record<ReportStatus, string> = {
  draft: "Draft",
  submitted: "Submitted",
  pending_daf_approval: "Pending DAF Approval",
  approved_by_daf: "Approved by DAF",
  fully_approved: "Fully Approved",
  approved: "Approved",
  rejected_by_daf: "Rejected by DAF",
  rejected_by_dg: "Rejected by DG",
  rejected: "Rejected",
};

export function ApprovalStatusBadge({ status, className }: ApprovalStatusBadgeProps) {
  const colorClasses = statusColorMap[status];
  const label = statusLabelMap[status];

  return (
    <Badge
      className={cn(
        "rounded-full px-3 py-1 text-xs font-medium capitalize",
        colorClasses,
        className
      )}
    >
      {label}
    </Badge>
  );
}
