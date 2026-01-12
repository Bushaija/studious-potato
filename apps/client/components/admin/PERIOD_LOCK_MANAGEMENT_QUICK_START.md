# Period Lock Management - Quick Start Guide

## Installation

All necessary files have been created. No additional installation required.

## Files Created

### Types
- `apps/client/types/period-locks.ts` - TypeScript type definitions

### Fetchers
- `apps/client/fetchers/period-locks/get-period-locks.ts` - Fetch all locks for a facility
- `apps/client/fetchers/period-locks/unlock-period.ts` - Unlock a period (admin only)
- `apps/client/fetchers/period-locks/get-period-lock-audit.ts` - Fetch audit log
- `apps/client/fetchers/period-locks/index.ts` - Barrel export

### Hooks
- `apps/client/hooks/queries/period-locks/use-period-locks.ts` - Query hook for locks
- `apps/client/hooks/queries/period-locks/use-period-lock-audit.ts` - Query hook for audit log
- `apps/client/hooks/queries/period-locks/index.ts` - Barrel export
- `apps/client/hooks/mutations/period-locks/use-unlock-period.ts` - Mutation hook for unlocking
- `apps/client/hooks/mutations/period-locks/index.ts` - Barrel export

### Components
- `apps/client/components/admin/period-lock-management.tsx` - Main component
- `apps/client/components/admin/period-lock-management.example.tsx` - Usage examples
- `apps/client/components/admin/index.ts` - Barrel export

### Documentation
- `apps/client/components/admin/PERIOD_LOCK_MANAGEMENT_USAGE.md` - Detailed usage guide
- `apps/client/components/admin/PERIOD_LOCK_MANAGEMENT_QUICK_START.md` - This file

## Quick Start

### 1. Import the Component

```tsx
import { PeriodLockManagement } from "@/components/admin/period-lock-management";
```

### 2. Use in Your Page

```tsx
export default function AdminPage() {
  const facilityId = 123; // Get from your context/props

  return (
    <div className="container mx-auto py-6">
      <h1 className="text-3xl font-bold mb-6">Period Lock Management</h1>
      <PeriodLockManagement facilityId={facilityId} />
    </div>
  );
}
```

That's it! The component handles everything else:
- Fetching period locks
- Checking admin permissions
- Displaying the table
- Handling unlock operations
- Showing audit logs

## Features at a Glance

✅ **Display Period Locks** - Shows all locked periods for a facility  
✅ **Admin Controls** - Unlock button for administrators only  
✅ **Audit Trail** - Expandable audit log for each lock  
✅ **Access Control** - Automatic admin permission detection  
✅ **Real-time Updates** - React Query handles caching and refetching  
✅ **Error Handling** - Graceful error states and loading indicators  
✅ **Responsive Design** - Works on all screen sizes  

## API Endpoints Required

The component expects these endpoints to be available:

- `GET /period-locks?facilityId={id}` - Fetch all locks
- `POST /period-locks/{id}/unlock` - Unlock a period
- `GET /period-locks/audit/{id}` - Fetch audit log

These endpoints are already implemented in the server (task 8).

## Admin Permission Check

The component uses the `useAdminPermission` hook to check if the current user has admin rights. Only admins will see the unlock button.

## Customization

### Change Facility ID Dynamically

```tsx
const [facilityId, setFacilityId] = useState(123);

return (
  <>
    <FacilitySelector value={facilityId} onChange={setFacilityId} />
    <PeriodLockManagement facilityId={facilityId} />
  </>
);
```

### Add to Existing Admin Dashboard

```tsx
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

<Tabs defaultValue="locks">
  <TabsList>
    <TabsTrigger value="locks">Period Locks</TabsTrigger>
    <TabsTrigger value="users">Users</TabsTrigger>
  </TabsList>
  
  <TabsContent value="locks">
    <PeriodLockManagement facilityId={facilityId} />
  </TabsContent>
</Tabs>
```

## Troubleshooting

### "Failed to fetch period locks"
- Check that the API endpoint is accessible
- Verify the user has access to the facility
- Check network tab for error details

### Unlock button not showing
- Verify the user has admin permissions
- Check the `useAdminPermission` hook is working
- Ensure the period is actually locked (`isLocked: true`)

### Audit log not loading
- Check that the audit log endpoint is accessible
- Verify the lock ID is valid
- Check for any server-side errors

## Next Steps

1. Add the component to your admin dashboard
2. Test with different user roles (admin vs non-admin)
3. Test unlock functionality with valid reasons
4. Verify audit logs are being recorded
5. Check responsive behavior on mobile devices

## Support

For detailed documentation, see:
- `PERIOD_LOCK_MANAGEMENT_USAGE.md` - Full usage guide
- `period-lock-management.example.tsx` - Code examples
- Design document: `.kiro/specs/financial-report-snapshots-period-locking/design.md`
