"use client";

import React from 'react';
import { FileDown } from 'lucide-react';
import useExportStatement from '@/hooks/mutations/financial-reports/use-export-statement';
import { useToast } from '@/hooks/use-toast';

type StatementCode = 'REV_EXP' | 'ASSETS_LIAB' | 'CASH_FLOW' | 'NET_ASSETS_CHANGES' | 'BUDGET_VS_ACTUAL';
type ProjectType = 'HIV' | 'Malaria' | 'TB';
type ExportFormat = 'pdf' | 'excel' | 'csv';

type APIExportButtonProps = {
  statementCode: StatementCode;
  projectType: ProjectType;
  reportingPeriodId: number;
  facilityId?: number;
  fileName?: string;
  format?: ExportFormat;
  includeComparatives?: boolean;
};

export function APIExportButton({ 
  statementCode,
  projectType,
  reportingPeriodId,
  facilityId,
  fileName,
  format = 'pdf',
  includeComparatives = true,
}: APIExportButtonProps) {
  const { mutate: exportStatement, isPending } = useExportStatement();
  const { toast } = useToast();

  const handleExport = () => {
    const defaultFileName = `${statementCode.toLowerCase()}-${projectType.toLowerCase()}-${new Date().toISOString().split('T')[0]}.${format === 'excel' ? 'xlsx' : format}`;

    exportStatement(
      {
        json: {
          statementCode,
          reportingPeriodId,
          projectType,
          facilityId,
          includeComparatives,
          exportFormat: format,
          exportOptions: {
            includeMetadata: true,
            includeFootnotes: true,
            includeValidation: false,
            pageOrientation: 'portrait',
            fontSize: 'medium',
            showZeroValues: true,
            highlightNegatives: true,
            includeCharts: false,
          },
        },
        filename: fileName || defaultFileName,
      },
      {
        onSuccess: () => {
          toast({
            title: 'Export Successful',
            description: `Statement has been exported as ${format.toUpperCase()}`,
          });
        },
        onError: (error) => {
          toast({
            title: 'Export Failed',
            description: error.message || 'Failed to export statement',
            variant: 'destructive',
          });
        },
      }
    );
  };

  return (
    <button
      onClick={handleExport}
      disabled={isPending}
      className="inline-flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
    >
      {isPending ? (
        <>
          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          Exporting...
        </>
      ) : (
        <>
          <FileDown className="w-4 h-4" />
          Export {format.toUpperCase()}
        </>
      )}
    </button>
  );
}
