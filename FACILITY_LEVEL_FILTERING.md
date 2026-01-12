# Facility-Level Filtering for Dashboard

## Problem
Previously, the dashboard used `districtId` to filter data, which meant that all users in the same district (e.g., two hospitals) would see the same aggregated data. This was a security and data isolation issue because:

- Each accountant, DAF, or DG is associated with a specific facility (hospital)
- They should only see data for their own facility and its child health centers
- Using `districtId` showed data from ALL facilities in the district, including other hospitals

## Solution
Implemented facility-level filtering that allows users to see only their facility and its associated health centers.

### Backend Changes

#### 1. Updated API Routes (`apps/server/src/api/routes/dashboard/dashboard.routes.ts`)
- Added optional `facilityId` parameter to:
  - `/dashboard/budget-by-facility`
  - `/dashboard/approved-budgets/district`
- Made `districtId` optional (either `districtId` or `facilityId` must be provided)

#### 2. Updated Handlers (`apps/server/src/api/routes/dashboard/dashboard.handlers.ts`)
- Modified `getBudgetByFacility` handler:
  - Accepts either `districtId` or `facilityId`
  - When `facilityId` is provided, uses `getAccessibleFacilitiesForFacility()` to get facility + children
  - When `districtId` is provided, uses `getAccessibleFacilitiesInDistrict()` for all district facilities
  
- Modified `getDistrictApprovalDetails` handler:
  - Same logic as above
  - Properly filters facilities based on scope

#### 3. Leveraged Existing Access Control
- Used existing `getAccessibleFacilitiesForFacility()` function from `access-control.service.ts`
- This function returns the facility itself + any child health centers
- Already respects user's `accessibleFacilityIds` for security

### Frontend Changes

#### 1. Updated Access Control (`apps/client/lib/dashboard-access-control.ts`)
- Added `userFacilityId` to `DashboardAccessRights` interface
- Updated role-based access for facility-level users:
  - `accountant`: Sets `userFacilityId` and `canFilterByAnyDistrict: false`
  - `daf`: Sets `userFacilityId` and `canFilterByAnyDistrict: false`
  - `dg`: Sets `userFacilityId` and `canFilterByAnyDistrict: false`
  - `program_manager`: Sets `userFacilityId` and `canFilterByAnyDistrict: false`
  - `admin`/`superadmin`: Can still filter by any district

#### 2. Updated Fetchers
- `apps/client/fetchers/dashboard/get-budget-by-facility.ts`:
  - Made `districtId` optional
  - Added `facilityId` parameter
  - Sends appropriate parameter based on what's provided

- `apps/client/fetchers/dashboard/get-district-approvals.ts`:
  - Same changes as above

#### 3. Updated Hooks
- `apps/client/hooks/queries/dashboard/use-get-budget-by-facility.ts`:
  - Updated query key to include `facilityId`
  
- `apps/client/hooks/queries/dashboard/use-get-district-approvals.ts`:
  - Updated query key to include `facilityId`

#### 4. Updated Container (`apps/client/components/dashboard/DistrictTabContainer.tsx`)
- Added logic to determine scope:
  ```typescript
  const useFacilityScope = !accessRights.canFilterByAnyDistrict && accessRights.userFacilityId;
  ```
- When `useFacilityScope` is true:
  - Passes `facilityId` instead of `districtId`
  - Enables query when `userFacilityId` exists
- When `useFacilityScope` is false (admin users):
  - Uses `districtId` as before
  - Maintains existing behavior

## Benefits

1. **Data Isolation**: Each facility-level user only sees their own data
2. **Security**: Prevents users from seeing other facilities' data in the same district
3. **Correct Hierarchy**: Shows facility + its child health centers (as intended)
4. **Backward Compatible**: Admin users can still view district-level aggregations
5. **Flexible**: Backend supports both `districtId` and `facilityId` filtering

## User Impact by Role

- **Admin/Superadmin**: No change - can still filter by district or province
- **Accountant**: Now sees only their facility + child health centers
- **DAF**: Now sees only their facility + child health centers
- **DG**: Now sees only their facility + child health centers
- **Program Manager**: Now sees only their facility + child health centers

## Testing Recommendations

1. Test as accountant from Hospital A - should only see Hospital A + its health centers
2. Test as accountant from Hospital B in same district - should only see Hospital B + its health centers
3. Test as admin - should see all facilities in selected district
4. Verify charts and tables show correct filtered data
5. Verify no data leakage between facilities in same district
