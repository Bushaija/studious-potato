# Facility Hierarchy Display Components

This document describes the facility hierarchy display components implemented for Task 16 of the district-based role hierarchy feature.

## Overview

These components provide visual representations of facility hierarchies, district boundaries, and accessible facilities based on the user's role and permissions.

## Components

### 1. FacilityHierarchyTree

**Location:** `components/facility-hierarchy-tree.tsx`

**Purpose:** Visualizes parent-child relationships in a tree structure for a specific facility.

**Features:**
- Shows parent hospital (if facility is a health center)
- Displays current facility with highlighting
- Lists all child health centers (if facility is a hospital)
- Shows district information
- Visual hierarchy with connecting lines
- Loading and error states

**Usage:**
```tsx
import { FacilityHierarchyTree } from "@/components/facility-hierarchy-tree";

<FacilityHierarchyTree
  facilityId={123}
  showTitle={true}
  className="w-full"
/>
```

**Props:**
- `facilityId: number` - The facility to display hierarchy for (required)
- `showTitle?: boolean` - Whether to show the card title (default: true)
- `className?: string` - Additional CSS classes

### 2. ReportFacilityContext

**Location:** `components/financial-reports/report-facility-context.tsx`

**Purpose:** Displays facility context information in report views.

**Features:**
- Shows facility name, type, and district
- Compact and full card views
- Facility type badges with icons
- District information with map pin icon

**Usage:**
```tsx
import { ReportFacilityContext } from "@/components/financial-reports/report-facility-context";

// Full card view
<ReportFacilityContext
  facilityName="Butaro Hospital"
  facilityType="hospital"
  districtName="Butaro"
/>

// Compact inline view
<ReportFacilityContext
  facilityName="Kivuye Health Center"
  facilityType="health_center"
  districtName="Butaro"
  compact={true}
/>
```

**Props:**
- `facilityName: string` - Name of the facility (required)
- `facilityType: "hospital" | "health_center"` - Type of facility (required)
- `districtName: string` - Name of the district (required)
- `compact?: boolean` - Use compact inline view (default: false)
- `className?: string` - Additional CSS classes

### 3. AccessibleFacilitiesList

**Location:** `components/accessible-facilities-list.tsx`

**Purpose:** Displays all facilities accessible to the current user with hierarchy information.

**Features:**
- Automatically fetches accessible facilities using `useHierarchyContext`
- Groups facilities by district
- Shows facility type badges
- Highlights user's current facility
- Displays child facility counts for hospitals
- Shows parent relationships for health centers
- Interactive facility selection
- Loading and error states

**Usage:**
```tsx
import { AccessibleFacilitiesList } from "@/components/accessible-facilities-list";

<AccessibleFacilitiesList
  showTitle={true}
  onFacilityClick={(facilityId) => {
    console.log("Selected facility:", facilityId);
  }}
/>
```

**Props:**
- `showTitle?: boolean` - Whether to show the card title (default: true)
- `onFacilityClick?: (facilityId: number) => void` - Callback when facility is clicked
- `className?: string` - Additional CSS classes

### 4. FacilityListWithDistricts

**Location:** `components/facility-list-with-districts.tsx`

**Purpose:** Displays a list of facilities with clear district boundaries.

**Features:**
- Groups facilities by district
- Shows district boundaries with separators
- Sticky district headers
- Facility type badges
- Selection highlighting
- Interactive facility selection
- Shows parent relationships

**Usage:**
```tsx
import { FacilityListWithDistricts } from "@/components/facility-list-with-districts";
import { useHierarchyContext } from "@/hooks/use-hierarchy-context";

function MyComponent() {
  const { accessibleFacilities } = useHierarchyContext();
  const [selected, setSelected] = useState<number>();

  return (
    <FacilityListWithDistricts
      facilities={accessibleFacilities}
      selectedFacilityId={selected}
      onFacilitySelect={setSelected}
      showDistrictBoundaries={true}
    />
  );
}
```

