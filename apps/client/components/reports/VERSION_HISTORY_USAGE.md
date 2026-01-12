# Version History Component Usage Guide

## Overview

The `VersionHistory` component displays a comprehensive list of all versions of a financial report, including timestamps, creator information, and changes summaries. It provides actions to view specific versions or compare them with the current version.

## Requirements

- **5.3**: Display version history with timestamps and creator information
- **5.4**: Allow users to view specific versions
- **8.1**: Enable version comparison functionality
- **8.2**: Show version metadata and changes summary

## Installation

The component is located at:
```
apps/client/components/reports/version-history.tsx
```

## Dependencies

- `@tanstack/react-query` - For data fetching
- `lucide-react` - For icons
- `@/components/ui/*` - shadcn/ui components
- `@/hooks/queries/financial-reports/use-report-versions` - Custom hook for fetching versions
- `@/types/version-control` - TypeScript types

## Basic Usage

```tsx
import { VersionHistory } from "@/components/reports/version-history";

function ReportPage() {
  return (
    <div>
      <h1>Financial Report</h1>
      <VersionHistory reportId={123} />
    </div>
  );
}
```

## Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `reportId` | `number` | Yes | The ID of the financial report |
| `onViewVersion` | `(versionNumber: string) => void` | No | Callback when "View" button is clicked |
| `onCompareVersion` | `(versionNumber: string) => void` | No | Callback when "Compare" button is clicked |

## Examples

### Basic Usage

Display version history without custom handlers:

```tsx
<VersionHistory reportId={123} />
```

### With Custom View Handler

Handle viewing a specific version:

```tsx
function ReportViewer() {
  const [selectedVersion, setSelectedVersion] = useState<string | null>(null);

  return (
    <>
      <VersionHistory 
        reportId={123}
        onViewVersion={(version) => {
          setSelectedVersion(version);
          // Navigate to version view or open modal
        }}
      />
      
      {selectedVersion && (
        <VersionViewer 
          reportId={123} 
          versionNumber={selectedVersion} 
        />
      )}
    </>
  );
}
```

### With Comparison Handler

Handle comparing versions:

```tsx
function ReportComparison() {
  const [compareVersion, setCompareVersion] = useState<string | null>(null);
  const currentVersion = "1.2";

  return (
    <>
      <VersionHistory 
        reportId={123}
        onCompareVersion={(version) => {
          setCompareVersion(version);
        }}
      />
      
      {compareVersion && (
        <VersionComparison 
          reportId={123}
          version1={compareVersion}
          version2={currentVersion}
        />
      )}
    </>
  );
}
```

### Integrated with Report Viewer

Full integration in a report viewer:

```tsx
import { VersionHistory } from "@/components/reports/version-history";
import { VersionComparison } from "@/components/reports/version-comparison";
import { useState } from "react";

function FinancialReportViewer({ reportId }: { reportId: number }) {
  const [viewMode, setViewMode] = useState<"current" | "version" | "compare">("current");
  const [selectedVersion, setSelectedVersion] = useState<string | null>(null);
  const [compareVersion, setCompareVersion] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      {/* Report Header */}
      <div>
        <h1>Financial Report</h1>
      </div>

      {/* Main Content */}
      {viewMode === "current" && (
        <ReportContent reportId={reportId} />
      )}

      {viewMode === "version" && selectedVersion && (
        <ReportContent reportId={reportId} versionNumber={selectedVersion} />
      )}

      {viewMode === "compare" && compareVersion && (
        <VersionComparison 
          reportId={reportId}
          version1={compareVersion}
          version2="current"
        />
      )}

      {/* Version History */}
      <VersionHistory 
        reportId={reportId}
        onViewVersion={(version) => {
          setSelectedVersion(version);
          setViewMode("version");
        }}
        onCompareVersion={(version) => {
          setCompareVersion(version);
          setViewMode("compare");
        }}
      />
    </div>
  );
}
```

## Features

### 1. Version List Display

