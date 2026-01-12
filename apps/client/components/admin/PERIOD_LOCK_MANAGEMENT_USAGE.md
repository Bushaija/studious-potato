# Period Lock Management Component

## Overview

The `PeriodLockManagement` component provides a comprehensive UI for managing locked reporting periods in the Budget Management System. It displays all period locks for a facility, allows administrators to unlock periods with audit trail recording, and shows the complete history of lock/unlock actions.

## Features

- **Period Lock Table**: Displays all locked periods with details (period name, project, status, locked by, locked date)
- **Admin Controls**: Unlock button for administrators with reason input dialog
- **Audit Log**: Expandable audit trail for each period lock showing all actions
- **Access Control**: Automatically detects admin permissions and shows/hides unlock functionality
- **Real-time Updates**: Uses React Query for automatic cache invalidation and refetching
- **Responsive Design**: Works on all screen sizes with proper overflow handling

## Requirements Covered

- **7.1**: Display lock icon and status for locked periods
- **7.2**: Show clear information about who locked the period and when
- **7.3**: Disable/enable unlock functionality based on admin role
- **7.4**: Provide tooltip/help text explaining the lock
- **9.1**: Create audit log entries for unlock operations
- **9.2**: Record administrator user ID, timestamp, and reason
- **9.3**: Create audit log entries for all modifications
- **9.4**: Support re-locking with audit trail
- **9.5**: Preserve audit logs indefinitely

## Usage

### Basic Usage

```tsx
import { PeriodLockManagement } from "@/components/admin/period-lock-management";

export default function AdminPage() {
  const facilityId = 123; // Get from context or props

  return (
    <div className="container mx-auto py-6">
      <PeriodLockManagement facilityId={facilityId} />
    </div>
  );
}
```

### In a Dashboard Layout

```tsx
import { PeriodLockManagement } from "@/components/admin/period-lock-management";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function AdminDashboard() {
  const facilityId = 123;

  return (
    <Tabs defaultValue="locks">
      <TabsList>
        <TabsTrigger value="locks">Period Locks</TabsTrigger>
        <TabsTrigger value="users">User Management</TabsTrigger>
      </TabsList>
      
      <TabsContent value="locks">
        <PeriodLockManagement facilityId={facilityId} />
      </TabsContent>
      
      <TabsContent value="users">
        {/* Other admin content */}
      </TabsContent>
    </Tabs>
  );
}
```

### With Facility Selector

```tsx
import { useState } from "react";
import { PeriodLockManagement } from "@/components/admin/period-lock-management";
import { FacilitySelector } from "@/components/facility-selector";

export default function PeriodLockPage() {
  const [selectedFacilityId, setSelectedFacilityId] = useState<number | undefined>();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Period Lock Management</h1>
        <FacilitySelector
          value={selectedFacilityId}
          onChange={setSelectedFacilityId}
        />
      </div>

      {selectedFacilityId && (
        <PeriodLockManagement facilityId={selectedFacilityId} />
      )}
    </div>
  );
}
```

## Component Props

### PeriodLockManagement

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `facilityId` | `number` | Yes | The ID of the facility to display period locks for |

## Features in Detail

### 1. Period Lock Table

The table displays:
- **Period**: Name and date range of the reporting period
- **Project**: Project name and code
- **Status**: Visual badge showing locked/unlocked status
- **Locked By**: Name of the user who locked the period
- **Locked Date**: Timestamp when the period was locked
- **Actions**: Unlock button (admin only) and audit log toggle

### 2. Unlock Dialog

When an admin clicks "Unlock":
- Modal dialog opens with period information
- Required reason input field (for audit trail)
- Shows original lock reason if available
- Validates that reason is not empty
- Displays loading state during unlock operation

### 3. Audit Log Section

Expandable section for each lock showing:
- All lock/unlock actions
- Edit attempt records
- User who performed each action
- Timestamp of each action
- Reason provided for each action
- Color-coded badges for different action types

### 4. Access Control

- Automatically detects if user has admin permissions
- Shows/hides unlock button based on admin status
- Displays informational message for non-admin users
- Prevents unauthorized unlock attempts

## State Management

The component uses React Query for data management:

```tsx
// Queries
usePeriodLocks(facilityId)        // Fetches all locks for facility
usePeriodLockAudit(lockId)        // Fetches audit log for specific lock

// Mutations
useUnlockPeriod()                 // Unlocks a period with reason
```

## Error Handling

The component handles various error states:
- **Loading State**: Shows skeleton loaders while fetching data
- **Error State**: Displays error message with icon
- **Empty State**: Shows helpful message when no locks exist
- **Network Errors**: Toast notifications for failed operations

## Styling

The component uses:
- Tailwind CSS for styling
- shadcn/ui components for consistent design
- Responsive layout with overflow handling
- Color-coded badges for status indication
- Proper spacing and typography

## Accessibility

- Semantic HTML structure
- Proper ARIA labels on interactive elements
- Keyboard navigation support
- Focus management in dialogs
- Screen reader friendly

## Performance

- React Query caching reduces unnecessary API calls
- Automatic cache invalidation on mutations
- Optimistic updates for better UX
- Lazy loading of audit logs (only when expanded)

## Related Components

- `PeriodLockBadge`: Display lock status in other contexts
- `SnapshotIndicator`: Show snapshot vs live data status
- `VersionHistory`: Display report version history

## API Endpoints Used

- `GET /period-locks?facilityId={id}`: Fetch all locks for facility
- `POST /period-locks/{id}/unlock`: Unlock a period (admin only)
- `GET /period-locks/audit/{id}`: Fetch audit log for a lock

## Types

See `apps/client/types/period-locks.ts` for full type definitions:
- `PeriodLock`
- `PeriodLockAuditEntry`
- `GetPeriodLocksResponse`
- `UnlockPeriodRequest`
- `UnlockPeriodResponse`
- `GetPeriodLockAuditResponse`

## Testing

The component can be tested with:
- Mock data for period locks
- Admin permission mocking
- Mutation testing for unlock operations
- Audit log expansion/collapse testing

## Future Enhancements

Potential improvements:
- Bulk unlock operations
- Export audit logs to CSV
- Filter/search functionality
- Pagination for large datasets
- Re-lock functionality
- Email notifications on unlock
