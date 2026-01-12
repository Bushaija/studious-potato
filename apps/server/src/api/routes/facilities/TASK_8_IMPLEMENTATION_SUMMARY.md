# Task 8: Create Facility Hierarchy Endpoints - Implementation Summary

## Overview
Implemented two new facility hierarchy endpoints to support role-based access control and facility relationship visualization.

## Endpoints Implemented

### 1. GET /facilities/accessible
**Purpose**: Returns all facilities accessible to the current user based on their role and hierarchy position.

**Authorization**: Requires authenticated user

**Response Schema**:
```typescript
{
  id: number;
  name: string;
  facilityType: 'hospital' | 'health_center';
  districtId: number;
  districtName: string;
  parentFacilityId: number | null;
}[]
```

**Access Logic**:
- **Admin/Superadmin**: All facilities
- **Hospital DAF/DG**: Own facility + all child health centers in same district
- **Health Center Accountant**: Only own facility
- Uses `FacilityHierarchyService.getAccessibleFacilityIds()` for consistent access control

**Response Codes**:
- `200 OK`: Returns accessible facilities
- `401 Unauthorized`: User not authenticated

---

### 2. GET /facilities/{id}/hierarchy
**Purpose**: Returns hierarchy information for a specific facility, including parent and child facilities.

**Authorization**: 
- Requires authenticated user
- User must have access to the requested facility (validated via `FacilityHierarchyService.canAccessFacility()`)

**Response Schema**:
```typescript
{
  facility: {
    id: number;
    name: string;
    facilityType: 'hospital' | 'health_center';
    districtId: number;
    districtName: string;
    parentFacilityId: number | null;
  };
  parentFacility: {
    id: number;
    name: string;
    facilityType: 'hospital' | 'health_center';
    districtId: number;
  } | null;
  childFacilities: Array<{
    id: number;
    name: string;
    facilityType: 'hospital' | 'health_center';
    districtId: number;
  }>;
}
```

**Response Codes**:
- `200 OK`: Returns facility hierarchy
- `401 Unauthorized`: User not authenticated
- `403 Forbidden`: User does not have access to this facility
- `404 Not Found`: Facility not found

---

## Files Modified

### 1. `facilities.routes.ts`
- Added `getAccessible` route definition with OpenAPI schema
- Added `getHierarchy` route definition with OpenAPI schema
- Exported route types: `GetAccessibleRoute`, `GetHierarchyRoute`

### 2. `facilities.handlers.ts`
- Implemented `getAccessible` handler:
  - Authenticates user via session
  - Uses `FacilityHierarchyService.getAccessibleFacilityIds()` to get accessible facilities
  - Joins with districts table to include district names
  - Returns facilities ordered by district and facility name
  
- Implemented `getHierarchy` handler:
  - Authenticates user via session
  - Validates user access to requested facility
  - Queries facility with district information
  - Fetches parent facility if exists
  - Fetches all child facilities in same district
  - Returns complete hierarchy structure

### 3. `facilities.index.ts`
- Registered `getAccessible` route before `getOne` (to avoid path conflicts)
- Registered `getHierarchy` route after `getOne`

---

## Key Implementation Details

### Authorization Strategy
Both endpoints use the `FacilityHierarchyService` for consistent authorization:
- `getAccessible`: Uses `getAccessibleFacilityIds()` to filter facilities
- `getHierarchy`: Uses `canAccessFacility()` to validate access before returning data

### District Information
Both endpoints include district names by joining with the `districts` table, providing context for facility location.

### Hierarchy Relationships
The `getHierarchy` endpoint:
- Returns parent facility for health centers
- Returns child facilities for hospitals
- Ensures all child facilities are in the same district (enforces district boundaries)

### Error Handling
- Proper HTTP status codes for different error scenarios
- Clear error messages for authorization failures
- Graceful handling of missing facilities or relationships

---

## Requirements Satisfied

✅ **Requirement 2.3**: "WHEN a user with role 'daf' or 'dg' at a hospital facility requests facility lists, THE System SHALL return the user's facility and all health centers with matching parent_facility_id"
- Implemented via `getAccessible` endpoint using `FacilityHierarchyService`

✅ **Requirement 7.4**: "THE System SHALL allow administrators to view the facility hierarchy when assigning roles"
- Implemented via `getHierarchy` endpoint showing parent-child relationships

---

## Testing Recommendations

### Manual Testing
1. **Test as Hospital DAF/DG user**:
   - GET `/facilities/accessible` should return hospital + child health centers
   - GET `/facilities/{hospital_id}/hierarchy` should show child facilities
   - GET `/facilities/{child_health_center_id}/hierarchy` should show parent hospital

2. **Test as Health Center Accountant**:
   - GET `/facilities/accessible` should return only own facility
   - GET `/facilities/{own_facility_id}/hierarchy` should show parent hospital
   - GET `/facilities/{other_facility_id}/hierarchy` should return 403 Forbidden

3. **Test as Admin**:
   - GET `/facilities/accessible` should return all facilities
   - GET `/facilities/{any_id}/hierarchy` should work for any facility

### Integration Tests
- Test cross-district access prevention
- Test hierarchy relationships are correctly returned
- Test authorization for different user roles
- Test district information is included in responses

---

## Next Steps
This task is complete. The endpoints are ready for:
1. Client-side integration (Task 12, 16, 17)
2. Integration testing (Task 18)
3. Use in user management UI (Task 15)
