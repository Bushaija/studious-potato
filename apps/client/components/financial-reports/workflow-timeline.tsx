"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, XCircle, Send, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import type { WorkflowLogWithActor } from "@/types/financial-reports-approval";

interface WorkflowTimelineProps {
  logs: WorkflowLogWithActor[];
  className?: string;
}

const ACTION_CONFIG: Record<
  string,
  {
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    color: string;
  }
> = {
  submitted: {
    label: "Submitted for Approval",
    icon: Send,
    color: "text-blue-600 dark:text-blue-400",
  },
  daf_approved: {
    label: "Approved by DAF",
    icon: CheckCircle,
    color: "text-green-600 dark:text-green-400",
  },
  daf_rejected: {
    label: "Rejected by DAF",
    icon: XCircle,
    color: "text-red-600 dark:text-red-400",
  },
  dg_approved: {
    label: "Approved by DG",
    icon: CheckCircle,
    color: "text-green-600 dark:text-green-400",
  },
  dg_rejected: {
    label: "Rejected by DG",
    icon: XCircle,
    color: "text-red-600 dark:text-red-400",
  },
};

export function WorkflowTimeline({ logs, className }: WorkflowTimelineProps) {
  if (!logs || logs.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="text-base">Approval Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>No workflow history yet</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Sort logs by timestamp (most recent first)
  const sortedLogs = [...logs].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-base">Approval Timeline</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {sortedLogs.map((log, index) => {
            const config = ACTION_CONFIG[log.action] || {
              label: log.action,
              icon: Clock,
              color: "text-gray-600 dark:text-gray-400",
            };
            const Icon = config.icon;
            const isLast = index === sortedLogs.length - 1;

            return (
              <div key={log.id} className="relative">
                {/* Timeline line */}
                {!isLast && (
                  <div
                    className="absolute left-[11px] top-8 h-full w-0.5 bg-border"
                    aria-hidden="true"
                  />
                )}

                <div className="flex gap-3">
                  {/* Icon */}
                  <div
                    className={cn(
                      "flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-background ring-2 ring-border",
                      config.color
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" />
                  </div>

                  {/* Content */}
                  <div className="flex-1 space-y-1 pb-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-0.5">
                        <p className="text-sm font-medium">{config.label}</p>
                        {log.actor && (
                          <p className="text-xs text-muted-foreground">
                            by {log.actor.name}
                          </p>
                        )}
                      </div>
                      <time
                        className="text-xs text-muted-foreground"
                        dateTime={log.timestamp}
                      >
                        {new Date(log.timestamp).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </time>
                    </div>

                    {/* Comment */}
                    {log.comment && (
                      <div className="mt-2 rounded-md bg-muted/50 p-2">
                        <p className="text-xs text-muted-foreground">
                          {log.comment}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
