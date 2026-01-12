# Facility Hierarchy Endpoints - API Documentation

## Overview
Two new endpoints for managing facility hierarchy access and visualization.

---

## 1. Get Accessible Facilities

### Endpoint
```
GET /facilities/accessible
```

### Description
Returns all facilities accessible to the authenticated user based on their role and position in the facility hierarchy.

### Authentication
Required - Bearer token in Authorization header

### Request
No parameters required

### Response

#### Success (200 OK)
```json
[
  {
    "id": 1,
    "name": "Butaro Hospital",
    "facilityType": "hospital",
    "districtId": 11,
    "districtName": "Butaro",
    "parentFacilityId": null
  },
  {
    "id": 2,
    "name": "Kivuye Health Center",
    "facilityType": "health_center",
    "districtId": 11,
    "districtName": "Butaro",
    "parentFacilityId": 1
  }
]
```

#### Error (401 Unauthorized)
```json
{
  "message": "Unauthorized"
}
```

### Access Rules
| User Role | Accessible Facilities |
|-----------|----------------------|
| Admin/Superadmin | All facilities |
| Hospital DAF/DG | Own hospital + all child health centers in same district |
| Health Center Accountant | Only own facility |

### Example Usage

**Hospital DAF User at Butaro Hospital (District 11)**:
```bash
curl -H "Authorization: Bearer <token>" \
  https://api.example.com/facilities/accessible
```

Response includes:
- Butaro Hospital (id: 1)
- All health centers with `parentFacilityId: 1` in District 11

**Health Center Accountant at Kivuye HC**:
```bash
curl -H "Authorization: Bearer <token>" \
  https://api.example.com/facilities/accessible
```

Response includes:
- Only Kivuye Health Center (id: 2)

---

## 2. Get Facility Hierarchy

### Endpoint
```
GET /facilities/{id}/hierarchy
```

### Description
Returns detailed hierarchy information for a specific facility, including its parent facility (if any) and all child facilities.

### Authentication
Required - Bearer token in Authorization header

### Authorization
User must have access to the requested facility

### Path Parameters
| Parameter | Type | Description |
|-----------|------|-------------|
| id | integer | Facility ID |

### Response

#### Success (200 OK)
```json
{
  "facility": {
    "id": 1,
    "name": "Butaro Hospital",
    "facilityType": "hospital",
    "districtId": 11,
    "districtName": "Butaro",
    "parentFacilityId": null
  },
  "parentFacility": null,
  "childFacilities": [
    {
      "id": 2,
      "name": "Kivuye Health Center",
      "facilityType": "health_center",
      "districtId": 11
    },
    {
      "id": 3,
      "name": "Rusasa Health Center",
      "facilityType": "health_center",
      "districtId": 11
    }
  ]
}
```

#### Error Responses

**401 Unauthorized**
```json
{
  "message": "Unauthorized"
}
```

**403 Forbidden**
```json
{
  "message": "Access denied: You do not have permission to view this facility"
}
```

**404 Not Found**
```json
{
  "message": "Facility not found"
}
```

### Example Usage

**Get hierarchy for a hospital**:
```bash
curl -H "Authorization: Bearer <token>" \
  https://api.example.com/facilities/1/hierarchy
```

Response shows:
- Hospital details
- No parent facility (hospitals are top-level)
- List of child health centers

**Get hierarchy for a health center**:
```bash
curl -H "Authorization: Bearer <token>" \
  https://api.example.com/facilities/2/hierarchy
```

Response shows:
- Health center details
- Parent hospital information
- Empty child facilities array (health centers have no children)

---

## Use Cases

### 1. User Dashboard - Show Accessible Facilities
```typescript
// Fetch facilities user can access
const response = await fetch('/facilities/accessible', {
  headers: { 'Authorization': `Bearer ${token}` }
});
const facilities = await response.json();

// Display in dropdown or list
facilities.forEach(facility => {
  console.log(`${facility.name} (${facility.facilityType}) - ${facility.districtName}`);
});
```

### 2. Facility Selector with Hierarchy
```typescript
// Get hierarchy for selected facility
const facilityId = 1;
const response = await fetch(`/facilities/${facilityId}/hierarchy`, {
  headers: { 'Authorization': `Bearer ${token}` }
});
const hierarchy = await response.json();

// Display hierarchy tree
console.log(`Facility: ${hierarchy.facility.name}`);
if (hierarchy.parentFacility) {
  console.log(`  Parent: ${hierarchy.parentFacility.name}`);
}
if (hierarchy.childFacilities.length > 0) {
  console.log(`  Children:`);
  hierarchy.childFacilities.forEach(child => {
    console.log(`    - ${child.name}`);
  });
}
```

### 3. Role Assignment UI
```typescript
// When assigning DAF/DG role, show facility hierarchy
const facilityId = selectedFacility.id;
const response = await fetch(`/facilities/${facilityId}/hierarchy`, {
  headers: { 'Authorization': `Bearer ${token}` }
});
const hierarchy = await response.json();

// Validate: DAF/DG can only be assigned to hospitals
if (hierarchy.facility.facilityType !== 'hospital') {
  alert('DAF and DG roles can only be assigned to hospital facilities');
}

// Show which facilities this user will have access to
console.log('This user will have access to:');
console.log(`- ${hierarchy.facility.name} (own facility)`);
hierarchy.childFacilities.forEach(child => {
  console.log(`- ${child.name} (child facility)`);
});
```

### 4. Report Filtering
```typescript
// Get accessible facilities for report filtering
const response = await fetch('/facilities/accessible', {
  headers: { 'Authorization': `Bearer ${token}` }
});
const facilities = await response.json();

// Filter reports by accessible facilities
const accessibleIds = facilities.map(f => f.id);
const reports = await fetchReports({ facilityIds: accessibleIds });
```

---

## Security Considerations

### Authorization
- Both endpoints validate user authentication
- `getHierarchy` validates user has access to requested facility
- Access control enforced via `FacilityHierarchyService`

### District Boundaries
- Child facilities are always filtered by same district
- Prevents cross-district data leakage
- Enforces organizational hierarchy boundaries

### Data Exposure
- Users only see facilities they have access to
- Hierarchy information respects access control
- No sensitive data exposed in error messages

---

## Performance Considerations

### Caching
- `FacilityHierarchyService` caches accessible facility IDs (1 hour TTL)
- Reduces database queries for repeated requests
- Cache invalidated on user or facility updates

### Database Queries
- Efficient JOINs with districts table
- Uses indexed columns (facilityId, parentFacilityId, districtId)
- Minimal queries per request (1-3 queries max)

### Response Size
- Paginated responses not needed (facility lists are small)
- Typical response: 5-50 facilities per user
- Hierarchy response: 1 facility + 0-20 children

---

## Integration with Other Features

### Task 1: Facility Hierarchy Service
- Uses `FacilityHierarchyService.getAccessibleFacilityIds()`
- Uses `FacilityHierarchyService.canAccessFacility()`

### Task 3: Facility Hierarchy Middleware
- Endpoints can leverage middleware context if needed
- Consistent authorization logic across application

### Task 12-17: Client Implementation
- Provides data for client-side hierarchy context
- Supports facility selectors and hierarchy displays
- Enables role-based UI rendering

### Task 18: Integration Tests
- Endpoints ready for comprehensive testing
- Test scenarios documented in verification checklist
