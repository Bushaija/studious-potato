"use client"

import dynamic from "next/dynamic"
import * as React from "react"
import { useGetFacilityById, useGetProjects, useGetCurrentReportingPeriod, useGetReportingPeriods } from "@/hooks/queries"
import { useMemo, useState, useCallback } from "react"
import { useUser, usePermissions } from "@/components/providers/session-provider"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { DataTableSkeleton } from "@/components/data-table/data-table-skeleton"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"

// Lazy load the heavy table component
const ExecutionTable = dynamic(
  () => import("./_components/execution-table").then((mod) => ({ default: mod.ExecutionTable })),
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
)

export default function DynamicExecutionPage() {
  const user = useUser()
  const { hasPermission } = usePermissions()
  const canAccessPreviousFiscalYear = hasPermission('access_previous_fiscal_year_data')
  const { data: facilityData } = useGetFacilityById(user?.facilityId, Boolean(user?.facilityId));
  const facilityId: number | undefined = user?.facilityId;

  // Fiscal year switcher state
  const [showPreviousFiscalYear, setShowPreviousFiscalYear] = useState(false)

  // Fetch current and all reporting periods
  const { data: currentReportingPeriod } = useGetCurrentReportingPeriod()
  const { data: allReportingPeriods } = useGetReportingPeriods()

  // Determine which reporting period to use
  const selectedReportingPeriodId = useMemo(() => {
    if (!showPreviousFiscalYear) {
      return currentReportingPeriod?.id
    }

    // Find previous fiscal year (year before current)
    const periodsData = (allReportingPeriods as any)?.data || allReportingPeriods
    const periods = Array.isArray(periodsData) ? periodsData : []
    const currentYear = currentReportingPeriod?.year

    if (currentYear && periods.length > 0) {
      const previousPeriod = periods.find((p: any) => p.year === currentYear - 1)
      return previousPeriod?.id
    }

    return currentReportingPeriod?.id
  }, [showPreviousFiscalYear, currentReportingPeriod, allReportingPeriods])

  const { data: projectsData, isLoading: isLoadingProjects } = useGetProjects()

  const programs = useMemo(() => {
    const pd: any = projectsData as any;
    const items = Array.isArray(pd?.data) ? pd.data : Array.isArray(pd) ? pd : [];

    return items.map((p: any) => ({
      id: String(p.id),
      name: String(p.projectType),
      projectType: String(p.projectType),
    }));
  }, [projectsData]);

  const getFacilityTypes = useCallback((program?: string) => {
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
              <Skeleton className="h-7 w-48" />
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

  if (!programs.length) {
    return (
      <div className="container mx-auto p-4 md:p-8 h-full">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>No Programs Available</AlertTitle>
          <AlertDescription>
            Please ensure projects are properly configured.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const currentFiscalYear = currentReportingPeriod?.year
  const previousFiscalYear = currentFiscalYear ? currentFiscalYear - 1 : null

  return (
    <div className="container">
      <div className="flex flex-col space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-xl font-semibold">Execution Records</h1>
            <p className="text-sm text-muted-foreground">
              Manage and monitor execution activities across facilities
              {showPreviousFiscalYear && previousFiscalYear && (
                <span className="ml-2 font-medium text-primary">
                  (Fiscal Year {previousFiscalYear})
                </span>
              )}
              {!showPreviousFiscalYear && currentFiscalYear && (
                <span className="ml-2 font-medium text-primary">
                  (Fiscal Year {currentFiscalYear})
                </span>
              )}
            </p>
          </div>

          {canAccessPreviousFiscalYear && (
            <div className="flex items-center space-x-2">
              <Switch
                id="fiscal-year-execution-toggle"
                checked={showPreviousFiscalYear}
                onCheckedChange={setShowPreviousFiscalYear}
                disabled={!previousFiscalYear}
              />
              <Label htmlFor="fiscal-year-execution-toggle" className="cursor-pointer">
                {previousFiscalYear ? `Show FY ${previousFiscalYear}` : 'Previous Fiscal Year'}
              </Label>
            </div>
          )}
        </div>

        <ExecutionTable
          programs={programs}
          getFacilityTypes={getFacilityTypes}
          facilityId={facilityId ?? 0}
          reportingPeriodId={selectedReportingPeriodId}
        />
      </div>
    </div>
  )
}
