# Planning UPDATE Endpoint - Security Enhancement

## Overview

Added district-based role access control to the Planning UPDATE endpoint to match the security model implemented in the CREATE endpoint.

## Changes Made

### 1. Authorization Checks Added

#### Existing Record Access Validation
```typescript
// Validate that the user can access this record's facility
const recordFacilityId = existing.facilityId;
const hasAccess = canAccessFacility(recordFacilityId, userContext);

if (!hasAccess) {
  return c.json(
    { message: "Access denied: facility not in your district" },
    HttpStatusCodes.FORBIDDEN
  );
}
```

**Impact:**
- Users can only update planning records for facilities they have access to
- Hospital accountants: limited to their district
- Health center users: limited to their own facility
- Admin users: no restrictions

#### Facility Change Validation
```typescript
// If facilityId is being changed, validate access to the new facility
if (body.facilityId && body.facilityId !== existing.facilityId) {
  // Admin users can change to any facility
  if (!hasAdminAccess(userContext.role, userContext.permissions)) {
    // Non-admin users: validate access to new facility
    if (userContext.facilityType === 'hospital') {
      // Hospital accountants: must be in their district
      if (!userContext.accessibleFacilityIds.includes(body.facilityId)) {
        return c.json(
          { message: "Access denied: new facility not in your district" },
          HttpStatusCodes.FORBIDDEN
        );
      }
    } else {
      // Health center users: cannot change facility
      return c.json(
        { message: "Health center users cannot change facility" },
        HttpStatusCodes.FORBIDDEN
      );
    }
  }
}
```

**Impact:**
- Prevents unauthorized facility transfers
- Health center users cannot move planning to other facilities
- Hospital accountants can only move within their district
- Admin users have full flexibility

### 2. Data Normalization Added

```typescript
// Normalize the updated form data
const normalizedFormData = normalizeFormData(updatedFormData);
```

**Impact:**
- Ensures consistent data format
- Automatically calculates quarterly amounts
- Adds computed fields to form data

### 3. Improved Computed Values Calculation

```typescript
// Recalculate computed values with nested structure
const computedValues = await calculateNestedComputedValues(normalizedFormData);
```

**Impact:**
- Uses the same calculation logic as CREATE
- Includes activity metadata in computed values
- Maintains consistency across endpoints

### 4. Enhanced Error Handling

```typescript
catch (error: any) {
  console.error('Update planning error:', error);
  
  if (error.message === "Unauthorized") {
    return c.json(
      { message: "Authentication required" },
      HttpStatusCodes.UNAUTHORIZED
    );
  }
  
  if (error.message === "User not associated with a facility") {
    return c.json(
      { message: "User must be associated with a facility" },
      HttpStatusCodes.FORBIDDEN
    );
  }
  
  return c.json(
    { message: "Failed to update planning data" },
    HttpStatusCodes.INTERNAL_SERVER_ERROR
  );
}
```

**Impact:**
- Provides clear error messages
- Proper HTTP status codes
- Better debugging information

### 5. User Context Integration

```typescript
updatedBy: userContext.userId,
```

**Impact:**
- Tracks who made the update
- Enables audit trails
- Supports accountability

## Security Model Comparison

### Before
```
UPDATE /planning/{id}
├─ Fetch existing record
├─ ❌ No authorization check
├─ Merge data
├─ Validate
├─ Update database
└─ Return result
```

### After
```
UPDATE /planning/{id}
├─ Get user context
├─ Fetch existing record
├─ ✅ Validate access to existing facility
├─ ✅ Validate access to new facility (if changing)
├─ Merge data
├─ Normalize data
├─ Validate
├─ Recalculate computed values
├─ Update database
└─ Return result
```

## Authorization Matrix

| User Role | Can Update Own Facility | Can Update District Facilities | Can Update Any Facility | Can Change Facility |
|-----------|------------------------|-------------------------------|------------------------|---------------------|
| **Health Center User** | ✅ Yes | ❌ No | ❌ No | ❌ No |
| **Hospital Accountant** | ✅ Yes | ✅ Yes | ❌ No | ✅ Within district only |
| **Admin** | ✅ Yes | ✅ Yes | ✅ Yes | ✅ Yes |

## New Error Responses

### 403 Forbidden - Cannot Access Existing Facility
```json
{
  "message": "Access denied: facility not in your district"
}
```

**When:** User tries to update a planning record for a facility they don't have access to.

### 403 Forbidden - Cannot Access New Facility
```json
{
  "message": "Access denied: new facility not in your district"
}
```

**When:** Hospital accountant tries to change facilityId to a facility outside their district.

### 403 Forbidden - Health Center Cannot Change Facility
```json
{
  "message": "Health center users cannot change facility"
}
```

