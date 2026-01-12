"use client";

import dynamic from "next/dynamic";
import { useUser, usePermissions } from "@/components/providers/session-provider";
import { useGetProjects, useGetCurrentReportingPeriod, useGetReportingPeriods } from "@/hooks/queries";
import React, { useMemo, useState } from "react";
import { useGetFacilityById } from "@/hooks/queries/facilities/use-get-facility-by-id";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { DataTableSkeleton } from "@/components/data-table/data-table-skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

const PlanningTable = dynamic(
  () => import("./_components/planning-table").then((mod) => ({ default: mod.PlanningTable })),
  {
    loading: () => (
      <DataTableSkeleton
        columnCount={8}
        rowCount={10}
        filterCount={3}
        withPagination={true}
      />
    ),
  }
);

export default function PlanningPage() {
  const user = useUser()
  const { hasPermission } = usePermissions()
  const canAccessPreviousFiscalYear = hasPermission('access_previous_fiscal_year_data')
  const { data: facilityData } = useGetFacilityById(user?.facilityId, Boolean(user?.facilityId));
  const facilityId: number | undefined = user?.facilityId;

  // Fiscal year switcher state
  const [showPreviousFiscalYear, setShowPreviousFiscalYear] = useState(false);

  // Fetch current and all reporting periods
  const { data: currentReportingPeriod } = useGetCurrentReportingPeriod();
  const { data: allReportingPeriods } = useGetReportingPeriods();

  // Determine which reporting period to use
  const selectedReportingPeriodId = useMemo(() => {
    if (!showPreviousFiscalYear) {
      return currentReportingPeriod?.id;
    }

    // Find previous fiscal year (year before current)
    // Handle both array and object with data property
    const periodsData = (allReportingPeriods as any)?.data || allReportingPeriods;
    const periods = Array.isArray(periodsData) ? periodsData : [];
    const currentYear = currentReportingPeriod?.year;

    if (currentYear && periods.length > 0) {
      const previousPeriod = periods.find((p: any) => p.year === currentYear - 1);
      return previousPeriod?.id;
    }

    return currentReportingPeriod?.id;
  }, [showPreviousFiscalYear, currentReportingPeriod, allReportingPeriods]);

  // Only fetch projects for program list
  const { data: projectsData, isLoading: isLoadingProjects, error: projectsError } = useGetProjects();

  const programs = useMemo(() => {
    const pd: any = projectsData as any;
    const items = Array.isArray(pd?.data) ? pd.data : Array.isArray(pd) ? pd : [];

    return items.map((p: any) => ({
      id: String(p.id),
      name: String(p.projectType),
      projectType: String(p.projectType),
    }));
  }, [projectsData]);


  // Enhanced getFacilityTypes function - memoized callback
  const getFacilityTypes = React.useCallback((program?: string) => {
    const programObj = programs.find((p: any) => p.id === program);
    const projectType = programObj?.projectType;

    if (projectType === "TB") {
      return [{ id: "hospital", label: "Hospital" }];
    }

    return [
      { id: "hospital", label: "Hospital" },
      { id: "health_center", label: "Health Center" },
    ];
  }, [programs]);

  if (isLoadingProjects) {
    return (
      <div className="container mx-auto p-4 md:p-8 h-full">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <Skeleton className="h-8 w-64" />
              <Skeleton className="h-4 w-96" />
            </div>
          </div>
          <DataTableSkeleton
            columnCount={8}
            rowCount={10}
            filterCount={3}
            withPagination={true}
          />
        </div>
      </div>
    );
  }

  if (projectsError) {
    return (
      <div className="container mx-auto p-4 md:p-8 h-full">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error Loading Projects</AlertTitle>
          <AlertDescription>
            <div className="space-y-2">
              <p>{projectsError.message || 'Failed to load projects. Please try again.'}</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.location.reload()}
              >
                Retry
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!programs.length) {
    return (
      <div className="container mx-auto p-4 md:p-8 h-full">
        <div className="flex items-center justify-center py-8">
          <div className="text-center">
            <p className="text-muted-foreground">No programs available</p>
            <p className="text-sm text-muted-foreground mt-1">
              Please ensure projects are properly configured.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const currentFiscalYear = currentReportingPeriod?.year;
  const previousFiscalYear = currentFiscalYear ? currentFiscalYear - 1 : null;

  return (
    <div className="container">
      <div className="fex flex-col space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold">Planning Activities</h1>
            <p className="text-sm text-muted-foreground">
              Manage and monitor planning activities across facilities
              {showPreviousFiscalYear && previousFiscalYear && (
                <span className="ml-2 text-sm font-medium text-primary">
                  (Fiscal Year {previousFiscalYear})
                </span>
              )}
              {!showPreviousFiscalYear && currentFiscalYear && (
                <span className="ml-2 text-sm font-medium text-primary">
                  (Fiscal Year {currentFiscalYear})
                </span>
              )}
            </p>
          </div>

          {canAccessPreviousFiscalYear && (
            <div className="flex items-center space-x-2">
              <Switch
                id="fiscal-year-toggle"
                checked={showPreviousFiscalYear}
                onCheckedChange={setShowPreviousFiscalYear}
                disabled={!previousFiscalYear}
              />
              <Label htmlFor="fiscal-year-toggle" className="cursor-pointer">
                {previousFiscalYear ? `Show FY ${previousFiscalYear}` : 'Previous Fiscal Year'}
              </Label>
            </div>
          )}
        </div>

        <PlanningTable
          programs={programs}
          getFacilityTypes={getFacilityTypes}
          facilityId={facilityId ?? 0}
          reportingPeriodId={selectedReportingPeriodId}
        />
      </div>
    </div>
  );
}