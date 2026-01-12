"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Lock, Unlock, History, AlertCircle, ChevronDown, ChevronUp } from "lucide-react";
import { usePeriodLocks, usePeriodLockAudit } from "@/hooks/queries/period-locks";
import { useUnlockPeriod } from "@/hooks/mutations/period-locks";
import { useAdminPermission } from "@/hooks/use-admin-permission";
import type { PeriodLock } from "@/types/period-locks";
import { format } from "date-fns";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface PeriodLockManagementProps {
  facilityId: number;
}

/**
 * Period Lock Management UI Component
 * 
 * Displays a table of all locked periods for the current facility with management capabilities.
 * Shows period name, project, lock status, locked by, and locked date.
 * Allows admin users to unlock periods with reason input.
 * Displays audit log for each period lock.
 * 
 * Requirements: 7.1, 7.2, 7.3, 7.4, 9.1, 9.2, 9.3, 9.4, 9.5
 * 
 * @example
 * <PeriodLockManagement facilityId={123} />
 */
export function PeriodLockManagement({ facilityId }: PeriodLockManagementProps) {
  const [unlockDialogOpen, setUnlockDialogOpen] = useState(false);
  const [selectedLock, setSelectedLock] = useState<PeriodLock | null>(null);
  const [unlockReason, setUnlockReason] = useState("");
  const [expandedAuditLogs, setExpandedAuditLogs] = useState<Set<number>>(new Set());

  const { data, isLoading, error } = usePeriodLocks(facilityId);
  const { isAdmin, isCheckingAdmin } = useAdminPermission();
  const unlockMutation = useUnlockPeriod();

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "-";
    try {
      return format(new Date(dateString), "MMM dd, yyyy 'at' h:mm a");
    } catch {
      return "-";
    }
  };

  const handleUnlockClick = (lock: PeriodLock) => {
    setSelectedLock(lock);
    setUnlockReason("");
    setUnlockDialogOpen(true);
  };

  const handleUnlockConfirm = async () => {
    if (!selectedLock || !unlockReason.trim()) {
      return;
    }

    await unlockMutation.mutateAsync({
      lockId: selectedLock.id,
      data: { reason: unlockReason },
    });

    setUnlockDialogOpen(false);
    setSelectedLock(null);
    setUnlockReason("");
  };

  const toggleAuditLog = (lockId: number) => {
    setExpandedAuditLogs((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(lockId)) {
        newSet.delete(lockId);
      } else {
        newSet.add(lockId);
      }
      return newSet;
    });
  };

  if (isLoading || isCheckingAdmin) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Period Lock Management</CardTitle>
          <CardDescription>Loading period locks...</CardDescription>
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
          <CardTitle>Period Lock Management</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-destructive">
            <AlertCircle className="h-5 w-5" />
            <p>Failed to load period locks: {error.message}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const locks = data?.locks || [];

  if (locks.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Period Lock Management</CardTitle>
          <CardDescription>
            Manage locked reporting periods for this facility
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Lock className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              No locked periods found for this facility
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Periods are automatically locked when financial reports are approved
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Period Lock Management</CardTitle>
          <CardDescription>
            Manage locked reporting periods for this facility. Locked periods prevent back-dating of data.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Period</TableHead>
                  <TableHead>Project</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Locked By</TableHead>
                  <TableHead>Locked Date</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {locks.map((lock) => (
                  <>
                    <TableRow key={lock.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">
                            {lock.reportingPeriod?.name || `Period ${lock.reportingPeriodId}`}
                          </div>
                          {lock.reportingPeriod && (
                            <div className="text-xs text-muted-foreground">
                              {format(new Date(lock.reportingPeriod.startDate), "MMM dd")} -{" "}
                              {format(new Date(lock.reportingPeriod.endDate), "MMM dd, yyyy")}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">
                            {lock.project?.name || `Project ${lock.projectId}`}
                          </div>
                          {lock.project?.code && (
                            <div className="text-xs text-muted-foreground">
                              {lock.project.code}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {lock.isLocked ? (
                          <Badge variant="destructive" className="gap-1">
                            <Lock className="h-3 w-3" />
                            Locked
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="gap-1">
                            <Unlock className="h-3 w-3" />
                            Unlocked
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {lock.lockedByUser?.name || lock.lockedBy || "-"}
                      </TableCell>
                      <TableCell>{formatDate(lock.lockedAt)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {lock.isLocked && isAdmin && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleUnlockClick(lock)}
                              disabled={unlockMutation.isPending}
                            >
                              <Unlock className="h-4 w-4 mr-1" />
                              Unlock
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleAuditLog(lock.id)}
                          >
                            <History className="h-4 w-4 mr-1" />
                            {expandedAuditLogs.has(lock.id) ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                    {expandedAuditLogs.has(lock.id) && (
                      <TableRow>
                        <TableCell colSpan={6} className="bg-muted/50">
                          <AuditLogSection lockId={lock.id} />
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                ))}
              </TableBody>
            </Table>
          </div>

          {!isAdmin && (
            <div className="mt-4 p-4 bg-muted rounded-lg flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div className="text-sm text-muted-foreground">
                <p className="font-medium">Admin Access Required</p>
                <p>Only administrators can unlock periods. Contact your system administrator if you need to make changes to a locked period.</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Unlock Dialog */}
      <Dialog open={unlockDialogOpen} onOpenChange={setUnlockDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Unlock Reporting Period</DialogTitle>
            <DialogDescription>
              You are about to unlock the period for{" "}
              <span className="font-semibold">
                {selectedLock?.reportingPeriod?.name || "this period"}
              </span>
              . This will allow users to edit data in this period.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="unlock-reason">
                Reason for Unlocking <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="unlock-reason"
                placeholder="Enter the reason for unlocking this period (required for audit trail)"
                value={unlockReason}
                onChange={(e) => setUnlockReason(e.target.value)}
                rows={4}
                className="resize-none"
              />
              <p className="text-xs text-muted-foreground">
                This reason will be recorded in the audit log
              </p>
            </div>

            {selectedLock?.lockedReason && (
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm font-medium mb-1">Original Lock Reason:</p>
                <p className="text-sm text-muted-foreground">
                  {selectedLock.lockedReason}
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setUnlockDialogOpen(false)}
              disabled={unlockMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUnlockConfirm}
              disabled={!unlockReason.trim() || unlockMutation.isPending}
            >
              {unlockMutation.isPending ? "Unlocking..." : "Unlock Period"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

/**
 * Audit Log Section Component
 * Displays the audit trail for a specific period lock
 */
function AuditLogSection({ lockId }: { lockId: number }) {
  const { data, isLoading, error } = usePeriodLockAudit(lockId);

  if (isLoading) {
    return (
      <div className="p-4">
        <p className="text-sm text-muted-foreground mb-2">Loading audit log...</p>
        <div className="space-y-2">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4">
        <div className="flex items-center gap-2 text-destructive text-sm">
          <AlertCircle className="h-4 w-4" />
          <p>Failed to load audit log: {error.message}</p>
        </div>
      </div>
    );
  }

  const auditLogs = data?.auditLogs || [];

  if (auditLogs.length === 0) {
    return (
      <div className="p-4">
        <p className="text-sm text-muted-foreground">No audit log entries found</p>
      </div>
    );
  }

  const getActionBadge = (action: string) => {
    switch (action) {
      case "LOCKED":
        return (
          <Badge variant="destructive" className="gap-1">
            <Lock className="h-3 w-3" />
            Locked
          </Badge>
        );
      case "UNLOCKED":
        return (
          <Badge variant="secondary" className="gap-1">
            <Unlock className="h-3 w-3" />
            Unlocked
          </Badge>
        );
      case "EDIT_ATTEMPTED":
        return (
          <Badge variant="outline" className="gap-1">
            <AlertCircle className="h-3 w-3" />
            Edit Attempted
          </Badge>
        );
      default:
        return <Badge variant="outline">{action}</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "MMM dd, yyyy 'at' h:mm a");
    } catch {
      return dateString;
    }
  };

  return (
    <div className="p-4">
      <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
        <History className="h-4 w-4" />
        Audit Log
      </h4>
      <div className="space-y-3">
        {auditLogs.map((log) => (
          <div
            key={log.id}
            className="flex items-start gap-3 p-3 bg-background rounded-lg border"
          >
            <div className="flex-shrink-0 mt-0.5">{getActionBadge(log.action)}</div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2 mb-1">
                <p className="text-sm font-medium">
                  {log.performer?.name || `User ${log.performedBy}`}
                </p>
                <p className="text-xs text-muted-foreground whitespace-nowrap">
                  {formatDate(log.performedAt)}
                </p>
              </div>
              {log.reason && (
                <p className="text-sm text-muted-foreground">{log.reason}</p>
              )}
              {log.performer?.email && (
                <p className="text-xs text-muted-foreground mt-1">
                  {log.performer.email}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
