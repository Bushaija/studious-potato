"use client";

import { useEffect } from "react";
import { DistrictTab } from "./DistrictTab";
import { useGetMetrics } from "@/hooks/queries/dashboard/use-get-metrics";
import { useGetProgramDistribution } from "@/hooks/queries/dashboard/use-get-program-distribution";
import { useGetBudgetByFacility } from "@/hooks/queries/dashboard/use-get-budget-by-facility";
import { useGetDistrictApprovals } from "@/hooks/queries/dashboard/use-get-district-approvals";
import { useGetDistricts } from "@/hooks/queries/districts/use-get-districts";
import { useGetProjects } from "@/hooks/queries/projects/use-get-projects";
import { filterAllowedDistricts, type DashboardAccessRights } from "@/lib/dashboard-access-control";

interface DistrictTabContainerProps {
  districtId?: string;
  projectType?: string;
  quarter?: string;
  provinceId?: string;
  onDistrictChange: (value: string) => void;
  onProjectTypeChange: (value: string) => void;
  onQuarterChange: (value: string) => void;
  onClearFilters: () => void;
  onDataLoaded?: () => void;
  accessRights: DashboardAccessRights;
}

export function DistrictTabContainer({
  districtId,
  projectType,
  quarter,
  provinceId,
  onDistrictChange,
  onProjectTypeChange,
  onQuarterChange,
  onClearFilters,
  onDataLoaded,
  accessRights,
}: DistrictTabContainerProps) {
  // Fetch districts for filter dropdown
  const { data: districtsData = [] } = useGetDistricts(
    provinceId ? { provinceId: Number(provinceId) } : undefined
  );

  // Filter districts based on access rights
  const allowedDistricts = filterAllowedDistricts(districtsData, accessRights);

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

  // Only fetch if we have a valid district ID
  const hasValidDistrictId = Boolean(districtId && Number(districtId) > 0);

  // Fetch metrics data
  const {
    data: metricsData,
    isLoading: isLoadingMetrics,
    error: metricsError,
    refetch: refetchMetrics,
  } = useGetMetrics(
    {
      level: "district",
      districtId: districtId ? Number(districtId) : 0,
      projectType: projectType,
      quarter: quarter ? Number(quarter) : undefined,
    },
    {
      enabled: hasValidDistrictId,
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
      level: "district" as "province" | "district",
      districtId: districtId ? Number(districtId) : 0,
      quarter: quarter ? Number(quarter) : undefined,
    },
    {
      enabled: hasValidDistrictId,
    }
  );

  // Determine whether to use facilityId or districtId based on access rights
  // For facility-level users (accountant, DAF, DG), use facilityId to show only their facility and children
  const useFacilityScope = !accessRights.canFilterByAnyDistrict && accessRights.userFacilityId;
  
  // Fetch budget by facility data
  const {
    data: budgetByFacilityResponse,
    isLoading: isLoadingBudgetByFacility,
    error: budgetByFacilityError,
    refetch: refetchBudgetByFacility,
  } = useGetBudgetByFacility(
    {
      districtId: useFacilityScope ? undefined : (districtId ? Number(districtId) : 0),
      facilityId: useFacilityScope ? accessRights.userFacilityId : undefined,
      projectType: projectType,
      quarter: quarter ? Number(quarter) : undefined,
    },
    {
      enabled: useFacilityScope ? Boolean(accessRights.userFacilityId) : hasValidDistrictId,
    }
  );

  // Fetch district approvals data
  const {
    data: districtApprovalsResponse,
    isLoading: isLoadingDistrictApprovals,
    error: districtApprovalsError,
    refetch: refetchDistrictApprovals,
  } = useGetDistrictApprovals(
    {
      districtId: useFacilityScope ? undefined : (districtId ? Number(districtId) : 0),
      facilityId: useFacilityScope ? accessRights.userFacilityId : undefined,
      projectType: projectType,
      quarter: quarter ? Number(quarter) : undefined,
    },
    {
      enabled: useFacilityScope ? Boolean(accessRights.userFacilityId) : hasValidDistrictId,
    }
  );

  // Notify parent when data is loaded
  useEffect(() => {
    console.log("[DistrictTabContainer] Data status", {
      isLoadingMetrics,
      isLoadingProgramDistribution,
      isLoadingBudgetByFacility,
      isLoadingDistrictApprovals,
      metricsData,
      programDistributionData: programDistributionResponse?.programs,
      budgetByFacilityData: budgetByFacilityResponse?.facilities,
      districtApprovalsData: districtApprovalsResponse?.facilities,
      metricsError: metricsError?.message,
      programDistributionError: programDistributionError?.message,
      budgetByFacilityError: budgetByFacilityError?.message,
      districtApprovalsError: districtApprovalsError?.message,
    });

    if (
      !isLoadingMetrics &&
      !isLoadingProgramDistribution &&
      !isLoadingBudgetByFacility &&
      !isLoadingDistrictApprovals &&
      onDataLoaded
    ) {
      onDataLoaded();
    }
  }, [
    isLoadingMetrics,
    isLoadingProgramDistribution,
    isLoadingBudgetByFacility,
    isLoadingDistrictApprovals,
    metricsData,
    programDistributionResponse,
    budgetByFacilityResponse,
    districtApprovalsResponse,
    metricsError,
    programDistributionError,
    budgetByFacilityError,
    districtApprovalsError,
    onDataLoaded,
  ]);

  return (
    <DistrictTab
      districtId={districtId}
      projectType={projectType}
      quarter={quarter}
      districts={allowedDistricts}
      programs={programs}
      onDistrictChange={onDistrictChange}
      onProjectTypeChange={onProjectTypeChange}
      onQuarterChange={onQuarterChange}
      onClearFilters={onClearFilters}
      metricsData={metricsData}
      programDistributionData={programDistributionResponse?.programs}
      budgetByFacilityData={budgetByFacilityResponse?.facilities}
      districtApprovalsData={districtApprovalsResponse?.facilities}
      isLoadingMetrics={isLoadingMetrics}
      isLoadingProgramDistribution={isLoadingProgramDistribution}
      isLoadingBudgetByFacility={isLoadingBudgetByFacility}
      isLoadingDistrictApprovals={isLoadingDistrictApprovals}
      metricsError={metricsError}
      programDistributionError={programDistributionError}
      budgetByFacilityError={budgetByFacilityError}
      districtApprovalsError={districtApprovalsError}
      onRetryMetrics={() => refetchMetrics()}
      onRetryProgramDistribution={() => refetchProgramDistribution()}
      onRetryBudgetByFacility={() => refetchBudgetByFacility()}
      onRetryDistrictApprovals={() => refetchDistrictApprovals()}
      accessRights={accessRights}
    />
  );
}
