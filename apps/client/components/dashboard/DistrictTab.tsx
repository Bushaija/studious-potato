"use client";

import { useEffect } from "react";
import { DashboardFilters } from "./DashboardFilters";
import { BudgetSummaryCards } from "./BudgetSummaryCards";
import { ProgramDistributionChart } from "./ProgramDistributionChart";
import { BudgetBarChart } from "./BudgetBarChart";
import { DistrictApprovalTable } from "./DistrictApprovalTable";
import {
  MetricsCardsSkeleton,
  ChartSkeleton,
  TableSkeleton,
} from "./DashboardSkeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { parseDashboardError, logDashboardError } from "@/lib/dashboard-errors";
import type { DashboardAccessRights } from "@/lib/dashboard-access-control";

interface DistrictTabProps {
  // Filter state
  districtId?: string;
  projectType?: string;
  quarter?: string;

  // Filter options
  districts: Array<{ id: number; name: string }>;
  programs: Array<{ id: number; name: string }>;

  // Filter handlers
  onDistrictChange: (value: string) => void;
  onProjectTypeChange: (value: string) => void;
  onQuarterChange: (value: string) => void;
  onClearFilters: () => void;

  // Data
  metricsData?: {
    totalAllocated: number;
    totalSpent: number;
    remaining: number;
    utilizationPercentage: number;
  };
  programDistributionData?: Array<{
    programId: number;
    programName: string;
    allocatedBudget: number;
    percentage: number;
  }>;
  budgetByFacilityData?: Array<{
    facilityId: number;
    facilityName: string;
    facilityType: string;
    allocatedBudget: number;
    spentBudget: number;
    utilizationPercentage: number;
  }>;
  districtApprovalsData?: Array<{
    facilityId: number;
    facilityName: string;
    projectId: number;
    projectName: string;
    projectCode: string;
    allocatedBudget: number;
    approvalStatus: 'APPROVED' | 'PENDING' | 'REJECTED';
    approvedBy: string | null;
    approvedAt: string | null;
    quarter: number | null;
  }>;

  // Loading states
  isLoadingMetrics?: boolean;
  isLoadingProgramDistribution?: boolean;
  isLoadingBudgetByFacility?: boolean;
  isLoadingDistrictApprovals?: boolean;

  // Error states
  metricsError?: Error | null;
  programDistributionError?: Error | null;
  budgetByFacilityError?: Error | null;
  districtApprovalsError?: Error | null;

  // Actions
  onRetryMetrics?: () => void;
  onRetryProgramDistribution?: () => void;
  onRetryBudgetByFacility?: () => void;
  onRetryDistrictApprovals?: () => void;

  // Access control
  accessRights: DashboardAccessRights;
}

