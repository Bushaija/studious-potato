# Debugging Facility-Level Filtering

## Current Status
Implemented facility-level filtering but getting 500 errors on:
- `/api/dashboard/budget-by-facility?facilityId=330`
- `/api/dashboard/approved-budgets/district?facilityId=330`

## Debug Logging Added

### Console Logs to Check
Look for these log statements in the server terminal:

1. **Query Parameters**:
   ```
   [getBudgetByFacility] Query params: { districtId, facilityId, projectType, quarter }
   [getDistrictApprovalDetails] Query params: { districtId, facilityId, projectType, quarter }
   ```

2. **Scope Detection**:
   ```
   [getBudgetByFacility] Using facility scope: 330
   [getBudgetByFacility] Accessible facility IDs: [330, ...]
   ```

3. **Facility Fetching**:
   ```
   [getBudgetByFacility] Fetching facilities: [330, ...]
   [getBudgetByFacility] Found facilities: X
   ```

4. **Budget Aggregation**:
   ```
   [getBudgetByFacility] Aggregating budget for facility: 330 FacilityName
   [getBudgetByFacility] Aggregated budgets: X
   ```

5. **Error Details** (if any):
   ```
   [getBudgetByFacility] Error: ...
   [getBudgetByFacility] Error stack: ...
   [getBudgetByFacility] Error message: ...
   ```

## Potential Issues to Check

### 1. User Context / Access Control
- Check if `userContext.accessibleFacilityIds` includes facilityId 330
- Verify the user is associated with facility 330

### 2. Database Query Issues
- `inArray` with empty array might fail
- Facility 330 might not exist or be inactive
- Parent-child relationship might be incorrect

### 3. Import Issues
- Dynamic import of `getAccessibleFacilitiesForFacility` might fail
- Check if the function is exported correctly

### 4. Type Mismatches
- facilityId might be string instead of number
- Check parseInt() is working correctly

## Quick Fixes to Try

### If facilityIds is empty:
The user doesn't have access to facility 330. Check:
- User's facilityId in session
- User's accessibleFacilityIds array
- Facility hierarchy (parent-child relationships)

### If facilities query returns empty:
Facility 330 might not exist or be inactive. Check:
- `SELECT * FROM facilities WHERE id = 330`
- Facility status (should be 'ACTIVE')

### If aggregateBudgetData fails:
Check the aggregation service for errors with single-facility queries.

## Next Steps
1. Check server terminal for the console.log output
2. Identify which step is failing
3. Verify database state for facility 330
4. Check user's access rights and facility associations
