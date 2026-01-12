import { useQueries } from "@tanstack/react-query"
import { calculateHierarchicalTotals } from "../execution/schemas/execution-form-schema"
import { useListExecutedFacilities, fetchProjectExecutionData } from "../api/frontend"

// Recursively converts IDs to lowercase and parses numeric strings → numbers
const transformRows = (rows: any[]): any[] => {
  return rows.map((row) => {
    const parsedRow: any = {
      ...row,
      id: typeof row.id === 'string' ? row.id.toLowerCase() : row.id,
      q1: row.q1 !== undefined ? Number(row.q1) : undefined,
      q2: row.q2 !== undefined ? Number(row.q2) : undefined,
      q3: row.q3 !== undefined ? Number(row.q3) : undefined,
      q4: row.q4 !== undefined ? Number(row.q4) : undefined,
      cumulativeBalance: row.cumulativeBalance !== undefined ? Number(row.cumulativeBalance) : undefined,
    };

    if (row.children) {
      parsedRow.children = transformRows(row.children);
    }

    return parsedRow;
  });
};

interface UseCompiledReportOptions {
  projectCode?: string;
}

export const useCompiledReport = (options?: UseCompiledReportOptions) => {
  const { data: allFacilities, isLoading: isListLoading } = useListExecutedFacilities()

  // Filter facilities by project code if provided
  const facilities = options?.projectCode 
    ? allFacilities?.filter(f => f.projectCode === options.projectCode)
    : allFacilities

  // kick off individual fetches only once we have the list
  const queries = useQueries({
    queries: (facilities ?? []).map(f => ({
      queryKey: ['frontend','project-execution',f.id],
      queryFn : () => fetchProjectExecutionData(f.id),
      enabled : !!facilities
    }))
  })

  const isAnyLoading = isListLoading || queries.some(q => q.isLoading)
  const compiledFacilities = facilities?.map((f,i) => ({
    facilityName : f.name,
    projectCode  : f.projectCode,
    data         : calculateHierarchicalTotals(
       transformRows(
         // React-Query data shape: { tableData: [...] , metadata?: ... }
         (queries[i].data as any)?.tableData ?? []
       )
    )
  })) ?? []

  return { compiledFacilities, isLoading: isAnyLoading }
}
