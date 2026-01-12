"use client";

import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import { Download, FileText, Send, Loader2, Filter } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import type { Table } from "@tanstack/react-table";
import type { PlanningActivity } from "./planning-table-columns";
import type { CreatePlanArgs } from "@/types/facility";
import { useGetCurrentReportingPeriod } from "@/hooks/queries";
import { useUser } from "@/components/providers/session-provider";
import { useApprovalErrorHandler } from "@/hooks/use-approval-error-handler";
import { submitForApproval } from "@/api-client/planning-approval";
import { useGetDistricts } from "@/hooks/queries/districts/use-get-districts";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

const FacilityFilterDialog = dynamic(
  () => import("@/features/shared/facility-filter-dialog2").then((mod) => ({ default: mod.FacilityFilterDialog })),
  { ssr: false }
);

interface PlanningTableToolbarActionsProps {
  table: Table<PlanningActivity>;
  programs: any[];
  getFacilityTypes: (program?: string) => any[];
  facilityId: number | undefined;
  onRefresh?: () => void;
  isAdmin?: boolean;
}

export function PlanningTableToolbarActions({ 
  table, 
  programs, 
  getFacilityTypes,
  facilityId,
  onRefresh,
  isAdmin = false,
}: PlanningTableToolbarActionsProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const user = useUser();
  const { handleError, handleSuccess } = useApprovalErrorHandler();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { data: currentReportingPeriod } = useGetCurrentReportingPeriod();
  
  // Get current district filter from URL
  const currentDistrictFilter = searchParams.get('districtId') || '';
  
  // Fetch districts for admin users
  const { data: districts } = useGetDistricts({});
  
  // Get selected rows and filter for DRAFT status
  const selectedRows = table.getFilteredSelectedRowModel().rows;
  const selectedDraftPlans = selectedRows.filter(
    (row) => row.original.approvalStatus === "DRAFT"
  );
  
  const canSubmit = user?.role === "accountant" && selectedDraftPlans.length > 0;

  const handleCreatePlan = (args: CreatePlanArgs) => {
    // Navigate to create page with the selected parameters
    const searchParams = new URLSearchParams({
      projectType: args.projectId || "",
      facilityId: String(args.facilityId),
      facilityType: args.facilityType,
      facilityName: args.facilityName || "",
      program: args.program || "",
      // Use the reportingPeriodId from args (selected in dialog), fallback to current
      reportingPeriodId: args.reportingPeriodId?.toString() || currentReportingPeriod?.id.toString() || "1",
    });

    router.push(`/dashboard/planning/new?${searchParams.toString()}`);
    setDialogOpen(false);
  };

  const handleExportAll = () => {
    // TODO: Implement export all functionality
    console.log("Export all planning activities");
  };

  const handleGenerateReport = () => {
    // TODO: Implement report generation
    console.log("Generate comprehensive report");
  };
  
  const handleSubmitForApproval = async () => {
    if (selectedDraftPlans.length === 0) {
      handleError(new Error("No draft plans selected"), "submit plans");
      return;
    }

    try {
      setIsSubmitting(true);
      const planningIds = selectedDraftPlans.map((row) => row.original.id);
      
      const result = await submitForApproval(planningIds);
      
      // Show success message
      handleSuccess(
        "Success",
        `${result.updatedCount} plan(s) submitted for approval`
      );
      
      // Reset row selection
      table.resetRowSelection();
      
      // Refresh table data
      if (onRefresh) {
        onRefresh();
      }
    } catch (error) {
      // Use centralized error handler with context
      handleError(error, "submit plans for approval");
    } finally {
      setIsSubmitting(false);
    }
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
        <div className="flex items-center gap-2">
          <Label htmlFor="district-filter" className="text-sm font-medium">
            District:
          </Label>
          <Select
            value={currentDistrictFilter || 'all'}
            onValueChange={handleDistrictFilterChange}
          >
            <SelectTrigger className="w-[180px] h-8">
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
      
      {/* Hide New Plan button for DAF users */}
      {user?.role !== 'daf' && (
        <FacilityFilterDialog
          label="New Plan"
          mode="planning"
          programs={programs}
          getFacilityTypes={getFacilityTypes}
          onCreate={handleCreatePlan}
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          facilityId={facilityId}
        />
      )}
      
      {canSubmit && (
        <Button
          variant="default"
          size="sm"
          onClick={handleSubmitForApproval}
          disabled={isSubmitting}
          className="h-8"
          aria-label={`Submit ${selectedDraftPlans.length} plan(s) for approval`}
        >
          {isSubmitting ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Send className="mr-2 h-4 w-4" />
          )}
          {isSubmitting 
            ? "Submitting..." 
            : `Submit for Approval (${selectedDraftPlans.length})`}
        </Button>
      )}

      <Button
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
      </Button>
    </div>
  );
}