The component displays all versions in a table format with:
- Version number (with "Current" badge for active version)
- Timestamp of when the version was created
- Creator name
- Changes summary
- Action buttons

### 2. Current Version Indicator

The current version is highlighted with:
- Primary badge styling
- "Current" label
- No "Compare" button (can't compare with itself)

### 3. Action Buttons

Each version row includes:
- **View Button**: Opens the specific version for viewing
- **Compare Button**: Compares the version with the current version (not shown for current version)

### 4. Loading States

The component shows skeleton loaders while fetching data:
```tsx
<Skeleton className="h-12 w-full" />
```

### 5. Error Handling

Displays user-friendly error messages if data fetching fails.

### 6. Empty State

Shows helpful message when no versions are available.

## Styling

The component uses Tailwind CSS and shadcn/ui components for consistent styling:

- **Card**: Container with header and content sections
- **Table**: Structured display of version information
- **Badges**: Version numbers and status indicators
- **Buttons**: Action buttons with icons
- **Icons**: lucide-react icons for visual clarity

## Data Structure

The component expects data from the `useReportVersions` hook:

```typescript
interface GetReportVersionsResponse {
  reportId: number;
  currentVersion: string;
  versions: ReportVersion[];
}

interface ReportVersion {
  id: number;
  reportId: number;
  versionNumber: string;
  snapshotData: SnapshotData;
  snapshotChecksum: string;
  snapshotTimestamp: string;
  createdBy: number;
  createdAt: string;
  changesSummary: string | null;
  creator?: {
    id: number;
    name: string;
    email: string;
  };
}
```

## Accessibility

The component includes:
- Semantic HTML structure
- Proper ARIA labels on interactive elements
- Keyboard navigation support
- Screen reader friendly content

## Performance Considerations

- Uses React Query for efficient data fetching and caching
- Conditional rendering to avoid unnecessary re-renders
- Optimized table rendering for large version lists

## Best Practices

1. **Always provide reportId**: The component requires a valid report ID to function
2. **Handle callbacks**: Implement `onViewVersion` and `onCompareVersion` for full functionality
3. **Error boundaries**: Wrap the component in an error boundary for production use
4. **Loading states**: The component handles its own loading states
5. **Responsive design**: The table is responsive and works on mobile devices

## Related Components

- `VersionComparison` - Compare two versions side-by-side
- `SnapshotIndicator` - Show snapshot status
- `PeriodLockBadge` - Display period lock status

## Troubleshooting

### No versions displayed

- Ensure the report has been submitted at least once
- Check that the API endpoint is returning data
- Verify the `reportId` is correct

### Action buttons not working

- Implement the `onViewVersion` and `onCompareVersion` callbacks
- Check console for errors

### Styling issues

- Ensure all shadcn/ui components are properly installed
- Verify Tailwind CSS is configured correctly

## API Integration

The component uses the following API endpoint:

```
GET /financial-reports/:id/versions
```

Response format:
```json
{
  "reportId": 123,
  "currentVersion": "1.2",
  "versions": [
    {
      "id": 1,
      "reportId": 123,
      "versionNumber": "1.0",
      "snapshotTimestamp": "2025-01-15T14:30:00Z",
      "createdBy": 5,
      "createdAt": "2025-01-15T14:30:00Z",
      "changesSummary": "Initial version",
      "creator": {
        "id": 5,
        "name": "John Doe",
        "email": "john@example.com"
      }
    }
  ]
}
```

## Testing

Example test cases:

```tsx
import { render, screen } from "@testing-library/react";
import { VersionHistory } from "./version-history";

describe("VersionHistory", () => {
  it("renders version list", () => {
    render(<VersionHistory reportId={123} />);
    expect(screen.getByText("Version History")).toBeInTheDocument();
  });

  it("calls onViewVersion when View button clicked", () => {
    const handleView = jest.fn();
    render(<VersionHistory reportId={123} onViewVersion={handleView} />);
    // Click view button and verify callback
  });
});
```
