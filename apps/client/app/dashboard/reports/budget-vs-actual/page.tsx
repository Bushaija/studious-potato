"use client";

import React, { useRef, useState, useEffect, useCallback } from "react";
import { FinancialStatementHeader } from '@/components/reports/financial-statement-header';
import { BudgetVsActualStatement } from '@/features/reports/budget-vs-actual';
import { ReportSkeleton } from '@/components/skeletons';
import { FilterTabs, type FilterTab } from '@/components/ui/filter-tabs';
import { getCurrentFiscalYear } from '@/features/execution/utils';
import useGenerateStatement from '@/hooks/mutations/financial-reports/use-generate-statement';
import { useToast } from '@/hooks/use-toast';
import { transformBudgetVsActualData } from '../_utils/transform-statement-data';
import { FacilitySelectorWithAll } from '@/components/facility-selector-with-all';
import { Label } from '@/components/ui/label';
import { FinancialReportStatusCard } from '@/components/reports/financial-report-status-card';
import { useGetReportId } from '@/hooks/queries/financial-reports';

// Project configuration
const projectTabs: FilterTab[] = [
  {
    value: 'hiv',
    label: 'HIV',
    content: null // Will be populated with the report component
  },
  {
    value: 'malaria', 
    label: 'Malaria',
    content: null
  },
  {
    value: 'tb',
    label: 'TB',
    content: null
  }
]

