"use client";

import { useEffect } from "react";
import { ProvinceTab } from "./ProvinceTab";
import { useGetMetrics } from "@/hooks/queries/dashboard/use-get-metrics";
import { useGetProgramDistribution } from "@/hooks/queries/dashboard/use-get-program-distribution";
import { useGetBudgetByDistrict } from "@/hooks/queries/dashboard/use-get-budget-by-district";
import { useGetProvinceApprovals } from "@/hooks/queries/dashboard/use-get-province-approvals";
import { useGetProvinces } from "@/hooks/queries/provinces/use-get-provinces";
import { useGetProjects } from "@/hooks/queries/projects/use-get-projects";
import { filterAllowedProvinces, type DashboardAccessRights } from "@/lib/dashboard-access-control";

interface ProvinceTabContainerProps {
  provinceId?: string;
  projectType?: string;
  quarter?: string;
  onProvinceChange: (value: string) => void;
  onProjectTypeChange: (value: string) => void;
  onQuarterChange: (value: string) => void;
  onClearFilters: () => void;
  onDistrictClick?: (districtId: number) => void;
  onDataLoaded?: () => void;
  accessRights: DashboardAccessRights;
}

export function ProvinceTabContainer({
  provinceId,
  projectType,
  quarter,
  onProvinceChange,
  onProjectTypeChange,
  onQuarterChange,
  onClearFilters,
  onDistrictClick,
  onDataLoaded,
  accessRights,
}: ProvinceTabContainerProps) {
  // Fetch provinces for filter dropdown
  const { data: provincesData = [] } = useGetProvinces();
  
  // Filter provinces based on access rights
  const allowedProvinces = filterAllowedProvinces(provincesData, accessRights);

  // Fetch projects to get programs (project types)
  const { data: projectsData = [] } = useGetProjects();

  // Extract unique programs from projects
  const programs: Array<{ id: number; name: string }> = Array.from(
    new Map(
      (projectsData as any[])
        .filter((project: any) => project.projectType)
        .map((project: any) => [
          project.projectType,
          {
            id: project.id,
            name: project.projectType,
          },
        ])
    ).values()
  );

  // Only fetch if we have a valid province ID
  const hasValidProvinceId = Boolean(provinceId && Number(provinceId) > 0);

  // Fetch metrics data
  const {
    data: metricsData,
    isLoading: isLoadingMetrics,
    error: metricsError,
    refetch: refetchMetrics,
  } = useGetMetrics(
    {
      level: "province",
      provinceId: provinceId ? Number(provinceId) : 0,
      projectType: projectType,
      quarter: quarter ? Number(quarter) : undefined,
    },
    {
      enabled: hasValidProvinceId,
    }
  );

  // Fetch program distribution data
  const {
    data: programDistributionResponse,
    isLoading: isLoadingProgramDistribution,
    error: programDistributionError,
    refetch: refetchProgramDistribution,
  } = useGetProgramDistribution(
    {
      level: "province" as "province" | "district",
      provinceId: provinceId ? Number(provinceId) : 0,
      quarter: quarter ? Number(quarter) : undefined,
    },
    {
      enabled: hasValidProvinceId,
    }
  );

  // Fetch budget by district data
  const {
    data: budgetByDistrictResponse,
    isLoading: isLoadingBudgetByDistrict,
    error: budgetByDistrictError,
    refetch: refetchBudgetByDistrict,
  } = useGetBudgetByDistrict(
    {
      provinceId: provinceId ? Number(provinceId) : 0,
      projectType: projectType,
      quarter: quarter ? Number(quarter) : undefined,
    },
    {
      enabled: hasValidProvinceId,
    }
  );

  // Fetch province approvals data
  const {
    data: provinceApprovalsResponse,
    isLoading: isLoadingProvinceApprovals,
    error: provinceApprovalsError,
    refetch: refetchProvinceApprovals,
  } = useGetProvinceApprovals(
    {
      provinceId: provinceId ? Number(provinceId) : 0,
      projectType: projectType,
      quarter: quarter ? Number(quarter) : undefined,
    },
    {
      enabled: hasValidProvinceId,
    }
  );

  // Notify parent when data is loaded
  useEffect(() => {
    if (
      !isLoadingMetrics &&
      !isLoadingProgramDistribution &&
      !isLoadingBudgetByDistrict &&
      !isLoadingProvinceApprovals &&
      onDataLoaded
    ) {
      onDataLoaded();
    }
  }, [
    isLoadingMetrics,
    isLoadingProgramDistribution,
    isLoadingBudgetByDistrict,
    isLoadingProvinceApprovals,
    onDataLoaded,
  ]);

  return (
    <ProvinceTab
      provinceId={provinceId}
      projectType={projectType}
      quarter={quarter}
      provinces={allowedProvinces}
      programs={programs}
      onProvinceChange={onProvinceChange}
      onProjectTypeChange={onProjectTypeChange}
      onQuarterChange={onQuarterChange}
      onClearFilters={onClearFilters}
      metricsData={metricsData}
      programDistributionData={programDistributionResponse?.programs}
      budgetByDistrictData={budgetByDistrictResponse?.districts}
      provinceApprovalsData={provinceApprovalsResponse?.districts}
      isLoadingMetrics={isLoadingMetrics}
      isLoadingProgramDistribution={isLoadingProgramDistribution}
      isLoadingBudgetByDistrict={isLoadingBudgetByDistrict}
      isLoadingProvinceApprovals={isLoadingProvinceApprovals}
      metricsError={metricsError}
      programDistributionError={programDistributionError}
      budgetByDistrictError={budgetByDistrictError}
      provinceApprovalsError={provinceApprovalsError}
      onDistrictClick={onDistrictClick}
      onRetryMetrics={() => refetchMetrics()}
      onRetryProgramDistribution={() => refetchProgramDistribution()}
      onRetryBudgetByDistrict={() => refetchBudgetByDistrict()}
      onRetryProvinceApprovals={() => refetchProvinceApprovals()}
      accessRights={accessRights}
    />
  );
}
