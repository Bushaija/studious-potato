import { useMutation } from "@tanstack/react-query";
import { 
  exportFinancialStatement, 
  type ExportStatementOptions 
} from "@/fetchers/financial-reports/export-statement";

interface ExportResult {
  success: boolean;
  filename: string;
}

function useExportStatement() {
  return useMutation<ExportResult, Error, ExportStatementOptions>({
    mutationFn: exportFinancialStatement,
  });
}

export default useExportStatement;
