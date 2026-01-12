# Snapshot Indicator Component - Usage Guide

## Overview

The `SnapshotIndicator` component displays the data source status for financial reports, showing whether the report displays live data or a frozen snapshot.

## Requirements

- Requirements: 3.5, 5.2
- Task: 12. Create Snapshot Indicator Component

## Features

1. **Live Data Badge** - Displays for draft reports showing real-time data
2. **Snapshot Badge** - Displays for submitted/approved reports with frozen data
3. **Timestamp Display** - Shows when the snapshot was captured
4. **Outdated Warning** - Alerts users when source data has changed since snapshot
5. **Tooltips** - Provides additional context for each state

## Usage Examples

### Basic Usage - Live Data (Draft Report)

```tsx
import { SnapshotIndicator } from "@/components/reports/snapshot-indicator";

function DraftReport() {
  return (
    <div>
      <SnapshotIndicator isSnapshot={false} />
      {/* Report content */}
    </div>
  );
}
```

### Snapshot Data (Submitted/Approved Report)

```tsx
import { SnapshotIndicator } from "@/components/reports/snapshot-indicator";

function SubmittedReport() {
  return (
    <div>
      <SnapshotIndicator 
        isSnapshot={true} 
        snapshotTimestamp="2025-01-15T14:30:00Z" 
      />
      {/* Report content */}
    </div>
  );
}
```

### Outdated Snapshot Warning

```tsx
import { SnapshotIndicator } from "@/components/reports/snapshot-indicator";

function OutdatedReport() {
  return (
    <div>
      <SnapshotIndicator 
        isSnapshot={true} 
        snapshotTimestamp="2025-01-15T14:30:00Z"
        isOutdated={true}
      />
      {/* Report content */}
    </div>
  );
}
```

### Integration with Statement Generation Response

When using the statement generation API (Task 10), the response includes `snapshotMetadata`:

```tsx
import { SnapshotIndicator } from "@/components/reports/snapshot-indicator";
import { useGenerateStatement } from "@/hooks/queries/financial-reports/use-generate-statement";

function FinancialReportViewer({ reportId }: { reportId?: number }) {
  const { data } = useGenerateStatement({
    statementCode: 'REV_EXP',
    reportingPeriodId: 2,
    projectType: 'HIV',
    reportId, // Optional - if provided, returns snapshot data
  });

  const snapshotMetadata = data?.snapshotMetadata;

  return (
    <div>
      {snapshotMetadata && (
        <SnapshotIndicator 
          isSnapshot={snapshotMetadata.isSnapshot}
          snapshotTimestamp={snapshotMetadata.snapshotTimestamp}
          isOutdated={snapshotMetadata.isOutdated}
        />
      )}
      {/* Statement display */}
    </div>
  );
}
```

### Integration with Financial Report Status Card

```tsx
import { SnapshotIndicator } from "@/components/reports/snapshot-indicator";
import { FinancialReportStatusCard } from "@/components/reports/financial-report-status-card";

function ReportPage() {
  const reportId = 123;
  const reportStatus = "approved_by_daf";
  const snapshotTimestamp = "2025-01-15T14:30:00Z";
  const isOutdated = false;

  return (
    <div className="flex gap-4">
      <div className="flex-1">
        {/* Report header with snapshot indicator */}
        <div className="mb-4">
          <SnapshotIndicator 
            isSnapshot={reportStatus !== 'draft'}
            snapshotTimestamp={snapshotTimestamp}
            isOutdated={isOutdated}
          />
        </div>
        
        {/* Report content */}
      </div>
      
      <aside>
        <FinancialReportStatusCard 
          reportId={reportId}
          projectType="HIV"
          statementType="revenue-expenditure"
          reportingPeriodId={2}
        />
      </aside>
    </div>
  );
}
```

## Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `isSnapshot` | `boolean` | Yes | - | Whether the report displays snapshot data (true) or live data (false) |
| `snapshotTimestamp` | `string \| null` | No | `undefined` | ISO timestamp when snapshot was captured |
| `isOutdated` | `boolean` | No | `false` | Whether source data has changed since snapshot |

## Visual States

### Live Data Badge
- **Color**: Blue (bg-blue-50)
- **Icon**: Activity icon
- **Tooltip**: Explains that data is real-time and will update

### Snapshot Badge
- **Color**: Gray (bg-gray-100)
- **Icon**: Camera icon
- **Tooltip**: Explains that data is frozen at submission time

### Outdated Warning Badge
- **Color**: Amber (bg-amber-100)
- **Icon**: AlertCircle icon
- **Tooltip**: Explains that source data has changed and suggests resubmission

## Styling

The component uses Tailwind CSS classes and supports dark mode:

- Light mode: `bg-blue-50`, `bg-gray-100`, `bg-amber-100`
- Dark mode: `dark:bg-blue-950`, `dark:bg-gray-800`, `dark:bg-amber-950`

## Accessibility

- All badges are wrapped in tooltips for additional context
- Icons have appropriate sizing (h-3 w-3)
- Text is readable with proper contrast ratios
- Tooltips provide detailed explanations for screen readers

## Related Components

- `FinancialReportStatusCard` - Displays report approval status
- `PeriodLockBadge` (Task 13) - Shows period lock status
- `VersionComparison` (Task 14) - Compares report versions

## Next Steps

After implementing this component, you can:

1. Integrate it into the Financial Report Viewer (Task 16)
2. Use it alongside the Period Lock Badge (Task 13)
3. Display it in version history views (Task 15)
