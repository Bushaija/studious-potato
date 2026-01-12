# Financial Reports - Quick Start Guide

## 🚀 Get Started in 3 Steps

### Step 1: Import the Hook
```typescript
import useGenerateStatement from "@/hooks/mutations/financial-reports/use-generate-statement";
```

### Step 2: Use in Component
```typescript
function MyComponent() {
  const { mutate, isPending } = useGenerateStatement();
  
  return (
    <button onClick={() => mutate({ statementType: "revenue_expenditure" })}>
      Generate
    </button>
  );
}
```

### Step 3: Handle Success/Error
```typescript
mutate(params, {
  onSuccess: (data) => console.log("Success!", data),
  onError: (error) => console.error("Error:", error)
});
```

## 📋 Common Use Cases

### Generate Revenue & Expenditure Statement
```typescript
import useGenerateStatement from "@/hooks/mutations/financial-reports/use-generate-statement";

const { mutate } = useGenerateStatement();

mutate({
  statementType: "revenue_expenditure",
  facilityId: 123,
  projectId: 456,
  reportingPeriodId: 789,
  includeComparatives: true
});
```

### Export Statement as PDF
```typescript
import useExportStatement from "@/hooks/mutations/financial-reports/use-export-statement";

const { mutate } = useExportStatement();

mutate({
  json: {
    statementData: myData,
    format: "pdf",
    includeHeader: true
  },
  filename: "my-statement.pdf"
});
```

### List All Reports
```typescript
import useGetFinancialReports from "@/hooks/queries/financial-reports/use-get-financial-reports";

const { data, isLoading } = useGetFinancialReports({
  facilityId: 123
});
```

### View Single Report
```typescript
import useGetFinancialReportById from "@/hooks/queries/financial-reports/use-get-financial-report-by-id";

const { data } = useGetFinancialReportById(reportId);
```

### Delete Report
```typescript
import useDeleteFinancialReport from "@/hooks/mutations/financial-reports/use-delete-financial-report";

const { mutate } = useDeleteFinancialReport();

mutate(reportId);
```

## 🎯 Statement Types

| Type | Description |
|------|-------------|
| `revenue_expenditure` | Revenue & Expenditure Statement |
| `balance_sheet` | Balance Sheet |
| `cash_flow` | Cash Flow Statement |
| `net_assets_changes` | Statement of Changes in Net Assets |
| `budget_vs_actual` | Budget vs Actual Comparison |

## 📤 Export Formats

| Format | Extension | Use Case |
|--------|-----------|----------|
| `pdf` | .pdf | Viewing, printing, sharing |
| `excel` | .xlsx | Analysis, editing, formulas |
| `csv` | .csv | Data import, simple format |

## 🔄 Complete Workflow Example

```typescript
import { useState } from "react";
import useGenerateStatement from "@/hooks/mutations/financial-reports/use-generate-statement";
import useExportStatement from "@/hooks/mutations/financial-reports/use-export-statement";
import { useToast } from "@/hooks/use-toast";

function FinancialReportGenerator() {
  const [generatedData, setGeneratedData] = useState(null);
  const { toast } = useToast();
  
  const { mutate: generate, isPending: isGenerating } = useGenerateStatement();
  const { mutate: exportStmt, isPending: isExporting } = useExportStatement();

  const handleGenerate = () => {
    generate(
      {
        statementType: "revenue_expenditure",
        facilityId: 123,
        includeComparatives: true,
      },
      {
        onSuccess: (data) => {
          setGeneratedData(data);
          toast({ title: "Statement generated!" });
        },
        onError: (error) => {
          toast({ 
            title: "Failed to generate", 
            description: error.message,
            variant: "destructive" 
          });
        },
      }
    );
  };

  const handleExport = (format: "pdf" | "excel" | "csv") => {
    if (!generatedData) return;
    
    exportStmt({
      json: {
        statementData: generatedData.statementData,
        format,
        includeHeader: true,
      },
      filename: `statement-${Date.now()}.${format === "excel" ? "xlsx" : format}`,
    });
  };

  return (
    <div>
      <button onClick={handleGenerate} disabled={isGenerating}>
        {isGenerating ? "Generating..." : "Generate Statement"}
      </button>

      {generatedData && (
        <div>
          <h3>Export Options:</h3>
          <button onClick={() => handleExport("pdf")} disabled={isExporting}>
            Export PDF
          </button>
          <button onClick={() => handleExport("excel")} disabled={isExporting}>
            Export Excel
          </button>
          <button onClick={() => handleExport("csv")} disabled={isExporting}>
            Export CSV
          </button>
        </div>
      )}
    </div>
  );
}
```

## 💡 Pro Tips

1. **Always handle loading states** - Show spinners or disable buttons
2. **Use toast notifications** - Inform users of success/failure
3. **Cache generated statements** - Store in state to avoid regeneration
4. **Provide export options** - Let users choose their preferred format
5. **Include metadata** - Show generation date, facility, etc.
6. **Validate before generation** - Check required fields are present
7. **Handle errors gracefully** - Show user-friendly error messages
8. **Invalidate cache on delete** - Automatically handled by the hook

## 🐛 Troubleshooting

### Statement Generation Fails
- Check that facility, project, and reporting period exist
- Verify user has permission to access the data
- Check backend logs for detailed error messages

### Export Not Downloading
- Check browser popup blocker settings
- Verify Content-Disposition header is set correctly
- Try a different browser

### Reports List Empty
- Verify filters are correct
- Check that reports have been generated
- Try removing filters to see all reports

## 📚 More Resources

- **Full Documentation**: See `README.md`
- **Implementation Details**: See `IMPLEMENTATION-SUMMARY.md`
- **Hook Reference**: See `hooks/mutations/README.md`
- **API Routes**: See backend route definitions

## 🎉 You're Ready!

You now have everything you need to:
- ✅ Generate financial statements
- ✅ Export to multiple formats
- ✅ List and manage reports
- ✅ Handle errors gracefully
- ✅ Provide great UX

Happy coding! 🚀
