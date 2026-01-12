"use client";

import React, { useRef, useState, useEffect } from 'react';
import { FinancialStatementHeader, getProjectCodeForFinancialStatement } from '@/components/reports/financial-statement-header';
import { RevenueExpenditureStatement } from '@/features/reports/revenue-expenditure';
import { ReportSkeleton } from '@/components/skeletons';
import { FilterTabs, type FilterTab } from '@/components/ui/filter-tabs';
import { getCurrentFiscalYear } from '@/features/execution/utils';
import useGenerateStatement from '@/hooks/mutations/financial-reports/use-generate-statement';
import { useToast } from '@/hooks/use-toast';
import { transformStatementData } from '../_utils/transform-statement-data';
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

const getProjectDisplayName = (tabValue: string): string => {
  const mapping = {
    'hiv': 'HIV/NSP Budget Support',
    'malaria': 'Malaria Budget Support',
    'tb': 'TB Budget Support'
  }
  return mapping[tabValue as keyof typeof mapping] || 'Budget Support'
}

// Tab Content Component that handles loading state
const TabContent = ({
  tabValue,
  periodId
}: {
  tabValue: string;
  periodId: number;
}) => {
  const [statementData, setStatementData] = useState<any>(null);
  const { mutate: generateStatement, isPending, isError } = useGenerateStatement();
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
    statementType: "revenue-expenditure",
    enabled: !!periodId,
  });

  // Handle report creation - refetch the report ID
  const handleReportCreated = () => {
    refetchReportId();
  };

  useEffect(() => {
    if (periodId) {
      generateStatement(
        {
          statementCode: "REV_EXP",
          reportingPeriodId: periodId,
          projectType: projectTypeMapping[tabValue],
          includeComparatives: true,
        },
        {
          onSuccess: (data) => {
            setStatementData(data.statement);
          },
          onError: (error) => {
            toast({
              title: "Failed to generate statement",
              description: error.message,
              variant: "destructive",
            });
          },
        }
      );
    }
  }, [periodId, tabValue]);

  const currentEndingYear = getCurrentFiscalYear();
  const currentStartYear = currentEndingYear - 1;
  const prevEndingYear = currentEndingYear - 1;
  const prevStartYear = prevEndingYear - 1;

  const periodLabels = {
    currentPeriodLabel: `FY ${currentStartYear}/${currentEndingYear} (Frw)`,
    previousPeriodLabel: `FY ${prevStartYear}/${prevEndingYear} (Frw)`
  };

  if (isPending || !statementData) {
    return <ReportSkeleton />
  }

  if (isError) {
    return <div className="bg-white p-6 rounded-lg border">Failed to load report for {tabValue.toUpperCase()}</div>
  }

  // Transform API data to component format
  const transformedData = transformStatementData(statementData.lines ?? []);

  return (
    <div className="flex gap-4">
      <div>
        <RevenueExpenditureStatement initialData={transformedData} {...periodLabels} />
      </div>
      <div className="w-80">
        <FinancialReportStatusCard
          reportId={reportId ?? null}
          projectType={projectTypeMapping[tabValue]}
          statementType="revenue-expenditure"
          reportingPeriodId={periodId}
          onReportCreated={handleReportCreated}
        />
      </div>
    </div>
  );
}

export default function RevenueExpenditurePage() {
  const [selectedTab, setSelectedTab] = useState('hiv')
  const reportContentRef = useRef<HTMLDivElement>(null!)

  // For now, use a hardcoded period ID or get from context
  // TODO: Implement proper reporting period selection
  const periodId = 2; // This should come from a reporting period selector

  // Create tabs with content that handles its own loading state
  const tabsWithContent = projectTabs.map(tab => ({
    ...tab,
    content: (
      <TabContent
        tabValue={tab.value}
        periodId={periodId}
      />
    )
  }))

  return (
    <main className="flex justify-center rounded-lg bg-[#f2f2f2]">
      <div className="p-2">
        {/* 1. Financial Statement Header - Always visible */}
        <div ref={reportContentRef} className="max-w-[1230px]">
          <FinancialStatementHeader
            statementType="revenue-expenditure"
            selectedProject={selectedTab as 'hiv' | 'malaria' | 'tb'}
            contentRef={reportContentRef}
            reportingPeriodId={periodId}
          />

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
