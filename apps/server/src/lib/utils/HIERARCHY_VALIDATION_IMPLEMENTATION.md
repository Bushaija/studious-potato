# Hierarchy Validation Implementation Summary

## Task 4: Create Validation Utilities

**Status:** ✅ Complete

## Files Created

### 1. Core Implementation Files

#### `apps/server/src/lib/errors/hierarchy.errors.ts`
- **Purpose:** Hierarchy-specific error types with facility context
- **Exports:**
  - `HIERARCHY_ERROR_CODES` - Error code constants
  - `HierarchyError` - Base error class
  - `HierarchyValidationError` - For validation failures (400)
  - `HierarchyAuthorizationError` - For access control failures (403)
  - `HierarchyErrorFactory` - Factory methods for creating specific errors
  - Type guards: `isHierarchyError`, `isHierarchyValidationError`, `isHierarchyAuthorizationError`
  - `getHierarchyErrorDetails` - Utility to extract error details

#### `apps/server/src/lib/utils/hierarchy-validation.ts`
- **Purpose:** Validation functions for hierarchy access control
- **Exports:**
  - `validateRoleFacilityConsistency(role, facilityId)` - Ensures DAF/DG roles only at hospitals
  - `validateSameDistrict(facilityId1, facilityId2)` - Prevents cross-district operations
  - `validateHierarchyAccess(userId, targetFacilityId, accessibleFacilityIds?)` - Checks facility access permissions

### 2. Test Files

#### `apps/server/src/lib/utils/__tests__/hierarchy-validation.test.ts`
- **Purpose:** Unit tests for validation utilities
- **Coverage:**
  - `validateRoleFacilityConsistency` - 6 test cases
  - `validateSameDistrict` - 4 test cases
  - `validateHierarchyAccess` - 5 test cases
- **Total:** 15 test cases covering all validation scenarios

### 3. Supporting Files

#### `apps/server/src/lib/errors/index.ts`
- Central export file for all error types
- Exports approval and hierarchy errors

#### `apps/server/src/lib/utils/index.ts`
- Central export file for utility functions
- Exports hierarchy validation and other utilities

#### `apps/server/src/lib/utils/hierarchy-validation.md`
- Comprehensive documentation with usage examples
- API reference for all validation functions
- Example implementations for common use cases

## Implementation Details

### Error Hierarchy

```
APIError (base)
  └── HierarchyError
      ├── HierarchyValidationError (400)
      └── HierarchyAuthorizationError (403)
```

### Error Codes

**Validation Errors:**
- `ROLE_FACILITY_MISMATCH` - DAF/DG role at non-hospital facility
- `FACILITY_NOT_FOUND` - Facility doesn't exist
- `USER_NOT_FOUND` - User doesn't exist
- `INVALID_FACILITY_TYPE` - Wrong facility type
- `FACILITY_REQUIRED` - Missing facility assignment

**Authorization Errors:**
- `ACCESS_DENIED` - General access denial
- `CROSS_DISTRICT_ACCESS` - Cross-district operation attempt
- `HIERARCHY_ACCESS_DENIED` - Outside hierarchy access
- `INACTIVE_USER` - User account inactive
- `NO_FACILITY_ASSIGNMENT` - User has no facility

**Approval Errors:**
- `INVALID_APPROVER` - Wrong approver for facility
- `APPROVAL_HIERARCHY_VIOLATION` - Approval chain violation

### Validation Functions

#### 1. validateRoleFacilityConsistency
**Purpose:** Ensure DAF/DG roles only assigned to hospitals

**Logic:**
1. Check if DAF/DG role has facility assignment
2. Verify facility exists
3. Confirm facility type is 'hospital'

**Throws:**
- `HierarchyValidationError` if validation fails

**Requirements:** 1.4

---

#### 2. validateSameDistrict
**Purpose:** Prevent cross-district operations

**Logic:**
1. Fetch both facilities
2. Compare district IDs
3. Throw if districts don't match

**Throws:**
- `HierarchyValidationError` if facility not found
- `HierarchyAuthorizationError` if different districts

**Requirements:** 2.5, 4.4

---

