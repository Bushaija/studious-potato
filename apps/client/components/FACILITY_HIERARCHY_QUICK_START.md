# Facility Hierarchy Components - Quick Start Guide

## 🚀 Quick Start

### 1. Display Facility Hierarchy Tree

Show the parent-child relationships for a facility:

```tsx
import { FacilityHierarchyTree } from "@/components/facility-hierarchy-tree";

function MyPage() {
  return <FacilityHierarchyTree facilityId={123} />;
}
```

### 2. Show Facility Context in Reports

Add facility information to any report view:

```tsx
import { ReportFacilityContext } from "@/components/financial-reports/report-facility-context";

function ReportView({ report }) {
  return (
    <ReportFacilityContext
      facilityName={report.facility.name}
      facilityType={report.facility.type}
      districtName={report.facility.district}
    />
  );
}
```

### 3. List User's Accessible Facilities

Display all facilities the current user can access:

```tsx
import { AccessibleFacilitiesList } from "@/components/accessible-facilities-list";

function FacilitiesPage() {
  return (
    <AccessibleFacilitiesList
      onFacilityClick={(id) => {
        // Handle facility selection
        router.push(`/facilities/${id}`);
      }}
    />
  );
}
```

### 4. Show Facilities Grouped by District

Display facilities with clear district boundaries:

```tsx
import { FacilityListWithDistricts } from "@/components/facility-list-with-districts";
import { useHierarchyContext } from "@/hooks/use-hierarchy-context";

function DistrictView() {
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

## 📦 What's Included

### Components
- `FacilityHierarchyTree` - Tree visualization of facility relationships
- `ReportFacilityContext` - Facility context display for reports
- `AccessibleFacilitiesList` - List of user's accessible facilities
- `FacilityListWithDistricts` - Facilities grouped by district

### Hooks
- `useGetFacilityHierarchy(facilityId)` - Fetch hierarchy data for a facility
- `useHierarchyContext()` - Access user's hierarchy context (from Task 12)

### Fetchers
- `getFacilityHierarchy(facilityId)` - API client for hierarchy data

## 🎨 Visual Design

All components use consistent visual patterns:

- **Hospitals:** Blue badges with Building2 icon 🏥
- **Health Centers:** Green badges with Home icon 🏠
- **Districts:** MapPin icon with district name 📍
- **Current Facility:** Primary border and background highlight
- **Hierarchy Lines:** Visual connectors showing parent-child relationships

## 🔧 Common Use Cases

### Use Case 1: Report Detail Page

Show facility context and hierarchy in a report view:

```tsx
import { ReportFacilityContext } from "@/components/financial-reports/report-facility-context";
import { FacilityHierarchyTree } from "@/components/facility-hierarchy-tree";

function ReportDetailPage({ report }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <ReportFacilityContext
        facilityName={report.facility.name}
        facilityType={report.facility.type}
        districtName={report.facility.district}
      />
      <FacilityHierarchyTree
        facilityId={report.facilityId}
        showTitle={false}
      />
    </div>
  );
}
```

### Use Case 2: Facility Selection Dialog

Let users select from their accessible facilities:

```tsx
import { FacilityListWithDistricts } from "@/components/facility-list-with-districts";
import { useHierarchyContext } from "@/hooks/use-hierarchy-context";
import { Dialog, DialogContent } from "@/components/ui/dialog";

