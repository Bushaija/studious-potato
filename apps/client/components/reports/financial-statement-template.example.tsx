/**
 * TEMPLATE: Financial Statement Page with Filter Tabs
 * 
 * This file serves as a template for creating new financial statement pages
 * with consistent project filtering and header components.
 * 
 * Copy this template and modify the statementType and data fetching hook
 * to create new financial statement pages.
 */

"use client";

import React, { useRef, useState } from 'react';
import { FinancialStatementHeader, getProjectCodeForFinancialStatement } from '@/components/reports/financial-statement-header';
import { ReportSkeleton } from '@/components/skeletons';
import { FilterTabs, type FilterTab } from '@/components/ui/filter-tabs';

// Import your specific statement component
// import { YourStatementComponent } from '@/features/reports/your-statement';
// import { useYourStatementHook } from '@/features/api/statements';

// Project configuration (same for all financial statements)
const projectTabs: FilterTab[] = [
  {
    value: 'hiv',
    label: 'HIV',
    content: null
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
const TabContent = ({ tabValue, periodId }: { tabValue: string; periodId: number }) => {
  const selectedProjectCode = getProjectCodeForFinancialStatement(tabValue)
  
  // Replace with your specific data fetching hook
  // const { data, isLoading, isError } = useYourStatementHook(periodId, selectedProjectCode, !!periodId)
  const { data, isLoading, isError } = { data: null, isLoading: false, isError: false } // Placeholder
  
  const reportContentRef = useRef<HTMLDivElement>(null!)

  if (isLoading) {
    return <ReportSkeleton />
  }

  if (isError) {
    return <div className="bg-white p-6 rounded-lg">Failed to load report for {tabValue.toUpperCase()}</div>
  }

  return (
    <div ref={reportContentRef} className="bg-white">
      {/* 
        Replace 'assets-liabilities' with your statement type:
        - 'revenue-expenditure'
        - 'assets-liabilities' 
        - 'cash-flow'
        - 'budget-vs-actual'
        - 'net-assets-changes'
      */}
      <FinancialStatementHeader
        statementType="assets-liabilities" // ← Change this
        selectedProject={tabValue as 'hiv' | 'malaria' | 'tb'}
        contentRef={reportContentRef}
        period={2025}
      />
      
      {/* Replace with your specific statement component */}
      {/* <YourStatementComponent initialData={data ?? []} /> */}
      <div className="p-6">
        <p>Your statement component goes here...</p>
        <p>Data: {JSON.stringify(data, null, 2)}</p>
      </div>
    </div>
  )
}

export default function YourFinancialStatementPage() {
  const [selectedTab, setSelectedTab] = useState('hiv')
  const periodId = 2 // TODO: wire from route params or context

  const tabsWithContent = projectTabs.map(tab => ({
    ...tab,
    content: <TabContent tabValue={tab.value} periodId={periodId} />
  }))

  return (
    <main className="max-w-6xl mx-auto">
      <div className="">
        <FilterTabs
          tabs={tabsWithContent}
          value={selectedTab}
          onValueChange={setSelectedTab}
          defaultValue="hiv"
        />
      </div>
    </main>
  )
}

/**
 * STEPS TO CREATE A NEW FINANCIAL STATEMENT PAGE:
 * 
 * 1. Copy this template file
 * 2. Rename to your statement page (e.g., assets-liabilities/page.tsx)
 * 3. Change the statementType in FinancialStatementHeader
 * 4. Import and use your specific statement component
 * 5. Import and use your specific data fetching hook
 * 6. Update any statement-specific labels or configurations
 * 
 * BENEFITS:
 * ✅ Consistent header across all financial statements
 * ✅ Automatic file naming for PDF exports
 * ✅ Project filtering built-in
 * ✅ Loading states handled consistently
 * ✅ Error handling standardized
 * ✅ Easy to maintain and update
 */ 