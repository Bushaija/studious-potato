"use client";

import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Activity, Camera, AlertCircle } from "lucide-react";

interface SnapshotIndicatorProps {
  isSnapshot: boolean;
  snapshotTimestamp?: string | null;
  isOutdated?: boolean;
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
 * Snapshot Indicator Component
 * 
 * Displays the data source status for financial reports:
 * - "Live Data" badge for draft reports (real-time data)
 * - "Snapshot" badge with timestamp for submitted/approved reports (frozen data)
 * - "Source data changed" warning badge if report is outdated
 * 
 * Requirements: 3.5, 5.2
 * 
 * @example
 * // Draft report with live data
 * <SnapshotIndicator isSnapshot={false} />
 * 
 * @example
 * // Submitted report with snapshot
 * <SnapshotIndicator 
 *   isSnapshot={true} 
 *   snapshotTimestamp="2025-01-15T14:30:00Z" 
 * />
 * 
 * @example
 * // Outdated snapshot
 * <SnapshotIndicator 
 *   isSnapshot={true} 
 *   snapshotTimestamp="2025-01-15T14:30:00Z"
 *   isOutdated={true}
 * />
 */
export function SnapshotIndicator({
  isSnapshot,
  snapshotTimestamp,
  isOutdated = false,
}: SnapshotIndicatorProps) {
  // Live Data Badge (for draft reports)
  if (!isSnapshot) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant="outline" className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300">
            <Activity className="h-3 w-3 mr-1" />
            Live Data
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-sm">
            This report displays real-time data from the database.
            <br />
            Data will update as changes are made to planning and execution records.
          </p>
        </TooltipContent>
      </Tooltip>
    );
  }

  // Snapshot Badge (for submitted/approved reports)
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant="secondary" className="bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-700">
            <Camera className="h-3 w-3 mr-1" />
            Snapshot
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-sm">
            This report displays frozen snapshot data captured at submission.
            <br />
            The data will not change even if source records are updated.
          </p>
        </TooltipContent>
      </Tooltip>

      {snapshotTimestamp && (
        <span className="text-xs text-muted-foreground">
          Captured: {formatDate(snapshotTimestamp)}
        </span>
      )}

      {isOutdated && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge variant="destructive" className="bg-amber-100 dark:bg-amber-950 border-amber-300 dark:border-amber-800 text-amber-800 dark:text-amber-300">
              <AlertCircle className="h-3 w-3 mr-1" />
              Source data changed
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <p className="text-sm">
              The underlying planning or execution data has been modified since this snapshot was captured.
              <br />
              Consider resubmitting the report to create a new version with updated data.
            </p>
          </TooltipContent>
        </Tooltip>
      )}
    </div>
  );
}