// Tab Content Component that handles loading state
const TabContent = ({ 
  tabValue, 
  periodId, 
  facilityId,
  aggregationLevel,
  onFacilitiesWithData,
}: { 
  tabValue: string; 
  periodId: number; 
  facilityId?: number | "all";
  aggregationLevel: "FACILITY" | "DISTRICT" | "PROVINCE";
  onFacilitiesWithData: (facilityIds: number[]) => void;
}) => {
  const [statementData, setStatementData] = useState<any>(null);
  const { toast } = useToast();

  const projectTypeMapping: Record<string, 'HIV' | 'Malaria' | 'TB'> = {
    'hiv': 'HIV',
    'malaria': 'Malaria',
    'tb': 'TB'
  };

  // Fetch the report ID for this project and period
  const { data: reportId, refetch: refetchReportId } = useGetReportId({
    reportingPeriodId: periodId,
    projectType: projectTypeMapping[tabValue],
    statementType: "budget-vs-actual",
    enabled: !!periodId,
  });

  // Handle report creation - refetch the report ID
  const handleReportCreated = () => {
    refetchReportId();
  };

  const { mutate: generateStatement, isPending, isError, error } = useGenerateStatement({
    onSuccess: (data) => {
      setStatementData(data.statement);
      // Only update facilities with data when viewing "all" facilities
      // This ensures we capture the full list of facilities with data
      if (facilityId === "all" && data.aggregationMetadata?.facilitiesIncluded) {
        onFacilitiesWithData(data.aggregationMetadata.facilitiesIncluded);
      }
    },
    onError: (error) => {
      console.error('Failed to generate statement:', error);
      toast({
        title: "Failed to generate statement",
        description: error.message || "An unexpected error occurred",
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    if (periodId) {
      setStatementData(null); // Reset data when switching tabs
      generateStatement({
        statementCode: "BUDGET_VS_ACTUAL",
        reportingPeriodId: periodId,
        projectType: projectTypeMapping[tabValue],
        facilityId: facilityId === "all" ? undefined : facilityId,
        aggregationLevel: facilityId === "all" ? aggregationLevel : "FACILITY",
        includeFacilityBreakdown: facilityId === "all",
        includeComparatives: true,
        customMappings: {}, // Add empty custom mappings as per API
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [periodId, tabValue, facilityId, aggregationLevel]);

  if (isPending || !statementData) {
    return <ReportSkeleton />
  }

  if (isError) {
    // Check if it's a "no data" error (404)
    const isNoDataError = error?.message?.includes('No data available') || 
                          error?.message?.includes('404') ||
                          error?.message?.includes('not found');
    
    if (isNoDataError) {
      return (
        <div className="bg-amber-50 p-6 rounded-lg border border-amber-200">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="text-amber-800 font-medium mb-1">No Data Available</h3>
              <p className="text-amber-700 text-sm mb-3">
                {facilityId === "all" 
                  ? `No budget or expenditure data found for ${tabValue.toUpperCase()} in the selected facilities for this reporting period.`
                  : `The selected facility has no budget or expenditure data for ${tabValue.toUpperCase()} in this reporting period.`
                }
              </p>
              <div className="text-amber-700 text-sm">
                <p className="font-medium mb-1">Possible reasons:</p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>Budget has not been planned for this period</li>
                  <li>Expenditure has not been recorded yet</li>
                  <li>Data entry is still in progress</li>
                  {facilityId !== "all" && <li>Try selecting "All Facilities" to see district-wide data</li>}
                </ul>
              </div>
            </div>
          </div>
        </div>
      );
    }
    
    // Generic error for other types of errors
    return (
      <div className="bg-red-50 p-6 rounded-lg border border-red-200">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="text-red-800 font-medium mb-1">Failed to Load Report</h3>
            <p className="text-red-700 text-sm mb-2">
              Unable to generate the budget vs actual report for {tabValue.toUpperCase()}.
            </p>
            <p className="text-red-600 text-sm font-mono bg-red-100 p-2 rounded">
              {error?.message || "An unexpected error occurred"}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Transform API data to component format
  const transformedData = transformBudgetVsActualData(statementData.lines ?? []);

  return (
    <div className="flex gap-4">
      <div className="flex-1">
        <BudgetVsActualStatement initialData={transformedData} />
      </div>
      <div className="w-80">
        <FinancialReportStatusCard
          reportId={reportId ?? null}
          projectType={projectTypeMapping[tabValue]}
          statementType="budget-vs-actual"
          reportingPeriodId={periodId}
          onReportCreated={handleReportCreated}
        />
      </div>
    </div>
  );
}

export default function BudgetVsActualPage() {
  const [selectedTab, setSelectedTab] = useState('hiv');
  const [selectedFacilityId, setSelectedFacilityId] = useState<number | "all">("all"); // Default to "All"
  const [aggregationLevel] = useState<"FACILITY" | "DISTRICT" | "PROVINCE">("DISTRICT");
  const [facilitiesWithData, setFacilitiesWithData] = useState<number[]>([]);
  const [isLoadingFacilities, setIsLoadingFacilities] = useState(true);
  const reportContentRef = useRef<HTMLDivElement>(null!)
  
  // For now, use a hardcoded period ID
  // TODO: Implement proper reporting period selection
  const periodId = 2;

  // Merge facilities with data across all project tabs
  const handleFacilitiesWithData = useCallback((facilityIds: number[]) => {
    setFacilitiesWithData(prev => {
      const merged = new Set([...prev, ...facilityIds]);
      return Array.from(merged);
    });
    setIsLoadingFacilities(false);
  }, []);

  // Create tabs with content that handles its own loading state
  const tabsWithContent = projectTabs.map(tab => ({
    ...tab,
    content: <TabContent 
      tabValue={tab.value} 
      periodId={periodId} 
      facilityId={selectedFacilityId}
      aggregationLevel={aggregationLevel}
      onFacilitiesWithData={handleFacilitiesWithData}
    />
  }))

  const currentEndingYear = getCurrentFiscalYear();

  return (
    <main className="max-w-6xl mx-auto">
      <div className="">
        {/* 1. Financial Statement Header - Always visible */}
        <div ref={reportContentRef} className="bg-white">
          <FinancialStatementHeader
            statementType="budget-vs-actual"
            selectedProject={selectedTab as 'hiv' | 'malaria' | 'tb'}
            contentRef={reportContentRef}
            period={currentEndingYear}
            reportingPeriodId={periodId}
            facilityId={selectedFacilityId === "all" ? undefined : selectedFacilityId}
          />
        
          {/* Facility Filter */}
          <div className="px-6 py-4 border-b bg-gray-50">
            <div className="max-w-md">
              <Label htmlFor="facility-selector" className="text-sm font-medium mb-2 block">
                Health Facility
              </Label>
              <FacilitySelectorWithAll
                value={selectedFacilityId}
                onChange={setSelectedFacilityId}
                aggregationLevel={aggregationLevel}
                facilityIdsWithData={facilitiesWithData}
                disabled={isLoadingFacilities}
              />
              <p className="text-xs text-muted-foreground mt-1.5">
                {isLoadingFacilities ? (
                  "Loading facilities with data..."
                ) : facilitiesWithData.length === 0 ? (
                  "No facilities have execution data for this period"
                ) : selectedFacilityId === "all" ? (
                  `Showing aggregated data for ${facilitiesWithData.length} facilities at ${aggregationLevel.toLowerCase()} level`
                ) : (
                  "Showing data for selected facility"
                )}
              </p>
            </div>
          </div>

          {/* 2. Filter Tabs - Always visible */}
          <FilterTabs
            tabs={tabsWithContent}
            value={selectedTab}
            onValueChange={setSelectedTab}
            defaultValue="hiv"
          />
        </div>
      </div>
    </main>
  )
} 
