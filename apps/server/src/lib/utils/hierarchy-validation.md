# Hierarchy Validation Utilities

This module provides validation functions for the district-based role hierarchy system.

## Functions

### `validateRoleFacilityConsistency(role: string, facilityId: number | null): Promise<void>`

Validates that DAF/DG roles are only assigned to hospital-type facilities.

**Usage:**
```typescript
import { validateRoleFacilityConsistency } from '@/lib/utils/hierarchy-validation';

// In user creation/update endpoint
await validateRoleFacilityConsistency(userData.role, userData.facilityId);
```

**Throws:**
- `HierarchyValidationError` if DAF/DG role has no facility
- `HierarchyValidationError` if facility not found
- `HierarchyValidationError` if DAF/DG role assigned to non-hospital facility

**Requirements:** 1.4

---

### `validateSameDistrict(facilityId1: number, facilityId2: number): Promise<void>`

Validates that two facilities are in the same district to prevent cross-district operations.

**Usage:**
```typescript
import { validateSameDistrict } from '@/lib/utils/hierarchy-validation';

// Before cross-facility operations
await validateSameDistrict(userFacilityId, targetFacilityId);
```

**Throws:**
- `HierarchyValidationError` if either facility not found
- `HierarchyAuthorizationError` if facilities are in different districts

**Requirements:** 2.5, 4.4

---

### `validateHierarchyAccess(userId: number, targetFacilityId: number, accessibleFacilityIds?: number[]): Promise<void>`

Validates that a user has access to a specific facility based on hierarchy rules.

**Usage:**
```typescript
import { validateHierarchyAccess } from '@/lib/utils/hierarchy-validation';

// Option 1: Let function compute accessible facilities
await validateHierarchyAccess(userId, targetFacilityId);

// Option 2: Use pre-computed accessible facilities (from middleware)
const accessibleIds = c.get('accessibleFacilityIds');
await validateHierarchyAccess(userId, targetFacilityId, accessibleIds);
```

**Access Rules:**
- **Admin/Superadmin:** Access to all facilities
- **Hospital DAF/DG:** Access to own facility + child health centers in same district
- **Health Center Users:** Access to own facility only
- **Accountants:** Access to own facility only

**Throws:**
- `HierarchyValidationError` if user or facility not found
- `HierarchyAuthorizationError` if user is inactive
- `HierarchyAuthorizationError` if user has no facility assignment
- `HierarchyAuthorizationError` if facility is outside user's hierarchy

**Requirements:** 2.1-2.4, 4.1-4.3, 4.5

---

## Error Types

### `HierarchyValidationError`

Used for input validation and data consistency checks.
- Status Code: 400
- Indicates invalid input or data state

### `HierarchyAuthorizationError`

Used for access control failures.
- Status Code: 403
- Indicates user lacks permission to access resource

## Example: User Creation Endpoint

```typescript
import { validateRoleFacilityConsistency } from '@/lib/utils/hierarchy-validation';
import { HierarchyValidationError } from '@/lib/errors/hierarchy.errors';

app.post('/accounts/sign-up', async (c) => {
  const body = await c.req.json();
  
  try {
    // Validate role-facility consistency
    await validateRoleFacilityConsistency(body.role, body.facilityId);
    
    // Create user...
    
  } catch (error) {
    if (error instanceof HierarchyValidationError) {
      return c.json(error.toJSON(), error.statusCode);
    }
    throw error;
  }
});
```

## Example: Report Access Endpoint

```typescript
import { validateHierarchyAccess } from '@/lib/utils/hierarchy-validation';
import { HierarchyAuthorizationError } from '@/lib/errors/hierarchy.errors';

app.get('/financial-reports/:id', async (c) => {
  const reportId = parseInt(c.req.param('id'));
  const user = c.get('user');
  
  // Get report
  const report = await getReport(reportId);
  
  try {
    // Validate user can access report's facility
    await validateHierarchyAccess(user.id, report.facilityId);
    
    return c.json(report);
    
  } catch (error) {
    if (error instanceof HierarchyAuthorizationError) {
      return c.json(error.toJSON(), error.statusCode);
    }
    throw error;
  }
});
```

## Example: Using Middleware Context

```typescript
import { validateHierarchyAccess } from '@/lib/utils/hierarchy-validation';

app.get('/financial-reports/:id', async (c) => {
  const reportId = parseInt(c.req.param('id'));
  const user = c.get('user');
  const accessibleFacilityIds = c.get('accessibleFacilityIds'); // From middleware
  
  const report = await getReport(reportId);
  
  // Use pre-computed accessible facilities for better performance
  await validateHierarchyAccess(user.id, report.facilityId, accessibleFacilityIds);
  
  return c.json(report);
});
```

## Testing

Tests are located in `__tests__/hierarchy-validation.test.ts`.

Run tests:
```bash
pnpm test hierarchy-validation
```
