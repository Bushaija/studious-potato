"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, FileText, Building2, FolderOpen } from "lucide-react";
import { ApprovalStatusBadge } from "./approval-status-badge";

interface DafReviewCardProps {
  report: {
    id: number;
    reportCode: string;
    title: string;
    status: any;
    fiscalYear: string;
    submittedAt: string | null;
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
  };
  onClick?: () => void;
}

export function DafReviewCard({ report, onClick }: DafReviewCardProps) {
  return (
    <Card
      className="max-w-[450px] cursor-pointer transition-all hover:shadow-md hover:border-primary/50"
      onClick={onClick}
    >
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1 flex-1">
            <CardTitle className="text-sm font-semibold">
              {report.reportCode}
            </CardTitle>
            <p className="text-sm text-muted-foreground line-clamp-1">
              {report.project?.name}
            </p>
          </div>
          <ApprovalStatusBadge status={report.status} />
        </div>
      </CardHeader>

      <CardContent className="space-y-0">
        <div className="space-y-0">
          {/* Facility Information with Hierarchy Context */}
          {report.facility && (
            <div className="space-y-1 flex gap-2">
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
                  <span className="text-xs text-muted-foreground capitalize">
                    {report.facility.district.name}{" district"}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Submitter Information */}
          {report.submitter && (
            <div className="flex items-center gap-2 text-sm capitalize text-muted-foreground">
              <span>Submitted by {report.submitter.name}</span>
            </div>
          )}

          {/* Additional Details */}
          <div className="flex gap-2 text-sm pt-2">
            {/* {report.project && (
              <div className="flex items-center gap-2">
                <FolderOpen className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="text-muted-foreground truncate text-xs">
                  {report.project.name}
                </span>
              </div>
            )} */}

            <div className="flex items-center gap-2">
              {/* <Calendar className="h-4 w-4 text-muted-foreground shrink-0" /> */}
              {/* <span className="text-muted-foreground text-xs">FY {report.fiscalYear}</span> */}
            </div>

            {report.submittedAt && (
              <div className="flex items-center gap-2 col-span-2">
                {/* <FileText className="h-4 w-4 text-muted-foreground shrink-0" /> */}
                <span className="text-muted-foreground text-sm">
                  {new Date(report.submittedAt).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric'
                  })}
                </span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
