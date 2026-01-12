"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { DataTable } from "@/components/data-table/data-table";
import { DataTableToolbar } from "@/components/data-table/data-table-toolbar";
import { DataTableSkeleton } from "@/components/data-table/data-table-skeleton";
import { useDataTable } from "@/hooks/use-data-table";
import type { DataTableRowAction } from "@/types/data-table";
import { PlanningTableActionBar } from "./planning-table-action-bar";
import { PlanningTableToolbarActions } from "./planning-table-toolbar-actions";
import { getPlanningTableColumns, type PlanningActivity } from "./planning-table-columns";
import useGetPlanningActivities from "@/hooks/queries/planning/use-get-planning-activities";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useUser, usePermissions } from "@/components/providers/session-provider";

interface PlanningTableProps {
  initialData?: {
    data: PlanningActivity[];
    pagination?: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
  programs?: any[];
  getFacilityTypes?: (program?: string) => any[];
  facilityId: number | undefined;
  reportingPeriodId?: number;
}

function PlanningTableComponent({ 
  initialData, 
  programs = [], 
  getFacilityTypes = () => [],
  facilityId,
  reportingPeriodId,
}: PlanningTableProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [rowAction, setRowAction] = React.useState<DataTableRowAction<PlanningActivity> | null>(null);
  
  // Get user context to determine admin access
  const user = useUser();
  const { hasPermission } = usePermissions();
  
  // Determine if user is admin (can access district filtering)
  const isAdmin = user?.role === 'admin' || hasPermission('district_access') || hasPermission('admin_access');

  // Extract filter parameters from URL
  const currentPage = Number(searchParams.get('page')) || 1;
  const pageSize = Number(searchParams.get('perPage')) || 10;
  const facilityNameFilter = searchParams.get('facilityName') || '';
  const facilityTypeFilter = searchParams.get('facilityType') || '';
  const projectTypeFilter = searchParams.get('projectType') || '';
  const search = searchParams.get('search') || '';
  const districtFilter = searchParams.get('districtId') || '';

  // Refresh function to refetch data
  const handleRefresh = React.useCallback(() => {
    // The useGetPlanningActivities hook will automatically refetch when we trigger a refresh
    window.location.reload();
  }, []);

  const columns = React.useMemo(
    () => getPlanningTableColumns({ setRowAction, router, onRefresh: handleRefresh, isAdmin }),
    [setRowAction, router, handleRefresh, isAdmin]
  );

  // Build filter object for the API call
  const filters = React.useMemo(() => {
    const filterObj: Record<string, any> = {};
    
    if (facilityNameFilter) {
      filterObj.facilityName = facilityNameFilter;
    }
    
    if (facilityTypeFilter) {
      filterObj.facilityType = facilityTypeFilter;
    }
    
    if (projectTypeFilter) {
      filterObj.projectType = projectTypeFilter;
    }
    
    if (districtFilter) {
      filterObj.districtId = districtFilter;
    }
    
    return filterObj;
  }, [facilityNameFilter, facilityTypeFilter, projectTypeFilter, districtFilter]);

  // Use the hook to get planning activities data with pagination and filters
  const { data, isLoading, error } = useGetPlanningActivities({
    page: currentPage,
    limit: pageSize,
    search,
    reportingPeriodId,
    ...filters,
  });

  const planningActivities = data?.data || initialData?.data || [];
  const pageCount = data?.pagination?.totalPages || initialData?.pagination?.totalPages || 1;

  const { table, shallow, debounceMs, throttleMs } = useDataTable({
    data: planningActivities,
    columns,
    pageCount: pageCount,
    enableAdvancedFilter: false,
    initialState: {
      sorting: [{ id: "createdAt", desc: true }],
      columnPinning: { right: ["actions"] },
      pagination: { 
        pageIndex: currentPage - 1,
        pageSize: pageSize 
      },
    },
    getRowId: (originalRow) => originalRow.id.toString(),
    shallow: true,
    clearOnDefault: true,
    history: "push",
  });

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
    );
  }

  if (error) {
    console.error("Error loading planning activities:", error);
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error Loading Planning Activities</AlertTitle>
        <AlertDescription>
          <div className="space-y-2">
            <p>{error.message || 'Failed to load planning activities. Please try again.'}</p>
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
    );
  }

  // Show active filters for admin users
  const activeFilters = [];
  if (isAdmin && districtFilter) {
    activeFilters.push(`District: ${districtFilter}`);
  }
  if (facilityTypeFilter) {
    activeFilters.push(`Facility Type: ${facilityTypeFilter}`);
  }
  if (projectTypeFilter) {
    activeFilters.push(`Project Type: ${projectTypeFilter}`);
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
        actionBar={<PlanningTableActionBar table={table} />}
      >
        <DataTableToolbar table={table}>
          <PlanningTableToolbarActions 
            table={table} 
            programs={programs}
            getFacilityTypes={getFacilityTypes}
            facilityId={facilityId}
            onRefresh={handleRefresh}
            isAdmin={isAdmin}
          />
        </DataTableToolbar>
      </DataTable>
    </div>
  );
}

const MemoizedPlanningTable = React.memo(PlanningTableComponent);
export { MemoizedPlanningTable as PlanningTable };