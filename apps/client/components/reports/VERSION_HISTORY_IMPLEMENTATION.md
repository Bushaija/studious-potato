# Version History Component - Implementation Guide

## Overview

This document provides a comprehensive guide for implementing and integrating the Version History component into the Budget Management System (BMS).

## Requirements Addressed

- **5.3**: Display version history with timestamps and creator information
- **5.4**: Allow users to view specific versions
- **8.1**: Enable version comparison functionality
- **8.2**: Show version metadata and changes summary

## Component Architecture

### File Structure

```
apps/client/components/reports/
├── version-history.tsx                    # Main component
├── version-history.example.tsx            # Usage examples
├── VERSION_HISTORY_USAGE.md              # Detailed usage guide
├── VERSION_HISTORY_QUICK_START.md        # Quick start guide
├── VERSION_HISTORY_IMPLEMENTATION.md     # This file
└── __tests__/
    └── version-history.test.tsx          # Component tests
```

### Dependencies

The component relies on:

1. **Data Fetching**
   - `@/hooks/queries/financial-reports/use-report-versions` - React Query hook
   - `@/fetchers/financial-reports/get-report-versions` - API fetcher
   - `@/types/version-control` - TypeScript types

2. **UI Components** (shadcn/ui)
   - Badge
   - Button
   - Card
   - Skeleton
   - Table

3. **Icons** (lucide-react)
   - Clock
   - Eye
   - GitCompare
   - User

## Implementation Steps

### Step 1: Verify Prerequisites

Ensure the following are in place:

1. **API Endpoint**: `GET /financial-reports/:id/versions`
   ```typescript
   interface GetReportVersionsResponse {
     reportId: number;
     currentVersion: string;
     versions: ReportVersion[];
   }
   ```

2. **Database Tables**:
   - `report_versions` table exists
   - Proper foreign keys and indexes

3. **Backend Services**:
   - `VersionService` implemented
   - Version creation on report submission

### Step 2: Install Component

The component is already created at:
```
apps/client/components/reports/version-history.tsx
```

No installation needed - it's ready to use!

### Step 3: Basic Integration

Add to your report viewer:

```tsx
import { VersionHistory } from "@/components/reports/version-history";

function FinancialReportViewer({ reportId }: { reportId: number }) {
  return (
    <div className="space-y-6">
      {/* Report content */}
      <ReportContent reportId={reportId} />
      
      {/* Version history */}
      <VersionHistory reportId={reportId} />
    </div>
  );
}
```

### Step 4: Add Interactivity (Optional)

Implement view and compare handlers:

```tsx
import { useState } from "react";
import { VersionHistory } from "@/components/reports/version-history";
import { VersionComparison } from "@/components/reports/version-comparison";

function FinancialReportViewer({ reportId }: { reportId: number }) {
  const [mode, setMode] = useState<"current" | "version" | "compare">("current");
  const [selectedVersion, setSelectedVersion] = useState<string | null>(null);
  const [compareVersion, setCompareVersion] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      {/* Mode-based content */}
      {mode === "current" && <CurrentReportView reportId={reportId} />}
      {mode === "version" && selectedVersion && (
        <VersionView reportId={reportId} versionNumber={selectedVersion} />
      )}
      {mode === "compare" && compareVersion && (
        <VersionComparison 
          reportId={reportId}
          version1={compareVersion}
          version2="current"
        />
      )}
      
      {/* Version history with handlers */}
      <VersionHistory 
        reportId={reportId}
        onViewVersion={(version) => {
          setSelectedVersion(version);
          setMode("version");
        }}
        onCompareVersion={(version) => {
          setCompareVersion(version);
          setMode("compare");
        }}
      />
    </div>
  );
}
```

## Component Features

### 1. Automatic Data Fetching

The component automatically fetches version data using React Query:

```typescript
const { data, isLoading, error } = useReportVersions(reportId);
```

Benefits:
- Automatic caching
- Background refetching
- Error handling
- Loading states

### 2. Loading States

Shows skeleton loaders while fetching:

