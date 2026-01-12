# Period Lock Badge Component Usage

## Overview

The `PeriodLockBadge` component displays a visual indicator when a reporting period is locked due to an approved financial report. It provides users with clear feedback about why they cannot edit data for a particular period.

## Requirements

This component implements requirements 7.1, 7.2, 7.3, and 7.4 from the Financial Report Snapshots and Period Locking specification.

## Props

```typescript
interface PeriodLockBadgeProps {
  isLocked: boolean;              // Whether the period is locked
  lockedAt?: string | null;       // ISO timestamp when period was locked
  lockedBy?: string | null;       // Name of user who locked the period
  lockedReason?: string | null;   // Reason for locking (e.g., "Report fully approved")
}
```

## Usage Examples

### Basic Usage (Period Not Locked)

```tsx
import { PeriodLockBadge } from "@/components/reports/period-lock-badge";

// When period is not locked, nothing is rendered
<PeriodLockBadge isLocked={false} />
```

### Locked Period with Full Details

```tsx
import { PeriodLockBadge } from "@/components/reports/period-lock-badge";

<PeriodLockBadge 
  isLocked={true}
  lockedAt="2025-01-15T14:30:00Z"
  lockedBy="John Doe"
  lockedReason="Report fully approved"
/>
```

### Locked Period with Minimal Details

```tsx
import { PeriodLockBadge } from "@/components/reports/period-lock-badge";

// Will use default reason text
<PeriodLockBadge isLocked={true} />
```

### Integration with Period Lock Data

```tsx
import { PeriodLockBadge } from "@/components/reports/period-lock-badge";
import { usePeriodLocks } from "@/hooks/queries/period-locks/use-period-locks";

function ReportHeader({ facilityId, reportingPeriodId, projectId }) {
  const { data: locks } = usePeriodLocks(facilityId);
  
  const periodLock = locks?.locks.find(
    lock => 
      lock.reportingPeriodId === reportingPeriodId &&
      lock.projectId === projectId &&
      lock.isLocked
  );
  
  return (
    <div className="flex items-center gap-2">
      <h2>Financial Report</h2>
      <PeriodLockBadge 
        isLocked={!!periodLock}
        lockedAt={periodLock?.lockedAt}
        lockedBy={periodLock?.lockedByUser?.name}
        lockedReason={periodLock?.lockedReason}
      />
    </div>
  );
}
```

### Integration with Financial Report Data

```tsx
import { PeriodLockBadge } from "@/components/reports/period-lock-badge";

function FinancialReportViewer({ report, periodLock }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <h1>{report.title}</h1>
        <PeriodLockBadge 
          isLocked={periodLock?.isLocked ?? false}
          lockedAt={periodLock?.lockedAt}
          lockedBy={periodLock?.lockedByUser?.name}
          lockedReason={periodLock?.lockedReason}
        />
      </div>
      {/* Report content */}
    </div>
  );
}
```

## Visual Appearance

### Badge
- **Color**: Red background with red text (destructive variant)
- **Icon**: Lock icon from lucide-react
- **Text**: "Period Locked"

### Tooltip Content
The tooltip displays:
1. **Title**: "This reporting period is locked."
2. **Reason**: Custom reason or default text
3. **Locked By**: User who locked the period (if available)
4. **Locked At**: Formatted timestamp (if available)
5. **Help Text**: Instructions to contact administrator

## Styling

The component uses Tailwind CSS classes for styling:
- Light mode: `bg-red-100 border-red-300 text-red-800`
- Dark mode: `dark:bg-red-950 dark:border-red-800 dark:text-red-300`

## Accessibility

- Uses semantic HTML with proper ARIA attributes via Radix UI
- Tooltip provides additional context for screen readers
- Badge is keyboard accessible via TooltipTrigger

## Date Formatting

Dates are formatted as: "Jan 15, 2025 at 2:30 PM"

The component uses `toLocaleDateString` with the following options:
- Month: short (e.g., "Jan")
- Day: numeric
- Year: numeric
- Hour: numeric
- Minute: 2-digit
- 12-hour format

## Related Components

- `SnapshotIndicator`: Shows whether report displays live or snapshot data
- `FinancialReportStatusCard`: Displays overall report status
- `ReportHeader`: Main header component for financial reports

## API Integration

This component is typically used with data from:
- `GET /period-locks?facilityId={id}` - List all locks for a facility
- Period lock data embedded in financial report responses

## Notes

- The component returns `null` when `isLocked` is `false`, so it won't take up space in the layout
- All optional props (`lockedAt`, `lockedBy`, `lockedReason`) gracefully handle `null` or `undefined` values
- The default reason text is: "This period is locked due to an approved financial report."
