"use client";

import { useEffect } from "react";
import { DashboardFilters } from "./DashboardFilters";
import { BudgetSummaryCards } from "./BudgetSummaryCards";
import { ProgramDistributionChart } from "./ProgramDistributionChart";
import { BudgetBarChart } from "./BudgetBarChart";
import { ProvinceApprovalTable } from "./ProvinceApprovalTable";
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

interface ProvinceTabProps {
  // Filter state
  provinceId?: string;
  projectType?: string;
  quarter?: string;

  // Filter options
  provinces: Array<{ id: number; name: string }>;
  programs: Array<{ id: number; name: string }>;

  // Filter handlers
  onProvinceChange: (value: string) => void;
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
  budgetByDistrictData?: Array<{
    districtId: number;
    districtName: string;
    allocatedBudget: number;
    spentBudget: number;
    utilizationPercentage: number;
  }>;
  provinceApprovalsData?: Array<{
    districtId: number;
    districtName: string;
    allocatedBudget: number;
    approvedCount: number;
    rejectedCount: number;
    pendingCount: number;
    totalCount: number;
    approvalRate: number;
  }>;

  // Loading states
  isLoadingMetrics?: boolean;
  isLoadingProgramDistribution?: boolean;
  isLoadingBudgetByDistrict?: boolean;
  isLoadingProvinceApprovals?: boolean;

  // Error states
  metricsError?: Error | null;
  programDistributionError?: Error | null;
  budgetByDistrictError?: Error | null;
  provinceApprovalsError?: Error | null;

  // Actions
  onDistrictClick?: (districtId: number) => void;
  onRetryMetrics?: () => void;
  onRetryProgramDistribution?: () => void;
  onRetryBudgetByDistrict?: () => void;
  onRetryProvinceApprovals?: () => void;
  
  // Access control
  accessRights: DashboardAccessRights;
}

export function ProvinceTab({
  provinceId,
  projectType,
  quarter,
  provinces,
  programs,
  onProvinceChange,
  onProjectTypeChange,
  onQuarterChange,
  onClearFilters,
  metricsData,
  programDistributionData,
  budgetByDistrictData,
  provinceApprovalsData,
  isLoadingMetrics,
  isLoadingProgramDistribution,
  isLoadingBudgetByDistrict,
  isLoadingProvinceApprovals,
  metricsError,
  programDistributionError,
  budgetByDistrictError,
  provinceApprovalsError,
  onDistrictClick,
  onRetryMetrics,
  onRetryProgramDistribution,
  onRetryBudgetByDistrict,
  onRetryProvinceApprovals,
  accessRights,
}: ProvinceTabProps) {
  // Log errors when they occur
  useEffect(() => {
    if (metricsError) {
      logDashboardError(parseDashboardError(metricsError), {
        component: "ProvinceTab",
        action: "fetchMetrics",
        params: { provinceId, projectType, quarter },
      });
    }
    if (programDistributionError) {
      logDashboardError(parseDashboardError(programDistributionError), {
        component: "ProvinceTab",
        action: "fetchProgramDistribution",
        params: { provinceId, quarter },
      });
    }
    if (budgetByDistrictError) {
      logDashboardError(parseDashboardError(budgetByDistrictError), {
        component: "ProvinceTab",
        action: "fetchBudgetByDistrict",
        params: { provinceId, projectType, quarter },
      });
    }
    if (provinceApprovalsError) {
      logDashboardError(parseDashboardError(provinceApprovalsError), {
        component: "ProvinceTab",
        action: "fetchProvinceApprovals",
        params: { provinceId, projectType, quarter },
      });
    }
  }, [
    metricsError,
    programDistributionError,
    budgetByDistrictError,
    provinceApprovalsError,
    provinceId,
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
        activeTab="province"
        provinceId={provinceId}
        provinces={provinces}
        onProvinceChange={onProvinceChange}
        disableProvinceFilter={!accessRights.canFilterByAnyProvince}
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
        {accessRights.canViewProvinceLevelCharts && (
          <div>
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

        {/* Budget by District Bar Chart */}
        {accessRights.canViewBudgetByDistrictChart && (
          <div>
            {isLoadingBudgetByDistrict ? (
              <ChartSkeleton />
            ) : budgetByDistrictError ? (
              <ErrorAlert
                error={budgetByDistrictError}
                onRetry={onRetryBudgetByDistrict}
              />
            ) : (
              <BudgetBarChart
                data={
                  budgetByDistrictData?.map((item) => ({
                    id: item.districtId,
                    name: item.districtName,
                    allocatedBudget: item.allocatedBudget,
                    spentBudget: item.spentBudget,
                    utilizationPercentage: item.utilizationPercentage,
                  })) || []
                }
                title="Budget by District"
                entityType="district"
              />
            )}
          </div>
        )}
      </div>

      {/* Province Approval Summary Table */}
      {accessRights.canViewProvinceApprovalTable && (
        <>
          {isLoadingProvinceApprovals ? (
            <TableSkeleton />
          ) : provinceApprovalsError ? (
            <ErrorAlert
              error={provinceApprovalsError}
              onRetry={onRetryProvinceApprovals}
            />
          ) : (
            <ProvinceApprovalTable
              data={provinceApprovalsData || []}
              onDistrictClick={accessRights.canFilterByAnyDistrict ? onDistrictClick : undefined}
            />
          )}
        </>
      )}
    </div>
  );
}
