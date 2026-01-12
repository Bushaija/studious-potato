"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, FileText, Building2, FolderOpen, CheckCircle, User } from "lucide-react";
import { ApprovalStatusBadge } from "./approval-status-badge";

interface DgReviewCardProps {
  report: {
    id: number;
    reportCode: string;
    title: string;
    status: any;
    fiscalYear: string;
    submittedAt: string | null;
    dafApprovedAt: string | null;
    facility?: {
      name: string;
      facilityType?: string;
      district?: {
        name: string;
      };
    };
    project?: {
      name: string;
    };
    submitter?: {
      name: string;
    };
    dafApprover?: {
      name: string;
    };
  };
  onClick?: () => void;
}

export function DgReviewCard({ report, onClick }: DgReviewCardProps) {
  return (
    <Card
      className="cursor-pointer transition-all hover:shadow-md hover:border-primary/50"
      onClick={onClick}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1 flex-1">
            <CardTitle className="text-base font-semibold">
              {report.reportCode}
            </CardTitle>
            <p className="text-sm text-muted-foreground line-clamp-1">
              {report.title}
            </p>
          </div>
          <ApprovalStatusBadge status={report.status} />
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        <div className="space-y-2">
          {/* Facility Information with Hierarchy Context */}
          {report.facility && (
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="text-sm font-medium truncate">
                  {report.facility.name}
                </span>
              </div>
              <div className="flex items-center gap-2 ml-6">
                {report.facility.facilityType && (
                  <Badge variant="outline" className="text-xs">
                    {report.facility.facilityType === 'health_center' ? 'Health Center' : 'Hospital'}
                  </Badge>
                )}
                {report.facility.district && (
                  <span className="text-xs text-muted-foreground">
                    {report.facility.district.name}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* DAF Approval Information */}
          {report.dafApprovedAt && (
            <div className="rounded-lg border bg-green-50 dark:bg-green-950/20 p-2">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-green-900 dark:text-green-100">
                    DAF Approved
                  </p>
                  <div className="flex items-center gap-2 text-xs text-green-700 dark:text-green-300">
                    {report.dafApprover && (
                      <>
                        <User className="h-3 w-3" />
                        <span className="truncate">{report.dafApprover.name}</span>
                        <span>•</span>
                      </>
                    )}
                    <span>
                      {new Date(report.dafApprovedAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Additional Details */}
          <div className="grid grid-cols-2 gap-2 text-sm pt-1">
            {report.project && (
              <div className="flex items-center gap-2">
                <FolderOpen className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="text-muted-foreground truncate text-xs">
                  {report.project.name}
                </span>
              </div>
            )}

            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-muted-foreground text-xs">FY {report.fiscalYear}</span>
            </div>

            {report.submitter && (
              <div className="flex items-center gap-2 col-span-2">
                <span className="text-xs text-muted-foreground">
                  Submitted by {report.submitter.name}
                </span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