**When:** Health center user tries to change the facilityId in the update.

### 401 Unauthorized
```json
{
  "message": "Authentication required"
}
```

**When:** No valid authentication token provided.

### 403 Forbidden - No Facility Association
```json
{
  "message": "User must be associated with a facility"
}
```

**When:** User account is not associated with any facility.

## Testing Scenarios

### Test Case 1: Health Center User Updates Own Planning
```typescript
// Given: Health center user with facilityId = 10
// When: PUT /planning/123 (where planning.facilityId = 10)
// Then: ✅ Update succeeds
```

### Test Case 2: Health Center User Updates Other Facility
```typescript
// Given: Health center user with facilityId = 10
// When: PUT /planning/123 (where planning.facilityId = 20)
// Then: ❌ 403 Forbidden
```

### Test Case 3: Hospital Accountant Updates District Facility
```typescript
// Given: Hospital accountant with district facilities [10, 11, 12]
// When: PUT /planning/123 (where planning.facilityId = 11)
// Then: ✅ Update succeeds
```

### Test Case 4: Hospital Accountant Updates Outside District
```typescript
// Given: Hospital accountant with district facilities [10, 11, 12]
// When: PUT /planning/123 (where planning.facilityId = 99)
// Then: ❌ 403 Forbidden
```

### Test Case 5: Hospital Accountant Changes Facility Within District
```typescript
// Given: Hospital accountant with district facilities [10, 11, 12]
// When: PUT /planning/123 { facilityId: 12 } (existing facilityId = 11)
// Then: ✅ Update succeeds
```

### Test Case 6: Hospital Accountant Changes Facility Outside District
```typescript
// Given: Hospital accountant with district facilities [10, 11, 12]
// When: PUT /planning/123 { facilityId: 99 } (existing facilityId = 11)
// Then: ❌ 403 Forbidden
```

### Test Case 7: Health Center User Tries to Change Facility
```typescript
// Given: Health center user with facilityId = 10
// When: PUT /planning/123 { facilityId: 11 } (existing facilityId = 10)
// Then: ❌ 403 Forbidden
```

### Test Case 8: Admin Updates Any Facility
```typescript
// Given: Admin user
// When: PUT /planning/123 (any facilityId)
// Then: ✅ Update succeeds
```

### Test Case 9: Admin Changes Facility to Any Facility
```typescript
// Given: Admin user
// When: PUT /planning/123 { facilityId: 999 }
// Then: ✅ Update succeeds
```

## Migration Notes

### Backward Compatibility
- ✅ Existing API contracts unchanged
- ✅ Request/response formats unchanged
- ✅ Only adds authorization checks

### Potential Breaking Changes
- ⚠️ Users who previously could update any planning record may now be restricted
- ⚠️ Health center users can no longer change facilityId (if they were doing this)

### Deployment Considerations
1. **No database migration required** - only code changes
2. **Test with different user roles** before production deployment
3. **Monitor 403 errors** after deployment to identify any legitimate access issues
4. **Update API documentation** to reflect new authorization rules

## Performance Impact

### Additional Queries
- +1 query: `getUserContext()` - fetches user's district and facility info
- +0 queries: `canAccessFacility()` - uses in-memory check with userContext data

### Expected Performance
- **Negligible impact** - authorization checks are in-memory operations
- **No additional database round trips** beyond the initial user context fetch
- **User context can be cached** for the request lifecycle

## Security Benefits

1. **Prevents unauthorized data access** - Users can only update planning they should have access to
2. **Prevents facility hijacking** - Users cannot move planning records to facilities they don't control
3. **Maintains data integrity** - Ensures planning records stay within proper organizational boundaries
4. **Audit trail support** - Tracks who made updates via `updatedBy` field
5. **Consistent security model** - UPDATE now matches CREATE authorization logic

## Next Steps

### Recommended Enhancements
1. **Add audit logging** - Track all changes to planning records
2. **Implement optimistic locking** - Prevent concurrent update conflicts
3. **Add field-level permissions** - Control which fields users can modify
4. **Rate limiting** - Prevent abuse of the update endpoint
5. **Bulk update endpoint** - Allow updating multiple planning records efficiently

### Testing Requirements
- [ ] Unit tests for authorization logic
- [ ] Integration tests for each user role
- [ ] Test facility change scenarios
- [ ] Test error responses
- [ ] Performance testing with authorization checks

## Summary

The UPDATE endpoint now has the same robust security model as the CREATE endpoint:
- ✅ District-based access control
- ✅ Role-based permissions
- ✅ Facility change validation
- ✅ Proper error handling
- ✅ User tracking

This ensures data security and maintains organizational boundaries while allowing legitimate updates to proceed smoothly.