function FacilitySelectDialog({ open, onSelect, onClose }) {
  const { accessibleFacilities } = useHierarchyContext();

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <FacilityListWithDistricts
          facilities={accessibleFacilities}
          onFacilitySelect={(id) => {
            onSelect(id);
            onClose();
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
```

### Use Case 3: Compact Facility Badge

Show facility info inline with other content:

```tsx
import { ReportFacilityContext } from "@/components/financial-reports/report-facility-context";

function ReportCard({ report }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{report.title}</CardTitle>
        <ReportFacilityContext
          facilityName={report.facility.name}
          facilityType={report.facility.type}
          districtName={report.facility.district}
          compact={true}
        />
      </CardHeader>
      {/* ... rest of card */}
    </Card>
  );
}
```

### Use Case 4: Facility Dashboard

Create a comprehensive facility overview:

```tsx
import { AccessibleFacilitiesList } from "@/components/accessible-facilities-list";
import { FacilityHierarchyTree } from "@/components/facility-hierarchy-tree";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

function FacilityDashboard() {
  const [selectedId, setSelectedId] = useState<number | null>(null);

  return (
    <Tabs defaultValue="list">
      <TabsList>
        <TabsTrigger value="list">All Facilities</TabsTrigger>
        <TabsTrigger value="hierarchy">Hierarchy</TabsTrigger>
      </TabsList>

      <TabsContent value="list">
        <AccessibleFacilitiesList
          onFacilityClick={setSelectedId}
        />
      </TabsContent>

      <TabsContent value="hierarchy">
        {selectedId && (
          <FacilityHierarchyTree facilityId={selectedId} />
        )}
      </TabsContent>
    </Tabs>
  );
}
```

## 🎯 Props Reference

### FacilityHierarchyTree

```typescript
interface FacilityHierarchyTreeProps {
  facilityId: number;        // Required: Facility to show hierarchy for
  className?: string;        // Optional: Additional CSS classes
  showTitle?: boolean;       // Optional: Show card title (default: true)
}
```

### ReportFacilityContext

```typescript
interface ReportFacilityContextProps {
  facilityName: string;                          // Required: Facility name
  facilityType: "hospital" | "health_center";   // Required: Facility type
  districtName: string;                          // Required: District name
  className?: string;                            // Optional: Additional CSS classes
  compact?: boolean;                             // Optional: Use compact view (default: false)
}
```

### AccessibleFacilitiesList

```typescript
interface AccessibleFacilitiesListProps {
  className?: string;                            // Optional: Additional CSS classes
  showTitle?: boolean;                           // Optional: Show card title (default: true)
  onFacilityClick?: (facilityId: number) => void; // Optional: Click handler
}
```

### FacilityListWithDistricts

```typescript
interface FacilityListWithDistrictsProps {
  facilities: AccessibleFacility[];              // Required: Facilities to display
  selectedFacilityId?: number;                   // Optional: Currently selected facility
  onFacilitySelect?: (facilityId: number) => void; // Optional: Selection handler
  className?: string;                            // Optional: Additional CSS classes
  showDistrictBoundaries?: boolean;              // Optional: Show district separators (default: true)
}
```

## 🔍 Data Types

### AccessibleFacility

```typescript
type AccessibleFacility = {
  id: number;
  name: string;
  facilityType: "hospital" | "health_center";
  districtId: number;
  districtName: string;
  parentFacilityId: number | null;
};
```

### FacilityHierarchyData

```typescript
type FacilityHierarchyData = {
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
};
```

## 💡 Tips & Best Practices

### 1. Use the Hierarchy Context Hook

Always use `useHierarchyContext()` to access user's facility data:

```tsx
import { useHierarchyContext } from "@/hooks/use-hierarchy-context";

function MyComponent() {
  const {
    accessibleFacilities,
    isHospitalUser,
    canApprove,
    userFacilityId,
  } = useHierarchyContext();

  // Use the data...
}
```

### 2. Handle Loading States

Components handle their own loading states, but you can show a skeleton while the parent loads:

```tsx
import { Skeleton } from "@/components/ui/skeleton";

function MyPage() {
  const { isLoading } = useHierarchyContext();

  if (isLoading) {
    return <Skeleton className="h-96 w-full" />;
  }

  return <AccessibleFacilitiesList />;
}
```

### 3. Combine Components

Components work well together:

```tsx
function ComprehensiveView({ facilityId }) {
  return (
    <div className="space-y-6">
      {/* Show hierarchy tree */}
      <FacilityHierarchyTree facilityId={facilityId} />
      
      {/* Show all accessible facilities */}
      <AccessibleFacilitiesList />
    </div>
  );
}
```

### 4. Responsive Layouts

Use grid layouts that adapt to screen size:

```tsx
<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
  <ReportFacilityContext {...props} />
  <FacilityHierarchyTree {...props} />
</div>
```

## 📚 Additional Resources

- **Full Documentation:** See `FACILITY_HIERARCHY_COMPONENTS.md`
- **Implementation Details:** See `TASK_16_IMPLEMENTATION_SUMMARY.md`
- **Verification Checklist:** See `TASK_16_VERIFICATION_CHECKLIST.md`
- **Hierarchy Context Hook:** See `hooks/use-hierarchy-context.md`

## 🐛 Troubleshooting

### Component not rendering?
- Check that the facility ID is valid
- Verify the user has access to the facility
- Check browser console for errors

### Data not loading?
- Verify the API endpoint is accessible
- Check network tab for failed requests
- Ensure user is authenticated

### Styling issues?
- Verify Tailwind CSS is configured
- Check that UI components are installed
- Ensure proper className props are passed

## 🎉 You're Ready!

Start using these components to visualize facility hierarchies throughout your application. They're designed to be flexible, accessible, and easy to integrate.

For more detailed information, refer to the full documentation files listed above.