export function DistrictTab({
  districtId,
  projectType,
  quarter,
  districts,
  programs,
  onDistrictChange,
  onProjectTypeChange,
  onQuarterChange,
  onClearFilters,
  metricsData,
  programDistributionData,
  budgetByFacilityData,
  districtApprovalsData,
  isLoadingMetrics,
  isLoadingProgramDistribution,
  isLoadingBudgetByFacility,
  isLoadingDistrictApprovals,
  metricsError,
  programDistributionError,
  budgetByFacilityError,
  districtApprovalsError,
  onRetryMetrics,
  onRetryProgramDistribution,
  onRetryBudgetByFacility,
  onRetryDistrictApprovals,
  accessRights,
}: DistrictTabProps) {
  // Log errors when they occur
  useEffect(() => {
    if (metricsError) {
      logDashboardError(parseDashboardError(metricsError), {
        component: "DistrictTab",
        action: "fetchMetrics",
        params: { districtId, projectType, quarter },
      });
    }
    if (programDistributionError) {
      logDashboardError(parseDashboardError(programDistributionError), {
        component: "DistrictTab",
        action: "fetchProgramDistribution",
        params: { districtId, quarter },
      });
    }
    if (budgetByFacilityError) {
      logDashboardError(parseDashboardError(budgetByFacilityError), {
        component: "DistrictTab",
        action: "fetchBudgetByFacility",
        params: { districtId, projectType, quarter },
      });
    }
    if (districtApprovalsError) {
      logDashboardError(parseDashboardError(districtApprovalsError), {
        component: "DistrictTab",
        action: "fetchDistrictApprovals",
        params: { districtId, projectType, quarter },
      });
    }
  }, [
    metricsError,
    programDistributionError,
    budgetByFacilityError,
    districtApprovalsError,
    districtId,
    projectType,
    quarter,
  ]);

  const ErrorAlert = ({
    error,
    onRetry,
  }: {
    error: Error;
    onRetry?: () => void;
  }) => {
    const parsedError = parseDashboardError(error);
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription className="flex items-center justify-between gap-4">
          <span>{parsedError.message}</span>
          {onRetry && (
            <Button variant="outline" size="sm" onClick={onRetry}>
              Retry
            </Button>
          )}
        </AlertDescription>
      </Alert>
    );
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <DashboardFilters
        activeTab="district"
        districtId={districtId}
        districts={districts}
        onDistrictChange={onDistrictChange}
        disableDistrictFilter={!accessRights.canFilterByAnyDistrict}
        projectType={projectType}
        programs={programs}
        onProjectTypeChange={onProjectTypeChange}
        quarter={quarter}
        onQuarterChange={onQuarterChange}
        onClearFilters={onClearFilters}
      />

      {/* Summary Metrics Cards */}
      {isLoadingMetrics ? (
        <MetricsCardsSkeleton />
      ) : metricsError ? (
        <ErrorAlert error={metricsError} onRetry={onRetryMetrics} />
      ) : metricsData ? (
        <BudgetSummaryCards
          budgetSummary={{
            totalAllocated: metricsData.totalAllocated,
            totalSpent: metricsData.totalSpent,
            totalRemaining: metricsData.remaining,
            utilizationPercentage: metricsData.utilizationPercentage,
          }}
        />
      ) : null}

      {/* Charts - Pie Chart and Bar Chart side by side */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Program Distribution Pie Chart */}
        {accessRights.canViewDistrictLevelCharts && (
          <div className="h-full">
            {isLoadingProgramDistribution ? (
              <ChartSkeleton />
            ) : programDistributionError ? (
              <ErrorAlert
                error={programDistributionError}
                onRetry={onRetryProgramDistribution}
              />
            ) : (
              <ProgramDistributionChart
                data={programDistributionData || []}
              />
            )}
          </div>
        )}

        {/* Budget by Facility Bar Chart */}
        {accessRights.canViewBudgetByFacilityChart && (
          <div className="h-full">
            {isLoadingBudgetByFacility ? (
              <ChartSkeleton />
            ) : budgetByFacilityError ? (
              <ErrorAlert
                error={budgetByFacilityError}
                onRetry={onRetryBudgetByFacility}
              />
            ) : (
              <BudgetBarChart
                data={
                  budgetByFacilityData?.map((item) => ({
                    id: item.facilityId,
                    name: item.facilityName,
                    allocatedBudget: item.allocatedBudget,
                    spentBudget: item.spentBudget,
                    utilizationPercentage: item.utilizationPercentage,
                  })) || []
                }
                title="Budget by Facility"
                entityType="facility"
              />
            )}
          </div>
        )}
      </div>

      {/* District Approval Details Table */}
      {accessRights.canViewDistrictApprovalTable && (
        <>
          {isLoadingDistrictApprovals ? (
            <TableSkeleton />
          ) : districtApprovalsError ? (
            <ErrorAlert
              error={districtApprovalsError}
              onRetry={onRetryDistrictApprovals}
            />
          ) : (
            <DistrictApprovalTable
              data={districtApprovalsData || []}
            />
          )}
        </>
      )}
    </div>
  );
}
