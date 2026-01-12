"use client"

import * as React from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useMemo, useState } from "react"

import { DataTable } from "@/components/data-table/data-table"
import { DataTableToolbar } from "@/components/data-table/data-table-toolbar"
import { DataTableSkeleton } from "@/components/data-table/data-table-skeleton"
import { useDataTable } from "@/hooks/use-data-table"
import type { DataTableRowAction } from "@/types/data-table"
import { ExecutionTableActionBar } from "./execution-table-action-bar"
import { ExecutionTableToolbarActions } from "./execution-table-toolbar-actions"
import { getExecutionTableColumns, type ExecutionActivity } from "./execution-table-columns"
import useGetExecutions from "@/hooks/queries/executions/use-get-executions"
import type { PlanningActivity } from "../../planning/_components/planning-table-columns"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useUser, usePermissions } from "@/components/providers/session-provider"


interface ExecutionTableProps {
  initialData?: {
    data: PlanningActivity[]
    pagination?: {
      page: number
      limit: number
      total: number
      totalPages: number
    }
  }
  programs?: any[]
  getFacilityTypes?: (program?: string) => any[]
  facilityId: number
  reportingPeriodId?: number
}

function ExecutionTableComponent({
  initialData,
  programs = [],
  getFacilityTypes = () => [],
  facilityId,
  reportingPeriodId,
}: ExecutionTableProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [, setRowAction] = useState<DataTableRowAction<ExecutionActivity> | null>(null)

  // Get user context to determine admin access
  const user = useUser()
  const { hasPermission } = usePermissions()

  // Determine if user is admin (can access district filtering)
  // Based on the existing pattern, we'll check for admin role or specific permissions
  const isAdmin = user?.role === 'admin' || hasPermission('district_access') || hasPermission('admin_access')

  // Extract filter parameters from URL (mirroring planning)
  const currentPage = Number(searchParams.get('page')) || 1
  const pageSize = Number(searchParams.get('perPage')) || 10
  const facilityNameFilter = searchParams.get('facilityName') || ''
  const facilityTypeFilter = searchParams.get('facilityType') || ''
  const projectTypeFilter = searchParams.get('projectType') || ''
  // Back-compat with existing toolbar which uses "program"
  const programParamFallback = searchParams.get('program') || ''
  const search = searchParams.get('search') || ''
  const districtFilter = searchParams.get('districtId') || ''

  const columns = useMemo(
    () => getExecutionTableColumns({ setRowAction, router, isAdmin }),
    [setRowAction, router, isAdmin]
  )

  // Build filter object for the API call
  const filters = useMemo(() => {
    const filterObj: Record<string, any> = {}

    if (facilityNameFilter) {
      filterObj.facilityName = facilityNameFilter
    }

    if (facilityTypeFilter) {
      filterObj.facilityType = facilityTypeFilter
    }

    const effectiveProjectType = projectTypeFilter || programParamFallback
    if (effectiveProjectType) {
      filterObj.projectType = effectiveProjectType
    }

    if (districtFilter) {
      filterObj.districtId = districtFilter
    }

    return filterObj
  }, [facilityNameFilter, facilityTypeFilter, projectTypeFilter, programParamFallback, districtFilter])

  const { data, isLoading, error } = useGetExecutions({
    page: currentPage,
    limit: pageSize,
    search,
    reportingPeriodId,
    ...filters,
  } as any)

  const executions = (data as any)?.data ?? (initialData?.data as any) ?? []
  const pageCount = (data as any)?.pagination?.totalPages ?? initialData?.pagination?.totalPages ?? 1

  const { table } = useDataTable({
    data: executions,
    columns,
    pageCount,
    enableAdvancedFilter: false,
    initialState: {
      sorting: [{ id: "createdAt", desc: true }],
      columnPinning: { right: ["actions"] },
      pagination: {
        pageIndex: currentPage - 1,
        pageSize: pageSize
      },
    },
    getRowId: (originalRow) => String((originalRow as ExecutionActivity).id),
    shallow: true,
    clearOnDefault: true,
    history: "push",
  })

  if (isLoading) {
    return (
      <DataTableSkeleton
        columnCount={8}
        rowCount={10}
        filterCount={3}
        cellWidths={["50px", "200px", "150px", "180px", "120px", "120px", "120px", "80px"]}
        withViewOptions={false}
        withPagination={true}
        shrinkZero={false}
      />
    )
  }

  if (error) {
    console.error("Error loading execution records:", error)
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error Loading Execution Records</AlertTitle>
        <AlertDescription>
          <div className="space-y-2">
            <p>{(error as any)?.message || 'Failed to load execution records. Please try again.'}</p>
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
    )
  }

  // Show active filters for admin users
  const activeFilters = []
  if (isAdmin && districtFilter) {
    activeFilters.push(`District: ${districtFilter}`)
  }
  if (facilityTypeFilter) {
    activeFilters.push(`Facility Type: ${facilityTypeFilter}`)
  }
  if (projectTypeFilter || programParamFallback) {
    activeFilters.push(`Project Type: ${projectTypeFilter || programParamFallback}`)
  }

  return (
    <div className="space-y-4">
      {/* Active Filters Indicator */}
      {activeFilters.length > 0 && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>Active filters:</span>
          {activeFilters.map((filter, index) => (
            <span key={index} className="bg-muted px-2 py-1 rounded-md">
              {filter}
            </span>
          ))}
        </div>
      )}

      <DataTable
        table={table}
        actionBar={<ExecutionTableActionBar table={table} />}>
        <DataTableToolbar table={table}>
          <ExecutionTableToolbarActions
            table={table}
            programs={programs}
            getFacilityTypes={getFacilityTypes}
            facilityId={facilityId}
            isAdmin={isAdmin}
          />
        </DataTableToolbar>
      </DataTable>
    </div>
  )
}

export const ExecutionTable = React.memo(ExecutionTableComponent);

