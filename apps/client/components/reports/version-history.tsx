"use client";

import { useState } from "react";
import { Clock, Eye, GitCompare, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useReportVersions } from "@/hooks/queries/financial-reports/use-report-versions";
import type { ReportVersion } from "@/types/version-control";

interface VersionHistoryProps {
  reportId: number;
  onViewVersion?: (versionNumber: string) => void;
  onCompareVersion?: (versionNumber: string) => void;
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
 * Version History Component
 * 
 * Displays a list of all report versions with timestamps, creator information,
 * and changes summary. Provides actions to view specific versions or compare
 * them with the current version.
 * 
 * Requirements: 5.3, 5.4, 8.1, 8.2
 * 
 * @example
 * // Basic usage
 * <VersionHistory reportId={123} />
 * 
 * @example
 * // With custom handlers
 * <VersionHistory 
 *   reportId={123}
 *   onViewVersion={(version) => console.log("View", version)}
 *   onCompareVersion={(version) => console.log("Compare", version)}
 * />
 */
export function VersionHistory({
  reportId,
  onViewVersion,
  onCompareVersion,
}: VersionHistoryProps) {
  const { data, isLoading, error } = useReportVersions(reportId);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Version History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Version History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <p>Failed to load version history.</p>
            <p className="text-sm mt-2">{error.message}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const versions = data?.versions || [];
  const currentVersion = data?.currentVersion;

  if (versions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Version History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <p>No version history available.</p>
            <p className="text-sm mt-2">
              Versions are created when a report is submitted or resubmitted.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Version History</CardTitle>
          <Badge variant="outline" className="font-mono">
            Current: {currentVersion}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[100px]">Version</TableHead>
                <TableHead className="w-[180px]">Timestamp</TableHead>
                <TableHead className="w-[150px]">Created By</TableHead>
                <TableHead>Changes Summary</TableHead>
                <TableHead className="text-right w-[200px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {versions.map((version) => {
                const isCurrent = version.versionNumber === currentVersion;
                
                return (
                  <TableRow key={version.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Badge 
                          variant={isCurrent ? "default" : "outline"}
                          className="font-mono"
                        >
                          {version.versionNumber}
                        </Badge>
                        {isCurrent && (
                          <Badge variant="secondary" className="text-xs">
                            Current
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {formatDate(version.snapshotTimestamp)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 text-sm">
                        <User className="h-3 w-3 text-muted-foreground" />
                        {version.creator?.name || "Unknown"}
                      </div>
                    </TableCell>
                    <TableCell>
                      <p className="text-sm text-muted-foreground">
                        {version.changesSummary || "Initial version"}
                      </p>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onViewVersion?.(version.versionNumber)}
                          className="gap-1"
                        >
                          <Eye className="h-3 w-3" />
                          View
                        </Button>
                        {!isCurrent && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onCompareVersion?.(version.versionNumber)}
                            className="gap-1"
                          >
                            <GitCompare className="h-3 w-3" />
                            Compare
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        {/* Summary Footer */}
        <div className="mt-4 pt-4 border-t text-sm text-muted-foreground">
          <p>
            Total versions: <span className="font-semibold">{versions.length}</span>
          </p>
          <p className="text-xs mt-1">
            Each version represents a snapshot of the report at the time of submission.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