```tsx
<Skeleton className="h-12 w-full" />
```

### 3. Error Handling

Displays user-friendly error messages:

```tsx
<div className="text-center py-8 text-muted-foreground">
  <p>Failed to load version history.</p>
  <p className="text-sm mt-2">{error.message}</p>
</div>
```

### 4. Empty State

Shows helpful message when no versions exist:

```tsx
<div className="text-center py-8 text-muted-foreground">
  <p>No version history available.</p>
  <p className="text-sm mt-2">
    Versions are created when a report is submitted or resubmitted.
  </p>
</div>
```

### 5. Current Version Highlighting

The current version is visually distinguished:
- Primary badge styling
- "Current" label
- No "Compare" button

### 6. Action Buttons

Each version row includes:
- **View Button**: Opens specific version
- **Compare Button**: Compares with current (not shown for current version)

## Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    VersionHistory Component                  │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│              useReportVersions Hook (React Query)            │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│              getReportVersions Fetcher                       │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│         API: GET /financial-reports/:id/versions             │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│              Backend: VersionService                         │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│              Database: report_versions table                 │
└─────────────────────────────────────────────────────────────┘
```

## Styling and Theming

The component uses Tailwind CSS and shadcn/ui for consistent styling:

### Color Scheme

- **Current Version Badge**: Primary color (blue)
- **Version Numbers**: Outlined badges
- **Text**: Muted foreground for secondary info
- **Icons**: Muted foreground, sized at 3x3

### Responsive Design

The component is fully responsive:
- Table scrolls horizontally on mobile
- Buttons stack appropriately
- Text sizes adjust for readability

### Dark Mode

Fully supports dark mode through Tailwind's dark mode utilities.

## Testing

### Unit Tests

The component includes comprehensive tests:

```bash
# Run tests
npm test version-history.test.tsx
```

Test coverage includes:
- Loading states
- Error states
- Empty states
- Version list display
- Action buttons
- Current version highlighting
- Accessibility
- Edge cases

### Manual Testing Checklist

- [ ] Component renders without errors
- [ ] Loading state displays correctly
- [ ] Error state shows appropriate message
- [ ] Empty state displays when no versions
- [ ] All versions display in table
- [ ] Current version is highlighted
- [ ] Timestamps are formatted correctly
- [ ] Creator names display
- [ ] Changes summaries show
- [ ] View buttons work
- [ ] Compare buttons work (not on current version)
- [ ] Responsive on mobile
- [ ] Dark mode works
- [ ] Keyboard navigation works

## Performance Considerations

### Optimization Strategies

1. **React Query Caching**
   - Versions are cached for 5 minutes
   - Background refetching on window focus
   - Stale-while-revalidate pattern

2. **Conditional Rendering**
   - Only renders when data is available
   - Skips unnecessary re-renders

3. **Lazy Loading**
   - Component can be code-split if needed
   - Table rows render efficiently

### Performance Metrics

Expected performance:
- Initial render: < 100ms
- Data fetch: < 500ms (depends on network)
- Re-render on data change: < 50ms

## Accessibility

### ARIA Support

- Proper table structure with headers
- Accessible button labels
- Screen reader friendly content

### Keyboard Navigation

- Tab through action buttons
- Enter/Space to activate buttons
- Table navigation with arrow keys

### Screen Reader Support

- Descriptive labels for all interactive elements
- Status messages for loading/error states
- Semantic HTML structure

## Troubleshooting

### Common Issues

#### 1. No versions displayed

**Symptoms**: Empty state shows even though versions exist

**Solutions**:
- Check API endpoint is returning data
- Verify `reportId` is correct
- Check browser console for errors
- Verify database has version records

#### 2. Action buttons not working

**Symptoms**: Clicking buttons does nothing

**Solutions**:
- Implement `onViewVersion` and `onCompareVersion` callbacks
- Check console for JavaScript errors
- Verify event handlers are properly bound

#### 3. Styling issues

**Symptoms**: Component looks broken or unstyled

**Solutions**:
- Ensure all shadcn/ui components are installed
- Verify Tailwind CSS is configured
- Check for CSS conflicts
- Clear browser cache

#### 4. TypeScript errors

**Symptoms**: Type errors in IDE

**Solutions**:
- Ensure all types are imported correctly
- Verify `@/types/version-control` exists
- Check TypeScript version compatibility

### Debug Mode

Enable debug logging:

```tsx
import { VersionHistory } from "@/components/reports/version-history";

