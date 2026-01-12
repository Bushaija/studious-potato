"use client";

import React from 'react';
import { ReportHeader } from './report-header';
import { getCurrentFiscalYear } from '@/features/execution/utils';

type StatementType = 
  | 'revenue-expenditure'
  | 'assets-liabilities' 
  | 'cash-flow'
  | 'budget-vs-actual'
  | 'net-assets-changes';

type ProjectType = 'hiv' | 'malaria' | 'tb';

type FinancialStatementHeaderProps = {
  statementType: StatementType;
  selectedProject: ProjectType;
  contentRef: React.RefObject<HTMLDivElement>;
  period?: number;
  reportingPeriodId?: number;
  facilityId?: number;
};

// Statement type configurations
const statementConfigs = {
  'revenue-expenditure': {
    reportName: 'Statement of Revenue and Expenditure',
    filePrefix: 'revenue-expenditure-statement'
  },
  'assets-liabilities': {
    reportName: 'Statement of Financial Assets and Liabilities',
    filePrefix: 'balance-sheet-statement'
  },
  'cash-flow': {
    reportName: 'Statement of Cash Flows',
    filePrefix: 'cash-flow-statement'
  },
  'budget-vs-actual': {
    reportName: 'Statement of Budget vs Actual',
    filePrefix: 'budget-vs-actual-statement'
  },
  'net-assets-changes': {
    reportName: 'Statement of Changes in Net Assets',
    filePrefix: 'changes-in-net-assets-statement'
  }
};

// Project configurations
const projectConfigs = {
  hiv: {
    displayName: 'HIV/NSP Budget Support',
    code: 'HIV'
  },
  malaria: {
    displayName: 'Malaria Budget Support',
    code: 'MAL'
  },
  tb: {
    displayName: 'TB Budget Support',
    code: 'TB'
  }
};

/**
 * Reusable Financial Statement Header Component
 * 
 * This component provides a consistent header for all financial statement reports
 * across different projects (HIV, Malaria, TB) and statement types.
 * 
 * @example
 * // Revenue & Expenditure Statement
 * <FinancialStatementHeader
 *   statementType="revenue-expenditure"
 *   selectedProject="hiv"
 *   contentRef={reportContentRef}
 *   period={2025}
 * />
 * 
 * @example  
 * // Assets & Liabilities Statement
 * <FinancialStatementHeader
 *   statementType="assets-liabilities"
 *   selectedProject="malaria"
 *   contentRef={reportContentRef}
 * />
 * 
 * @example
 * // Cash Flow Statement
 * <FinancialStatementHeader
 *   statementType="cash-flow"
 *   selectedProject="tb"
 *   contentRef={reportContentRef}
 *   period={2024}
 * />
 */
export function FinancialStatementHeader({
  statementType,
  selectedProject,
  contentRef,
  period = getCurrentFiscalYear(),
  reportingPeriodId = 2,
  facilityId
}: FinancialStatementHeaderProps) {
  const statementConfig = statementConfigs[statementType];
  const projectConfig = projectConfigs[selectedProject];

  const reportInfo = {
    program: `${projectConfig.displayName} of `,
    reportName: statementConfig.reportName,
    period: period
  };

  const fileName = `${statementConfig.filePrefix}-${selectedProject}-${period}.pdf`;

  // Map statement type to statement code
  const statementCodeMap: Record<StatementType, 'REV_EXP' | 'ASSETS_LIAB' | 'CASH_FLOW' | 'NET_ASSETS_CHANGES' | 'BUDGET_VS_ACTUAL'> = {
    'revenue-expenditure': 'REV_EXP',
    'assets-liabilities': 'ASSETS_LIAB',
    'cash-flow': 'CASH_FLOW',
    'net-assets-changes': 'NET_ASSETS_CHANGES',
    'budget-vs-actual': 'BUDGET_VS_ACTUAL',
  };

  // Map project to project type
  const projectTypeMap: Record<ProjectType, 'HIV' | 'Malaria' | 'TB'> = {
    'hiv': 'HIV',
    'malaria': 'Malaria',
    'tb': 'TB',
  };

  return (
    <ReportHeader
      {...reportInfo}
      contentRef={contentRef}
      fileName={fileName}
      statementCode={statementCodeMap[statementType]}
      projectType={projectTypeMap[selectedProject]}
      reportingPeriodId={reportingPeriodId}
      facilityId={facilityId}
    />
  );
}

/**
 * Utility function to get project code for tab value (reusable across components)
 * @param tabValue - The tab value ('hiv', 'malaria', 'tb')
 * @returns The corresponding project code ('HIV', 'MAL', 'TB')
 */
export const getProjectCodeForFinancialStatement = (tabValue: string): string => {
  const mapping = {
    'hiv': 'HIV',
    'malaria': 'MAL', 
    'tb': 'TB'
  }
  return mapping[tabValue as keyof typeof mapping] || tabValue.toUpperCase()
}

/**
 * Utility function to get project display name
 * @param tabValue - The tab value ('hiv', 'malaria', 'tb')
 * @returns The corresponding display name for reports
 */
export const getProjectDisplayName = (tabValue: string): string => {
  const mapping = {
    'hiv': 'HIV/NSP Budget Support',
    'malaria': 'Malaria Budget Support', 
    'tb': 'TB Budget Support'
  }
  return mapping[tabValue as keyof typeof mapping] || 'Budget Support'
}

// Export types for use in other components
export type { StatementType, ProjectType, FinancialStatementHeaderProps }; 