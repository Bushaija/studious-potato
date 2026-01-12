import { useMutation } from "@tanstack/react-query";
import { 
  exportCompiledExecution, 
  type ExportCompiledExecutionOptions 
} from "@/fetchers/execution/export-compiled-execution";

interface ExportResult {
  success: boolean;
  filename: string;
}

function useExportCompiledExecution() {
  return useMutation<ExportResult, Error, ExportCompiledExecutionOptions>({
    mutationFn: exportCompiledExecution,
  });
}

export default useExportCompiledExecution;
