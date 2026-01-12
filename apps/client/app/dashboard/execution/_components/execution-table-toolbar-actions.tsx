"use client"

import dynamic from "next/dynamic"
import * as React from "react"
import type { Table } from "@tanstack/react-table"
import type { ExecutionActivity } from "./execution-table-columns"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Download, FileText, Filter } from "lucide-react"
import { useUser } from "@/components/providers/session-provider"
import type { CreateExecutionArgs } from "@/types/facility";
import { useGetCurrentReportingPeriod } from "@/hooks/queries/reporting-period/use-get-current-reporting-period"
import { useGetDistricts } from "@/hooks/queries/districts/use-get-districts"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"

// Lazy load the filter dialog
const FacilityFilterDialog = dynamic(
  () => import("@/features/shared/facility-filter-dialog2").then((mod) => ({ default: mod.FacilityFilterDialog })),
  { ssr: false }
)

interface ExecutionTableToolbarActionsProps {
  table: Table<ExecutionActivity>;
  programs: any[];
  getFacilityTypes: (program?: string) => any[];
  facilityId: number;
  quarter?: string;
  isAdmin?: boolean;
}

export function ExecutionTableToolbarActions({ 
  table, 
  programs, 
  getFacilityTypes,
  facilityId,
  isAdmin = false,
}: ExecutionTableToolbarActionsProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const user = useUser();
  const isAccountant = (user as any)?.role === 'accountant';
  const isDaf = (user as any)?.role === 'daf';
  const { data: currentReportingPeriod } = useGetCurrentReportingPeriod();
  
  // Get current district filter from URL
  const currentDistrictFilter = searchParams.get('districtId') || '';
  
  // Fetch districts for admin users (we'll need to determine the province)
  // For now, let's fetch all districts (this might need to be adjusted based on user's province)
  const { data: districts } = useGetDistricts({ 
    // If we need to filter by province, we can add provinceId here
    // provinceId: user?.provinceId 
  });
  const handleCreateExecution = (args: CreateExecutionArgs) => {
    // Navigate to create page with the selected parameters
    const searchParams = new URLSearchParams({
      projectId: args.projectId || '',
      facilityId: args.facilityId,
      facilityType: args.facilityType,
      facilityName: args.facilityName || '',
      program: args.program || '',
      // Use the reportingPeriodId from args (selected in dialog), fallback to current
      reportingPeriodId: args.reportingPeriodId?.toString() || currentReportingPeriod?.id?.toString() || '',
      quarter: args.quarter || 'Q1'
    });
    
    router.push(`/dashboard/execution/new?${searchParams.toString()}`);
    setDialogOpen(false);
  };

  const handleExportAll = () => {
    // TODO: Implement export all functionality
    console.log("Export all executioon activities");
  };

  const handleGenerateReport = () => {
    // TODO: Implement report generation
    console.log("Generate comprehensive report");
  };

  const handleDistrictFilterChange = (districtId: string) => {
    const params = new URLSearchParams(searchParams.toString());
    
    if (districtId && districtId !== 'all') {
      params.set('districtId', districtId);
    } else {
      params.delete('districtId');
    }
    
    // Reset to first page when filter changes
    params.set('page', '1');
    
    router.push(`?${params.toString()}`);
  };

  return (
    <div className="flex items-center gap-2">
      {/* District Filter - Only show for admin users */}
      {isAdmin && (
        <div className="flex items-center gap-2 h-2">
          {/* <Label htmlFor="district-filter" className="text-sm font-medium">
            District:
          </Label> */}
          <Select
            value={currentDistrictFilter || 'all'}
            onValueChange={handleDistrictFilterChange}
          >
            <SelectTrigger className="w-[120px] h-2">
              <SelectValue placeholder="All Districts" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Districts</SelectItem>
              {districts?.map((district) => (
                <SelectItem key={district.id} value={district.id.toString()}>
                  {district.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
      
      {/* Hide New Execution button for DAF users */}
      {isAccountant && !isDaf ? (
        <FacilityFilterDialog
          label="New Execution"
          mode="execution"
          programs={programs}
          getFacilityTypes={getFacilityTypes}
          onCreate={handleCreateExecution}
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          facilityId={facilityId}
        />
      ) : (
       <div />
      )}
      
      {/* <Button
        onClick={handleExportAll}
        variant="outline"
        size="sm"
        className="h-8"
      >
        <Download className="mr-2 h-4 w-4" />
        Export All
      </Button>
      
      <Button
        onClick={handleGenerateReport}
        variant="outline"
        size="sm"
        className="h-8"
      >
        <FileText className="mr-2 h-4 w-4" />
        Generate Report
      </Button> */}
    </div>
  );
}

