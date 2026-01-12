# Version Comparison - Quick Start Guide

## Installation

All necessary files have been created. No additional dependencies are required beyond what's already in the project.

## Basic Usage

```tsx
import { VersionComparison } from "@/components/reports/version-comparison";

<VersionComparison reportId={123} />
```

## With Default Versions

```tsx
<VersionComparison 
  reportId={123}
  defaultVersion1="1.0"
  defaultVersion2="1.1"
/>
```

## In a Card

```tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { VersionComparison } from "@/components/reports/version-comparison";

<Card>
  <CardHeader>
    <CardTitle>Compare Report Versions</CardTitle>
  </CardHeader>
  <CardContent>
    <VersionComparison reportId={reportId} />
  </CardContent>
</Card>
```

## API Setup Required

Before using this component, ensure these endpoints are implemented:

1. **GET** `/financial-reports/:id/versions` - List all versions
2. **POST** `/financial-reports/:id/versions/compare` - Compare two versions

See `VERSION_COMPARISON_USAGE.md` for detailed API specifications.

## Features

✅ Version selection dropdowns  
✅ Summary card with statistics  
✅ Line-by-line differences table  
✅ Color-coded changes (green/red)  
✅ Bold highlighting for significant changes (>5%)  
✅ Export to CSV  
✅ Loading states  
✅ Empty states  
✅ Dark mode support  
✅ Responsive design  

## Files Created

- `version-comparison.tsx` - Main component
- `version-control.ts` - TypeScript types
- `get-report-versions.ts` - Fetcher for versions list
- `compare-versions.ts` - Fetcher for comparison
- `use-report-versions.ts` - React Query hook
- `use-version-comparison.ts` - React Query hook

## Example Implementations

See `version-comparison.example.tsx` for three complete examples:
1. Dedicated versions page
2. Tabbed report view
3. Pre-selected versions comparison

## Troubleshooting

**No versions showing?**
- Ensure the API endpoint is implemented
- Check that the report has multiple versions
- Verify the reportId is correct

**Comparison not loading?**
- Both versions must be selected
- Check browser console for API errors
- Verify the compare endpoint is working

**Export not working?**
- Export works client-side, no server required
- Check browser console for JavaScript errors
- Ensure both versions are selected and comparison data is loaded

## Next Steps

1. Implement the backend API endpoints (Tasks 4 and 9)
2. Test with real report data
3. Integrate into your report viewing pages
4. Customize styling if needed

For more details, see `VERSION_COMPARISON_USAGE.md` and `VERSION_COMPARISON_IMPLEMENTATION.md`.
