# Financial Reports API Integration

This directory contains fetchers and hooks for the financial reports feature, which generates standardized financial statements from planning and execution data.

## Files Created

### Fetchers

1. **generate-statement.ts** - Generate financial statements
   - Location: `apps/client/fetchers/financial-reports/generate-statement.ts`
   - Endpoint: `POST /api/financial-reports/generate-statement`
   - Purpose: Generate standardized financial statements using template-driven approach

2. **export-statement.ts** - Export financial statements
   - Location: `apps/client/fetchers/financial-reports/export-statement.ts`
   - Endpoint: `POST /api/financial-reports/export-statement`
   - Purpose: Export generated statements to PDF, Excel, or CSV formats
   - Handles binary file download automatically

3. **get-financial-reports.ts** - List financial reports
   - Location: `apps/client/fetchers/financial-reports/get-financial-reports.ts`
   - Endpoint: `GET /api/financial-reports`
   - Purpose: Retrieve list of generated financial reports with filtering

4. **get-financial-report-by-id.ts** - Get single report
   - Location: `apps/client/fetchers/financial-reports/get-financial-report-by-id.ts`
   - Endpoint: `GET /api/financial-reports/:id`
   - Purpose: Retrieve detailed information about a specific report

5. **delete-financial-report.ts** - Delete report
   - Location: `apps/client/fetchers/financial-reports/delete-financial-report.ts`
   - Endpoint: `DELETE /api/financial-reports/:id`
   - Purpose: Delete a generated financial report

### Query Hooks

1. **use-get-financial-reports.ts** - List reports hook
   - Location: `apps/client/hooks/queries/financial-reports/use-get-financial-reports.ts`
   - Returns: Query object with reports list, loading, error states
   - Cache key includes filter parameters

2. **use-get-financial-report-by-id.ts** - Single report hook
   - Location: `apps/client/hooks/queries/financial-reports/use-get-financial-report-by-id.ts`
   - Returns: Query object with report details
   - Enabled only when ID is provided

### Mutation Hooks

1. **use-generate-statement.ts** - Generate statement hook
   - Location: `apps/client/hooks/mutations/financial-reports/use-generate-statement.ts`
   - Returns: Mutation object for generating statements
   - Handles success/error callbacks

2. **use-export-statement.ts** - Export statement hook
   - Location: `apps/client/hooks/mutations/financial-reports/use-export-statement.ts`
   - Returns: Mutation object for exporting statements
   - Automatically downloads file when mutation succeeds

3. **use-delete-financial-report.ts** - Delete report hook
   - Location: `apps/client/hooks/mutations/financial-reports/use-delete-financial-report.ts`
   - Returns: Mutation object for deleting reports
   - Automatically invalidates reports list cache on success

## Statement Types

The system supports the following financial statement types:

1. **revenue_expenditure** - Revenue & Expenditure Statement
2. **balance_sheet** - Balance Sheet
3. **cash_flow** - Cash Flow Statement
4. **net_assets_changes** - Statement of Changes in Net Assets
5. **budget_vs_actual** - Budget vs Actual Comparison

## Usage Examples

### Generating a Financial Statement

```typescript
import useGenerateStatement from "@/hooks/mutations/financial-reports/use-generate-statement";
import { useToast } from "@/hooks/use-toast";

function GenerateStatementButton() {
  const { mutate, isPending } = useGenerateStatement();
  const { toast } = useToast();

  const handleGenerate = () => {
    mutate(
      {
        statementType: "revenue_expenditure",
        facilityId: 123,
        projectId: 456,
        reportingPeriodId: 789,
        includeComparatives: true,
        includeNotes: true,
      },
      {
        onSuccess: (data) => {
          toast({
            title: "Statement Generated",
            description: `${data.statementType} has been generated successfully`,
          });
        },
        onError: (error) => {
          toast({
            title: "Generation Failed",
            description: error.message,
            variant: "destructive",
          });
        },
      }
    );
  };

  return (
    <button onClick={handleGenerate} disabled={isPending}>
      {isPending ? "Generating..." : "Generate Statement"}
    </button>
  );
}
```

### Exporting a Financial Statement

```typescript
import useExportStatement from "@/hooks/mutations/financial-reports/use-export-statement";

function ExportStatementButton({ statementData }) {
  const { mutate, isPending } = useExportStatement();

  const handleExportPDF = () => {
    mutate({
      json: {
        statementData,
        format: "pdf",
        includeHeader: true,
        includeFooter: true,
        orientation: "portrait",
      },
      filename: `revenue-expenditure-${new Date().toISOString().split('T')[0]}.pdf`,
    });
  };

  const handleExportExcel = () => {
    mutate({
      json: {
        statementData,
        format: "excel",
        includeFormulas: true,
      },
      filename: `revenue-expenditure-${new Date().toISOString().split('T')[0]}.xlsx`,
    });
  };

  return (
    <div>
      <button onClick={handleExportPDF} disabled={isPending}>
        Export PDF
      </button>
      <button onClick={handleExportExcel} disabled={isPending}>
        Export Excel
      </button>
    </div>
  );
}
```

