# Version Comparison Component Usage Guide

## Overview

The `VersionComparison` component provides a comprehensive interface for comparing two versions of a financial report. It displays version selectors, a summary of differences, and a detailed line-by-line comparison table.

## Features

- **Version Selection**: Dropdown selectors for choosing two versions to compare
- **Summary Card**: Displays total differences and significant changes (>5%)
- **Detailed Table**: Line-by-line comparison with:
  - Line name and field
  - Values from both versions
  - Absolute difference
  - Percentage change
  - Color-coding for increases (green) and decreases (red)
  - Bold highlighting for significant changes (>5%)
- **Export Functionality**: Download comparison as CSV file
- **Loading States**: Skeleton loaders while data is being fetched
- **Empty States**: Helpful messages when no versions are selected or no differences found

## Requirements Addressed

- **8.1**: Display version history list
- **8.2**: Show side-by-side comparison
- **8.3**: Highlight differences in amounts, line items, and totals
- **8.4**: Display timestamp and submitter for each version
- **8.5**: Allow users to download comparison report

## Basic Usage

```tsx
import { VersionComparison } from "@/components/reports/version-comparison";

function ReportPage() {
  return (
    <div>
      <h1>Financial Report Comparison</h1>
      <VersionComparison reportId={123} />
    </div>
  );
}
```

## With Default Versions

```tsx
<VersionComparison 
  reportId={123} 
  defaultVersion1="1.0"
  defaultVersion2="1.1"
/>
```

## Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `reportId` | `number` | Yes | The ID of the financial report to compare versions for |
| `defaultVersion1` | `string` | No | Default version number for the first selector (base version) |
| `defaultVersion2` | `string` | No | Default version number for the second selector (compare version) |

## API Dependencies

The component requires the following API endpoints to be implemented:

### GET /financial-reports/:id/versions

Returns all versions for a report:

```typescript
{
  reportId: number;
  currentVersion: string;
  versions: Array<{
    versionNumber: string;
    snapshotTimestamp: string;
    createdBy: string;
    changesSummary: string;
  }>;
}
```

### POST /financial-reports/:id/versions/compare

Compares two versions:

```typescript
// Request
{
  version1: string;
  version2: string;
}

// Response
{
  version1: string;
  version2: string;
  differences: Array<{
    lineCode: string;
    lineName: string;
    field: string;
    version1Value: number;
    version2Value: number;
    difference: number;
    percentageChange: number;
  }>;
  summary: {
    totalDifferences: number;
    significantChanges: number;
  };
}
```

## Styling

The component uses:
- Tailwind CSS for styling
- shadcn/ui components (Badge, Button, Card, Select, Table, etc.)
- Dark mode support
- Responsive design with mobile-friendly layouts

## Color Coding

- **Green**: Positive changes (increases)
- **Red**: Negative changes (decreases)
- **Bold**: Significant changes (>5% difference)
- **Amber**: Warning for significant changes count in summary

## Export Format

The CSV export includes:
- Line name
- Field name
- Version 1 value
- Version 2 value
- Absolute difference
- Percentage change

Filename format: `version-comparison-{version1}-vs-{version2}.csv`

## Integration Example

```tsx
import { VersionComparison } from "@/components/reports/version-comparison";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function FinancialReportVersionsPage({ reportId }: { reportId: number }) {
  return (
    <div className="container mx-auto py-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Report Version Comparison</CardTitle>
        </CardHeader>
        <CardContent>
          <VersionComparison reportId={reportId} />
        </CardContent>
      </Card>
    </div>
  );
}
```

## Notes

- The component automatically fetches available versions when mounted
- Comparison is only performed when both versions are selected
- The component handles loading and error states gracefully
- Currency values are formatted using the `formatCurrency` utility (RWF format)
- Percentage changes are displayed with 2 decimal places
- The export feature works client-side without requiring server support
