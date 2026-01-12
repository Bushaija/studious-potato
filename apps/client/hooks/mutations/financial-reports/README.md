# Financial Reports Hooks - Quick Reference

## Mutation Hooks

### useGenerateStatement
Generate a financial statement from planning and execution data.

```typescript
import useGenerateStatement from "@/hooks/mutations/financial-reports/use-generate-statement";

const { mutate, isPending, error } = useGenerateStatement();

mutate({
  statementType: "revenue_expenditure",
  facilityId: 123,
  projectId: 456,
  reportingPeriodId: 789,
});
```

### useExportStatement
Export a generated statement to PDF, Excel, or CSV.

```typescript
import useExportStatement from "@/hooks/mutations/financial-reports/use-export-statement";

const { mutate, isPending } = useExportStatement();

mutate({
  json: {
    statementData: data,
    format: "pdf",
  },
  filename: "statement.pdf",
});
```

### useDeleteFinancialReport
Delete a generated financial report.

```typescript
import useDeleteFinancialReport from "@/hooks/mutations/financial-reports/use-delete-financial-report";

const { mutate, isPending } = useDeleteFinancialReport();

mutate(reportId);
```

## Query Hooks

### useGetFinancialReports
Fetch a list of financial reports with optional filtering.

```typescript
import useGetFinancialReports from "@/hooks/queries/financial-reports/use-get-financial-reports";

const { data, isLoading, error } = useGetFinancialReports({
  facilityId: 123,
  statementType: "revenue_expenditure",
});
```

### useGetFinancialReportById
Fetch a single financial report by ID.

```typescript
import useGetFinancialReportById from "@/hooks/queries/financial-reports/use-get-financial-report-by-id";

const { data, isLoading, error } = useGetFinancialReportById(reportId);
```

## Complete Example

```typescript
import { useState } from "react";
import useGenerateStatement from "@/hooks/mutations/financial-reports/use-generate-statement";
import useExportStatement from "@/hooks/mutations/financial-reports/use-export-statement";
import useGetFinancialReports from "@/hooks/queries/financial-reports/use-get-financial-reports";
import { useToast } from "@/hooks/use-toast";

function FinancialReportsPage() {
  const [selectedFacility, setSelectedFacility] = useState(123);
  const { toast } = useToast();

  // Fetch reports list
  const { data: reports, isLoading } = useGetFinancialReports({
    facilityId: selectedFacility,
  });

  // Generate statement mutation
  const { mutate: generate, isPending: isGenerating } = useGenerateStatement();

  // Export statement mutation
  const { mutate: exportStmt, isPending: isExporting } = useExportStatement();

  const handleGenerate = () => {
    generate(
      {
        statementType: "revenue_expenditure",
        facilityId: selectedFacility,
        includeComparatives: true,
      },
      {
        onSuccess: (data) => {
          toast({ title: "Statement generated successfully" });
          // Optionally export immediately
          handleExport(data.statementData);
        },
        onError: (error) => {
          toast({
            title: "Generation failed",
            description: error.message,
            variant: "destructive",
          });
        },
      }
    );
  };

  const handleExport = (statementData: any) => {
    exportStmt({
      json: {
        statementData,
        format: "pdf",
        includeHeader: true,
      },
      filename: `statement-${Date.now()}.pdf`,
    });
  };

  return (
    <div>
      <button onClick={handleGenerate} disabled={isGenerating}>
        {isGenerating ? "Generating..." : "Generate Statement"}
      </button>

      {isLoading ? (
        <div>Loading reports...</div>
      ) : (
        <ul>
          {reports?.data.map((report) => (
            <li key={report.id}>
              {report.statementType}
              <button onClick={() => handleExport(report.statementData)}>
                Export
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```