#### 3. validateHierarchyAccess
**Purpose:** Check facility access permissions

**Logic:**
1. Get user details and verify active
2. Admin/superadmin → allow all access
3. If accessibleFacilityIds provided → check inclusion
4. Otherwise compute access:
   - Hospital DAF/DG → own facility + children
   - Others → own facility only
5. Verify same district

**Throws:**
- `HierarchyValidationError` if user/facility not found
- `HierarchyAuthorizationError` if access denied

**Requirements:** 2.1-2.4, 4.1-4.3, 4.5

## Error Response Format

All hierarchy errors return structured JSON:

```json
{
  "error": true,
  "code": "HIERARCHY_ACCESS_DENIED",
  "message": "Access denied: Facility is outside your district hierarchy",
  "statusCode": 403,
  "userId": 123,
  "userFacilityId": 1,
  "targetFacilityId": 20,
  "context": {
    "userRole": "daf",
    "targetFacilityName": "Byumba Hospital",
    "reason": "User does not have access to this facility based on hierarchy rules"
  },
  "details": {
    "userName": "John Doe",
    "userFacilityName": "Butaro Hospital",
    "userDistrictId": 11,
    "targetDistrictId": 13
  }
}
```

## Usage Examples

### Example 1: User Creation
```typescript
import { validateRoleFacilityConsistency } from '@/lib/utils/hierarchy-validation';

app.post('/accounts/sign-up', async (c) => {
  const body = await c.req.json();
  
  // Validate role-facility consistency
  await validateRoleFacilityConsistency(body.role, body.facilityId);
  
  // Create user...
});
```

### Example 2: Cross-District Check
```typescript
import { validateSameDistrict } from '@/lib/utils/hierarchy-validation';

app.post('/reports/transfer', async (c) => {
  const { fromFacilityId, toFacilityId } = await c.req.json();
  
  // Ensure same district
  await validateSameDistrict(fromFacilityId, toFacilityId);
  
  // Process transfer...
});
```

### Example 3: Access Control
```typescript
import { validateHierarchyAccess } from '@/lib/utils/hierarchy-validation';

app.get('/financial-reports/:id', async (c) => {
  const reportId = parseInt(c.req.param('id'));
  const user = c.get('user');
  const accessibleIds = c.get('accessibleFacilityIds');
  
  const report = await getReport(reportId);
  
  // Validate access using middleware context
  await validateHierarchyAccess(user.id, report.facilityId, accessibleIds);
  
  return c.json(report);
});
```

## Testing

Run tests:
```bash
# Run all hierarchy validation tests
pnpm test hierarchy-validation

# Run with coverage
pnpm test hierarchy-validation --coverage

# Run in watch mode
pnpm test hierarchy-validation --watch
```

## Integration Points

These validation utilities are designed to be used in:

1. **User Management Endpoints** (Task 5)
   - POST /accounts/sign-up
   - PUT /accounts/users/:id

2. **Financial Reports Endpoints** (Task 7)
   - GET /financial-reports
   - GET /financial-reports/:id

3. **Approval Queue Endpoints** (Task 6)
   - GET /financial-reports/daf-queue
   - GET /financial-reports/dg-queue

4. **Workflow Service** (Task 9)
   - submitForApproval
   - dafApprove
   - dgApprove

5. **Facility Endpoints** (Task 8)
   - GET /facilities/accessible
   - GET /facilities/:id/hierarchy

## Requirements Coverage

✅ **Requirement 1.4:** DAF/DG role validation at hospital facilities
✅ **Requirement 2.5:** District boundary enforcement
✅ **Requirement 4.4:** Cross-district operation prevention
✅ **Requirement 4.5:** Authorization failure logging (error details)

## Next Steps

The validation utilities are ready for integration into:
- Task 5: User creation and update endpoints
- Task 6: Approval queue endpoints
- Task 7: Financial reports endpoints
- Task 8: Facility hierarchy endpoints
- Task 9: Workflow service enhancements

## Notes

- All validation functions are async and return Promises
- Errors include detailed context for debugging and audit trails
- Functions can be used standalone or with middleware context
- Type-safe with full TypeScript support
- Comprehensive test coverage with 15 test cases
