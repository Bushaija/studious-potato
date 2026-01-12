"use client";

import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Lock } from "lucide-react";

interface PeriodLockBadgeProps {
  isLocked: boolean;
  lockedAt?: string | null;
  lockedBy?: string | null;
  lockedReason?: string | null;
}

/**
 * Format date to user-friendly format (e.g., "Jan 15, 2025 at 2:30 PM")
 */
const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
};

/**
 * Period Lock Badge Component
 * 
 * Displays a lock indicator when a reporting period is locked due to an approved financial report.
 * Shows lock status, who locked the period, when it was locked, and why.
 * 
 * Requirements: 7.1, 7.2, 7.3, 7.4
 * 
 * @example
 * // Period not locked
 * <PeriodLockBadge isLocked={false} />
 * 
 * @example
 * // Period locked with full details
 * <PeriodLockBadge 
 *   isLocked={true} 
 *   lockedAt="2025-01-15T14:30:00Z"
 *   lockedBy="John Doe"
 *   lockedReason="Report fully approved"
 * />
 * 
 * @example
 * // Period locked with minimal details
 * <PeriodLockBadge 
 *   isLocked={true}
 * />
 */
export function PeriodLockBadge({
  isLocked,
  lockedAt,
  lockedBy,
  lockedReason,
}: PeriodLockBadgeProps) {
  // Don't render anything if period is not locked
  if (!isLocked) {
    return null;
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge 
          variant="destructive" 
          className="bg-red-100 dark:bg-red-950 border-red-300 dark:border-red-800 text-red-800 dark:text-red-300"
        >
          <Lock className="h-3 w-3 mr-1" />
          Period Locked
        </Badge>
      </TooltipTrigger>
      <TooltipContent>
        <div className="text-sm space-y-1">
          <p className="font-semibold">This reporting period is locked.</p>
          <p className="text-muted-foreground">
            {lockedReason || "This period is locked due to an approved financial report."}
          </p>
          {lockedBy && (
            <p className="text-muted-foreground text-xs">
              Locked by: {lockedBy}
            </p>
          )}
          {lockedAt && (
            <p className="text-muted-foreground text-xs">
              Locked: {formatDate(lockedAt)}
            </p>
          )}
          <p className="text-muted-foreground text-xs mt-2 pt-2 border-t border-muted">
            Contact an administrator to unlock this period if changes are needed.
          </p>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
