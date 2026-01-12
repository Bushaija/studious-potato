# Version History Component - Quick Start Guide

## What is it?

The `VersionHistory` component displays all versions of a financial report in a table format, showing when each version was created, who created it, and what changed. Users can view specific versions or compare them with the current version.

## Quick Setup (3 steps)

### 1. Import the component

```tsx
import { VersionHistory } from "@/components/reports/version-history";
```

### 2. Add it to your page

```tsx
function ReportPage() {
  return (
    <div>
      <h1>Financial Report</h1>
      <VersionHistory reportId={123} />
    </div>
  );
}
```

### 3. Done! 🎉

The component will automatically:
- Fetch all versions for the report
- Display them in a table
- Show loading states
- Handle errors

## Add Interactivity (Optional)

Want to handle when users click "View" or "Compare"? Add callbacks:

```tsx
function ReportPage() {
  return (
    <VersionHistory 
      reportId={123}
      onViewVersion={(version) => {
        console.log("User wants to view version:", version);
        // Navigate to version view or open modal
      }}
      onCompareVersion={(version) => {
        console.log("User wants to compare version:", version);
        // Show comparison view
      }}
    />
  );
}
```

## Common Use Cases

### Show version history at bottom of report

```tsx
function FinancialReportViewer({ reportId }: { reportId: number }) {
  return (
    <div className="space-y-6">
      {/* Report content */}
      <ReportContent reportId={reportId} />
      
      {/* Version history at bottom */}
      <VersionHistory reportId={reportId} />
    </div>
  );
}
```

### Integrate with version comparison

```tsx
function ReportWithComparison({ reportId }: { reportId: number }) {
  const [compareVersion, setCompareVersion] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      {/* Show comparison if version selected */}
      {compareVersion && (
        <VersionComparison 
          reportId={reportId}
          version1={compareVersion}
          version2="current"
        />
      )}
      
      {/* Version history */}
      <VersionHistory 
        reportId={reportId}
        onCompareVersion={setCompareVersion}
      />
    </div>
  );
}
```

## What it looks like

```
┌─────────────────────────────────────────────────────────────┐
│ Version History                      Current: 1.2           │
├─────────────────────────────────────────────────────────────┤
│ Version │ Timestamp        │ Created By │ Changes Summary  │
├─────────┼──────────────────┼────────────┼──────────────────┤
│ 1.2     │ Jan 15, 2:30 PM  │ John Doe   │ Updated amounts  │
│ Current │                  │            │ [View]           │
├─────────┼──────────────────┼────────────┼──────────────────┤
│ 1.1     │ Jan 10, 9:00 AM  │ Jane Smith │ Fixed errors     │
│         │                  │            │ [View] [Compare] │
├─────────┼──────────────────┼────────────┼──────────────────┤
│ 1.0     │ Jan 5, 3:45 PM   │ John Doe   │ Initial version  │
│         │                  │            │ [View] [Compare] │
└─────────────────────────────────────────────────────────────┘
```

## Props Reference

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `reportId` | `number` | ✅ Yes | The ID of the financial report |
| `onViewVersion` | `(version: string) => void` | ❌ No | Called when "View" is clicked |
| `onCompareVersion` | `(version: string) => void` | ❌ No | Called when "Compare" is clicked |

## Features

✅ Automatic data fetching  
✅ Loading states  
✅ Error handling  
✅ Empty state messages  
✅ Current version highlighting  
✅ Responsive design  
✅ Accessible  

## Requirements Met

- **5.3**: Display version history with timestamps and creator information ✅
- **5.4**: Allow users to view specific versions ✅
- **8.1**: Enable version comparison functionality ✅
- **8.2**: Show version metadata and changes summary ✅

## Need More Help?

- See `VERSION_HISTORY_USAGE.md` for detailed documentation
- See `version-history.example.tsx` for more examples
- Check the component source code for implementation details

## Troubleshooting

**No versions showing?**
- Make sure the report has been submitted at least once
- Check that the API endpoint is working
- Verify the `reportId` is correct

**Buttons not working?**
- Add `onViewVersion` and `onCompareVersion` callbacks
- Check browser console for errors

**Styling looks wrong?**
- Ensure shadcn/ui components are installed
- Verify Tailwind CSS is configured
