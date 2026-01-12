import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { ReportStatus } from "@/types/financial-reports-approval";

interface ApprovalStatusBadgeProps {
  status: ReportStatus;
  className?: string;
}

const STATUS_CONFIG: Record<
  ReportStatus,
  {
    label: string;
    variant: "default" | "secondary" | "destructive" | "outline";
    className?: string;
  }
> = {
  draft: {
    label: "Draft",
    variant: "outline",
    className: "border-gray-400 text-gray-700 dark:text-gray-300",
  },
  submitted: {
    label: "Submitted",
    variant: "secondary",
    className: "bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-700",
  },
  pending_daf_approval: {
    label: "Pending DAF Review",
    variant: "secondary",
    className: "bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-700",
  },
  rejected_by_daf: {
    label: "Rejected by DAF",
    variant: "destructive",
    className: "bg-red-100 text-red-800 border-red-300 dark:bg-red-900/30 dark:text-red-400 dark:border-red-700",
  },
  approved_by_daf: {
    label: "Pending DG Review",
    variant: "secondary",
    className: "bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-700",
  },
  rejected_by_dg: {
    label: "Rejected by DG",
    variant: "destructive",
    className: "bg-red-100 text-red-800 border-red-300 dark:bg-red-900/30 dark:text-red-400 dark:border-red-700",
  },
  fully_approved: {
    label: "Fully Approved",
    variant: "default",
    className: "bg-green-100 text-green-800 border-green-300 dark:bg-green-900/30 dark:text-green-400 dark:border-green-700",
  },
  approved: {
    label: "Approved",
    variant: "default",
    className: "bg-green-100 text-green-800 border-green-300 dark:bg-green-900/30 dark:text-green-400 dark:border-green-700",
  },
  rejected: {
    label: "Rejected",
    variant: "destructive",
    className: "bg-red-100 text-red-800 border-red-300 dark:bg-red-900/30 dark:text-red-400 dark:border-red-700",
  },
};

export function ApprovalStatusBadge({
  status,
  className,
}: ApprovalStatusBadgeProps) {
  const config = STATUS_CONFIG[status];

  return (
    <Badge
      variant={config.variant}
      className={cn(config.className, className)}
      aria-label={`Approval status: ${config.label}`}
      role="status"
    >
      {config.label}
    </Badge>
  );
}
