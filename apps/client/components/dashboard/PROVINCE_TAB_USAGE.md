# Province Tab Implementation - Usage Guide

## Overview

The Province Tab has been successfully implemented with all required features:
- Filter bar with province, program, and quarter filters
- 4 summary metric cards (Allocated, Spent, Remaining, Utilization)
- Pie chart for program distribution
- Bar chart for budget by district
- Province approval summary table
- Responsive grid layout
- Loading states with skeletons
- Error handling with retry functionality
- URL query parameter persistence

## Components Created

### 1. ProvinceTab (Presentational Component)
Location: `apps/client/components/dashboard/ProvinceTab.tsx`

Pure presentational component that receives all data and handlers as props.

### 2. ProvinceTabContainer (Data Container)
Location: `apps/client/components/dashboard/ProvinceTabContainer.tsx`

Handles all data fetching using React Query hooks:
- `useGetMetrics` - Fetches summary metrics
- `useGetProgramDistribution` - Fetches program distribution data
- `useGetBudgetByDistrict` - Fetches district budget data
- `useGetProvinceApprovals` - Fetches approval summary data
- `useGetProvinces` - Fetches provinces for filter dropdown
- `useGetProjects` - Fetches projects to extract program types

### 3. EnhancedDashboard (Main Dashboard Component)
Location: `apps/client/components/dashboard/EnhancedDashboard.tsx`

Main dashboard component that:
- Manages tab state (Province/District)
- Manages filter state
- Syncs state with URL query parameters
- Handles tab switching and filter interactions
- Provides drill-down functionality (district click → switch to District tab)

## Usage

### Option 1: Use EnhancedDashboard (Recommended)

Replace the existing dashboard page with the new EnhancedDashboard:

```tsx
// apps/client/app/dashboard/page.tsx
"use client";

import { EnhancedDashboard } from "@/components/dashboard/EnhancedDashboard";

const DashboardPage = () => {
  return <EnhancedDashboard />;
};

export default DashboardPage;
```

### Option 2: Use ProvinceTabContainer Directly

If you want more control over the layout:

```tsx
"use client";

import { useState } from "react";
import { ProvinceTabContainer } from "@/components/dashboard/ProvinceTabContainer";

export function MyDashboard() {
  const [provinceId, setProvinceId] = useState<string>();
  const [programId, setProgramId] = useState<string>();
  const [quarter, setQuarter] = useState<string>();

  return (
    <div>
      <h1>My Custom Dashboard</h1>
      <ProvinceTabContainer
        provinceId={provinceId}
        programId={programId}
        quarter={quarter}
        onProvinceChange={setProvinceId}
        onProgramChange={setProgramId}
        onQuarterChange={setQuarter}
        onClearFilters={() => {
          setProvinceId(undefined);
          setProgramId(undefined);
          setQuarter(undefined);
        }}
        onDistrictClick={(districtId) => {
          console.log("District clicked:", districtId);
          // Handle district click (e.g., navigate to district view)
        }}
      />
    </div>
  );
}
```

## Features Implemented

### ✅ Filter Bar
- Province dropdown (populated from API)
- Program dropdown (extracted from projects)
- Quarter dropdown (Q1-Q4)
- Clear filters button
- Responsive layout

### ✅ Summary Metrics Cards
- Total Allocated Budget (Blue)
- Total Spent (Green)
- Remaining Budget (Orange)
- Utilization Percentage (Purple)
- Color-coded based on utilization rate

### ✅ Program Distribution Pie Chart
- Shows budget allocation by program
- Displays percentages on slices
- Interactive tooltips with budget amounts
- Legend with program names
- Empty state handling

### ✅ Budget by District Bar Chart
- Sorted by allocated budget (descending)
- Shows allocated and spent budgets
- Hover tooltips with utilization percentage
- Responsive axis labels
- Empty state handling

### ✅ Province Approval Summary Table
- Columns: ID, District Name, Allocated Budget, Approved Count, Rejected Count, Pending Count, Approval Rate
- Sortable columns
- Pagination (20 rows per page)
- Click row to drill down to District tab
- Color-coded approval counts

### ✅ Loading States
- Skeleton loaders for all components
- Prevents layout shift
- Smooth transitions

### ✅ Error Handling
- Error alerts with descriptive messages
- Retry buttons for failed requests
- Network error handling
- Permission error handling

### ✅ URL Query Parameters
- All filter state persisted in URL
- Tab state preserved
- Shareable URLs
- Browser back/forward support

## Data Flow

```
EnhancedDashboard
  ├─ Manages state (tab, filters)
  ├─ Syncs with URL query params
  └─ Renders ProvinceTabContainer
      ├─ Fetches data with React Query hooks
      ├─ Handles loading/error states
      └─ Renders ProvinceTab
          ├─ Renders DashboardFilters
          ├─ Renders BudgetSummaryCards
          ├─ Renders ProgramDistributionChart
          ├─ Renders BudgetBarChart
          └─ Renders ProvinceApprovalTable
```

## API Endpoints Used

1. **GET /api/dashboard/metrics**
   - Query params: `level=province`, `provinceId`, `programId`, `quarter`
   - Returns: Summary metrics

2. **GET /api/dashboard/program-distribution**
   - Query params: `level=province`, `provinceId`, `quarter`
   - Returns: Program budget distribution

3. **GET /api/dashboard/budget-by-district**
   - Query params: `provinceId`, `programId`, `quarter`
   - Returns: District budget data

4. **GET /api/dashboard/approved-budgets/province**
   - Query params: `provinceId`, `programId`, `quarter`
   - Returns: Approval summary by district

5. **GET /api/provinces**
   - Returns: List of provinces

6. **GET /api/projects**
   - Returns: List of projects (used to extract program types)

## Auto-refresh

All data queries are configured with:
- `staleTime: 5 minutes` - Data considered fresh for 5 minutes
- `refetchInterval: 5 minutes` - Automatic background refresh every 5 minutes

## Responsive Design

- **Desktop (≥1024px)**: 4-column grid for cards, 2-column grid for charts
- **Tablet (768px-1023px)**: 2-column grid for cards, 2-column grid for charts
- **Mobile (<768px)**: Single column layout, horizontal scroll for tables

## Next Steps

To integrate the Province Tab into your dashboard:

1. Update `apps/client/app/dashboard/page.tsx` to use `EnhancedDashboard`
2. Test all filter combinations
3. Verify URL query parameter persistence
4. Test responsive layout on different screen sizes
5. Implement District Tab (Task 15) following the same pattern

## Testing Checklist

- [ ] Province filter updates data correctly
- [ ] Program filter updates data correctly
- [ ] Quarter filter updates data correctly
- [ ] Clear filters button resets all filters
- [ ] URL query params update when filters change
- [ ] Browser back/forward buttons work correctly
- [ ] Loading skeletons display during data fetch
- [ ] Error messages display on API failures
- [ ] Retry buttons refetch data
- [ ] District row click switches to District tab
- [ ] Charts render correctly with data
- [ ] Tables sort correctly
- [ ] Pagination works correctly
- [ ] Responsive layout works on mobile
- [ ] Auto-refresh works after 5 minutes
