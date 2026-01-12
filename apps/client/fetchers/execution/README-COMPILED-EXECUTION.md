# Compiled Execution API Integration

This document describes the frontend fetchers and hooks created for the compiled execution endpoints.

## Files Created

### Fetchers

1. **get-compiled-execution.ts** - Fetcher for retrieving compiled execution data
   - Location: `apps/client/fetchers/execution/get-compiled-execution.ts`
   - Endpoint: `GET /api/execution/compiled`
   - Query Parameters: projectType, facilityType, reportingPeriodId, year, quarter, districtId

2. **export-compiled-execution.ts** - Fetcher for exporting compiled execution reports
   - Location: `apps/client/fetchers/execution/export-compiled-execution.ts`
   - Endpoint: `GET /api/execution/compiled/export`
   - Query Parameters: Same as above + format (pdf/docx), filename
   - Handles binary file download automatically

### Hooks

1. **use-get-compiled-execution.ts** - React Query hook for fetching compiled data
   - Location: `apps/client/hooks/queries/executions/use-get-compiled-execution.ts`
   - Returns: Query object with data, loading, error states
   - Cache key includes all filter parameters for proper invalidation

2. **use-export-compiled-execution.ts** - React Query mutation hook for exports
   - Location: `apps/client/hooks/mutations/executions/use-export-compiled-execution.ts`
   - Returns: Mutation object for triggering exports
   - Automatically downloads file when mutation succeeds

## Usage Examples

### Fetching Compiled Execution Data

```typescript
import useGetCompiledExecution from "@/hooks/queries/executions/use-get-compiled-execution";

function CompiledExecutionReport() {
  const { data, isLoading, error } = useGetCompiledExecution({
    projectType: "HIV",
    facilityType: "hospital",
    year: 2024,
    quarter: "Q1",
  });

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      <h1>Compiled Execution Report</h1>
      {/* Render data.data.facilities and data.data.activities */}
    </div>
  );
}
```

### Exporting Compiled Execution Report

```typescript
import useExportCompiledExecution from "@/hooks/mutations/executions/use-export-compiled-execution";

function ExportButton() {
  const { mutate, isPending } = useExportCompiledExecution();

  const handleExport = () => {
    mutate({
      query: {
        projectType: "HIV",
        facilityType: "hospital",
        year: 2024,
        quarter: "Q1",
        format: "pdf",
      },
      filename: "hiv-hospital-q1-2024.pdf",
    });
  };

  return (
    <button onClick={handleExport} disabled={isPending}>
      {isPending ? "Exporting..." : "Export as PDF"}
    </button>
  );
}
```

## Type Safety

All fetchers and hooks use TypeScript type inference from the Hono client, ensuring:
- Type-safe query parameters
- Type-safe response data
- Autocomplete support in IDEs
- Compile-time error checking

## Notes

- The TypeScript errors about the 'compiled' property may appear temporarily until the API client types are regenerated
- The export fetcher automatically handles file downloads using the browser's download mechanism
- Query parameters are reactive - changing them will trigger a new fetch
- The hooks follow the existing patterns in the codebase for consistency
