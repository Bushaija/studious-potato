import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { ApprovalStatus } from "@/types/planning-approval";

interface ApprovalStatusBadgeProps {
  status: ApprovalStatus;
  className?: string;
}

const STATUS_CONFIG: Record<
  ApprovalStatus,
  {
    label: string;
    variant: "default" | "secondary" | "destructive" | "outline";
    className?: string;
  }
> = {
  DRAFT: {
    label: "Draft",
    variant: "outline",
    className: "border-gray-400 text-gray-700 dark:text-gray-300",
  },
  PENDING: {
    label: "Pending Review",
    variant: "secondary",
    className: "bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-700",
  },
  APPROVED: {
    label: "Approved",
    variant: "default",
    className: "bg-green-100 text-green-800 border-green-300 dark:bg-green-900/30 dark:text-green-400 dark:border-green-700",
  },
  REJECTED: {
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