### Listing Financial Reports

```typescript
import useGetFinancialReports from "@/hooks/queries/financial-reports/use-get-financial-reports";

function FinancialReportsList() {
  const { data, isLoading, error } = useGetFinancialReports({
    facilityId: 123,
    statementType: "revenue_expenditure",
    page: 1,
    limit: 20,
  });

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      <h2>Financial Reports</h2>
      <ul>
        {data?.data.map((report) => (
          <li key={report.id}>
            {report.statementType} - {report.generatedAt}
          </li>
        ))}
      </ul>
    </div>
  );
}
```

### Getting a Single Report

```typescript
import useGetFinancialReportById from "@/hooks/queries/financial-reports/use-get-financial-report-by-id";

function FinancialReportDetail({ reportId }) {
  const { data, isLoading, error } = useGetFinancialReportById(reportId);

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      <h2>{data?.statementType}</h2>
      <pre>{JSON.stringify(data?.statementData, null, 2)}</pre>
    </div>
  );
}
```

### Deleting a Report

```typescript
import useDeleteFinancialReport from "@/hooks/mutations/financial-reports/use-delete-financial-report";

function DeleteReportButton({ reportId }) {
  const { mutate, isPending } = useDeleteFinancialReport();

  const handleDelete = () => {
    if (confirm("Are you sure you want to delete this report?")) {
      mutate(reportId, {
        onSuccess: () => {
          alert("Report deleted successfully");
        },
      });
    }
  };

  return (
    <button onClick={handleDelete} disabled={isPending}>
      {isPending ? "Deleting..." : "Delete Report"}
    </button>
  );
}
```

## Request/Response Types

### Generate Statement Request
```typescript
{
  statementType: 'revenue_expenditure' | 'balance_sheet' | 'cash_flow' | 'net_assets_changes' | 'budget_vs_actual',
  facilityId?: number,
  projectId?: number,
  reportingPeriodId?: number,
  startDate?: string,
  endDate?: string,
  includeComparatives?: boolean,
  includeNotes?: boolean,
  customFilters?: Record<string, any>
}
```

### Generate Statement Response
```typescript
{
  id: number,
  statementType: string,
  statementData: object,
  metadata: {
    generatedAt: string,
    generatedBy: string,
    facility?: object,
    project?: object,
    reportingPeriod?: object
  }
}
```

### Export Statement Request
```typescript
{
  statementData: object,
  format: 'pdf' | 'excel' | 'csv',
  includeHeader?: boolean,
  includeFooter?: boolean,
  orientation?: 'portrait' | 'landscape',
  includeFormulas?: boolean,
  customFormatting?: Record<string, any>
}
```

### Export Statement Response
- Binary file (PDF, Excel, or CSV)
- Content-Disposition header with filename
- Appropriate Content-Type header

## Type Safety

All fetchers and hooks use TypeScript type inference from the Hono client, ensuring:
- Type-safe request parameters
- Type-safe response data
- Autocomplete support in IDEs
- Compile-time error checking

## Error Handling

All fetchers include proper error handling:
- Network errors are caught and thrown
- HTTP error responses are converted to Error objects
- Error messages are extracted from response text
- Hooks provide error state for UI feedback

## Caching Strategy

### Query Hooks
- **Financial Reports List**: Cached with filter parameters as key
- **Single Report**: Cached by report ID
- **Stale Time**: 5 minutes (React Query default)
- **Refetch**: On window focus, on reconnect

### Mutation Hooks
- **Generate Statement**: No caching (mutation)
- **Export Statement**: No caching (mutation)
- **Delete Report**: Invalidates list cache on success

## Best Practices

1. **Always handle loading states**: Show loading indicators during operations
2. **Provide error feedback**: Display error messages to users
3. **Use toast notifications**: Inform users of success/failure
4. **Disable buttons during operations**: Prevent duplicate requests
5. **Invalidate cache appropriately**: Keep data fresh after mutations
6. **Use descriptive filenames**: Include statement type and date in exports

## Notes

- TypeScript errors about property access may appear until API client types are regenerated
- The export fetcher automatically triggers browser downloads
- Delete mutation automatically invalidates the reports list cache
- All hooks follow React Query best practices
- Fetchers use the same patterns as other features in the codebase

## Related Documentation

- API Routes: `apps/server/src/api/routes/financial-reports/financial-reports.routes.ts`
- Type Definitions: `apps/server/src/api/routes/financial-reports/financial-reports.types.ts`
- Backend Handlers: `apps/server/src/api/routes/financial-reports/financial-reports.handlers.ts`

## Support

For issues or questions:
1. Check this README
2. Review the API route definitions
3. Check React Query DevTools for cache state
4. Contact the development team