function DebugVersionHistory({ reportId }: { reportId: number }) {
  const { data, isLoading, error } = useReportVersions(reportId);
  
  console.log("Version History Debug:", { data, isLoading, error });
  
  return <VersionHistory reportId={reportId} />;
}
```

## Integration with Other Components

### With Version Comparison

```tsx
<VersionHistory 
  reportId={reportId}
  onCompareVersion={(version) => {
    // Show comparison component
    setCompareVersion(version);
  }}
/>

{compareVersion && (
  <VersionComparison 
    reportId={reportId}
    version1={compareVersion}
    version2="current"
  />
)}
```

### With Snapshot Indicator

```tsx
<div className="space-y-4">
  <SnapshotIndicator 
    isSnapshot={true}
    snapshotTimestamp={report.snapshotTimestamp}
  />
  <VersionHistory reportId={reportId} />
</div>
```

### With Period Lock Badge

```tsx
<div className="space-y-4">
  <PeriodLockBadge 
    isLocked={report.periodLock?.isLocked}
    lockedAt={report.periodLock?.lockedAt}
  />
  <VersionHistory reportId={reportId} />
</div>
```

## Best Practices

### 1. Always Provide Valid Report ID

```tsx
// ✅ Good
<VersionHistory reportId={123} />

// ❌ Bad
<VersionHistory reportId={undefined} />
```

### 2. Implement Callbacks for Full Functionality

```tsx
// ✅ Good - Full functionality
<VersionHistory 
  reportId={123}
  onViewVersion={handleView}
  onCompareVersion={handleCompare}
/>

// ⚠️ Okay - Limited functionality
<VersionHistory reportId={123} />
```

### 3. Handle Loading and Error States

```tsx
// ✅ Good - Component handles internally
<VersionHistory reportId={123} />

// ✅ Also good - Custom handling
{isLoading ? (
  <CustomLoader />
) : (
  <VersionHistory reportId={123} />
)}
```

### 4. Use Error Boundaries

```tsx
// ✅ Good
<ErrorBoundary>
  <VersionHistory reportId={123} />
</ErrorBoundary>
```

### 5. Optimize Re-renders

```tsx
// ✅ Good - Memoize callbacks
const handleViewVersion = useCallback((version: string) => {
  // Handle view
}, []);

<VersionHistory 
  reportId={123}
  onViewVersion={handleViewVersion}
/>
```

## Future Enhancements

Potential improvements:

1. **Pagination**: For reports with many versions
2. **Filtering**: Filter by date range or creator
3. **Sorting**: Sort by version, date, or creator
4. **Bulk Actions**: Compare multiple versions at once
5. **Export**: Export version history as PDF/CSV
6. **Diff View**: Inline diff view in the table
7. **Version Notes**: Add notes to versions
8. **Version Tagging**: Tag important versions

## Support and Resources

- **Component Source**: `apps/client/components/reports/version-history.tsx`
- **Usage Guide**: `VERSION_HISTORY_USAGE.md`
- **Quick Start**: `VERSION_HISTORY_QUICK_START.md`
- **Examples**: `version-history.example.tsx`
- **Tests**: `__tests__/version-history.test.tsx`

## Changelog

### Version 1.0.0 (Initial Release)

- ✅ Display version list with metadata
- ✅ Show current version indicator
- ✅ View and compare actions
- ✅ Loading and error states
- ✅ Empty state handling
- ✅ Responsive design
- ✅ Accessibility support
- ✅ Comprehensive tests
- ✅ Documentation

## License

Part of the Budget Management System (BMS) - Internal Use Only
