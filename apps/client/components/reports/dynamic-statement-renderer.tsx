"use client";

import React from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { RevenueExpenditureStatement } from '@/features/reports/revenue-expenditure';
import { BalanceSheetStatement } from '@/features/reports/balance-sheet';
import { CashFlowStatement } from '@/features/reports/cash-flow';
import { ChangesInNetAssetsStatement } from '@/features/reports/changes-in-net-assets';
import { BudgetVsActualStatement } from '@/features/reports/budget-vs-actual';
import { transformStatementData, transformNetAssetsData } from '@/app/dashboard/reports/_utils/transform-statement-data';
import { getCurrentFiscalYear } from '@/features/execution/utils';

type StatementCode = 'REV_EXP' | 'ASSETS_LIAB' | 'CASH_FLOW' | 'NET_ASSETS_CHANGES' | 'BUDGET_VS_ACTUAL';

type StatementData = {
  statementCode: string;
  statementName: string;
  lines: any[];
  totals?: Record<string, number>;
  metadata?: any;
  reportingPeriod?: {
    id: number;
    year: number;
    type: string;
  };
  facility?: {
    id: number;
    name: string;
    type: string;
  };
};

type DynamicStatementRendererProps = {
  statement: StatementData;
};

/**
 * Dynamic Statement Renderer Component
 * 
 * Dynamically renders the appropriate financial statement component based on statementCode.
 * Reuses existing statement components:
 * - REV_EXP → RevenueExpenditureStatement
 * - ASSETS_LIAB → BalanceSheetStatement
 * - CASH_FLOW → CashFlowStatement
 * - NET_ASSETS_CHANGES → ChangesInNetAssetsStatement
 * - BUDGET_VS_ACTUAL → BudgetVsActualStatement
 * 
 * @example
 * <DynamicStatementRenderer statement={report.reportData.statement} />
 */
export function DynamicStatementRenderer({ statement }: DynamicStatementRendererProps) {
  if (!statement || !statement.lines) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          No statement data available to display.
        </AlertDescription>
      </Alert>
    );
  }

  const { statementCode, lines } = statement;

  // Generate period labels
  const currentEndingYear = statement.reportingPeriod?.year || getCurrentFiscalYear();
  const currentStartYear = currentEndingYear - 1;
  const prevEndingYear = currentEndingYear - 1;
  const prevStartYear = prevEndingYear - 1;

  const periodLabels = {
    currentPeriodLabel: `FY ${currentStartYear}/${currentEndingYear} (Frw)`,
    previousPeriodLabel: `FY ${prevStartYear}/${prevEndingYear} (Frw)`
  };

  // Dynamically render the appropriate statement component
  switch (statementCode) {
    case 'REV_EXP': {
      const transformedData = transformStatementData(lines);
      return (
        <RevenueExpenditureStatement
          initialData={transformedData}
          {...periodLabels}
        />
      );
    }

    case 'ASSETS_LIAB': {
      const transformedData = transformStatementData(lines);
      return (
        <BalanceSheetStatement
          initialData={transformedData}
          {...periodLabels}
        />
      );
    }

    case 'CASH_FLOW': {
      const transformedData = transformStatementData(lines);
      return (
        <CashFlowStatement
          initialData={transformedData}
          {...periodLabels}
        />
      );
    }

    case 'NET_ASSETS_CHANGES':
      // NET_ASSETS_CHANGES uses a different data structure (three columns)
      const netAssetsData = transformNetAssetsData(lines);
      return (
        <ChangesInNetAssetsStatement
          initialData={netAssetsData}
          {...periodLabels}
        />
      );

    case 'BUDGET_VS_ACTUAL': {
      const transformedData = transformStatementData(lines);
      return (
        <BudgetVsActualStatement
          initialData={transformedData}
          {...periodLabels}
        />
      );
    }

    default:
      return (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Unsupported statement type: {statementCode}
          </AlertDescription>
        </Alert>
      );
  }
}

/**
 * Statement Type Badge Component
 * Shows the statement type with appropriate styling
 */
export function StatementTypeBadge({ statementCode }: { statementCode: string }) {
  const getStatementLabel = (code: string) => {
    const labels: Record<string, string> = {
      'REV_EXP': 'Revenue & Expenditure',
      'CASH_FLOW': 'Cash Flow',
      'ASSETS_LIAB': 'Assets & Liabilities',
      'NET_ASSETS_CHANGES': 'Changes in Net Assets',
      'BUDGET_VS_ACTUAL': 'Budget vs Actual'
    };
    return labels[code] || code;
  };

  return (
    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
      {getStatementLabel(statementCode)}
    </span>
  );
}