**Props:**
- `facilities: AccessibleFacility[]` - Array of facilities to display (required)
- `selectedFacilityId?: number` - Currently selected facility ID
- `onFacilitySelect?: (facilityId: number) => void` - Callback when facility is selected
- `showDistrictBoundaries?: boolean` - Show district separators (default: true)
- `className?: string` - Additional CSS classes

## Supporting Files

### Fetcher: get-facility-hierarchy.ts

**Location:** `fetchers/facilities/get-facility-hierarchy.ts`

Fetches hierarchy data for a specific facility from the API.

**Returns:**
```typescript
{
  facility: {
    id: number;
    name: string;
    facilityType: "hospital" | "health_center";
    districtId: number;
    districtName: string;
    parentFacilityId: number | null;
  };
  parentFacility: {
    id: number;
    name: string;
    facilityType: "hospital" | "health_center";
    districtId: number;
  } | null;
  childFacilities: Array<{
    id: number;
    name: string;
    facilityType: "hospital" | "health_center";
    districtId: number;
  }>;
}
```

### Hook: use-get-facility-hierarchy.ts

**Location:** `hooks/queries/facilities/use-get-facility-hierarchy.ts`

React Query hook for fetching facility hierarchy data.

**Usage:**
```tsx
import { useGetFacilityHierarchy } from "@/hooks/queries/facilities/use-get-facility-hierarchy";

function MyComponent({ facilityId }: { facilityId: number }) {
  const { data, isLoading, error } = useGetFacilityHierarchy(facilityId);
  
  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error loading hierarchy</div>;
  
  return <div>{data.facility.name}</div>;
}
```

## Integration Examples

### 1. Report Detail Page

The facility context has been integrated into the financial report detail page:

**Location:** `app/dashboard/financial-reports/[id]/page.tsx`

Shows facility information and hierarchy tree side-by-side for reports.

### 2. Facility Hierarchy Dashboard

A dedicated page showcasing all hierarchy components:

**Location:** `app/dashboard/facilities/hierarchy/page.tsx`

Features:
- Accessible facilities list
- Interactive hierarchy tree viewer
- Facilities grouped by district
- Role and access level summary

## Design Patterns

### Visual Hierarchy

All components use consistent visual patterns:
- **Hospitals:** Blue badges with Building2 icon
- **Health Centers:** Green badges with Home icon
- **Districts:** MapPin icon with district name
- **Current Facility:** Primary border and background
- **Hierarchy Lines:** Visual connectors showing relationships

### Accessibility

All components include:
- Proper ARIA labels
- Keyboard navigation support
- Screen reader friendly descriptions
- Focus management
- Semantic HTML structure

### Responsive Design

Components adapt to different screen sizes:
- Mobile-first approach
- Flexible layouts
- Truncated text with tooltips
- Collapsible sections where appropriate

## Requirements Mapping

This implementation satisfies the following requirements from the spec:

- **Requirement 2.3:** Display accessible facilities for current user ✓
- **Requirement 7.4:** Show facility hierarchy when assigning roles ✓
- **Requirement 8.2:** Display facility hierarchy relationship in workflow logs ✓

## Testing Recommendations

1. **Visual Testing:**
   - Test with different facility types (hospital vs health center)
   - Test with varying numbers of child facilities
   - Test district boundaries with multiple districts
   - Test responsive layouts on different screen sizes

2. **Interaction Testing:**
   - Test facility selection
   - Test keyboard navigation
   - Test loading and error states
   - Test with different user roles

3. **Data Testing:**
   - Test with facilities that have no parent
   - Test with facilities that have no children
   - Test with single-facility access
   - Test with multi-district access

## Future Enhancements

Potential improvements for future iterations:

1. **Search and Filter:**
   - Add search functionality to facility lists
   - Filter by facility type
   - Filter by district

2. **Visualization:**
   - Add graphical tree diagram
   - Add district map view
   - Add facility statistics

3. **Performance:**
   - Implement virtual scrolling for large lists
   - Add pagination for facility lists
   - Optimize hierarchy queries

4. **Export:**
   - Export facility hierarchy as PDF
   - Export accessible facilities list
   - Generate hierarchy reports
