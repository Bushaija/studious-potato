# Planning API: Create & Update Endpoints Analysis

## Overview

This document provides a detailed analysis of the Planning module's CREATE and UPDATE API endpoints, including their data flow, validation, authorization, and business logic.

---

## 1. CREATE Endpoint

### Route Definition
```typescript
POST /planning
```

### Request Schema
```typescript
{
  schemaId: number,           // Required: Form schema ID
  activityId?: number,        // Optional: Maps to entityId in DB
  projectId: number,          // Required: Project (HIV, TB, Malaria)
  facilityId: number,         // Required: Facility where planning occurs
  reportingPeriodId?: number, // Optional: Reporting period
  formData: Record<string, any>, // Required: Nested activity data
  metadata?: Record<string, any> // Optional: Additional metadata
}
```

### Authorization Logic

The CREATE endpoint implements **role-based facility access control**:

#### 1. Admin Users
- **Must** provide explicit `facilityId`
- Can create planning for **any facility** (no district restrictions)
- Returns `400 BAD_REQUEST` if `facilityId` is missing

#### 2. Hospital Accountants
- **Must** provide explicit `facilityId`
- Can only create planning for facilities **in their district**
- System validates facility is in `userContext.accessibleFacilityIds`
- Returns `403 FORBIDDEN` if facility is outside their district

#### 3. Health Center Users
- `facilityId` is **overridden** with their own facility
- Cannot create planning for other facilities
- System uses `userContext.facilityId` regardless of request body

### Business Logic Flow

```
1. Get User Context
   ↓
2. Validate Facility Access
   ↓
3. Check for Duplicate Planning
   ↓
4. Normalize Form Data
   ↓
5. Validate Against Schema
   ↓
6. Calculate Computed Values
   ↓
7. Insert to Database
   ↓
8. Return Created Record
```

### Key Features

#### Duplicate Prevention
```typescript
// Checks if planning already exists for:
// - Same facility
// - Same project
// - Same reporting period
// - Entity type = 'planning'

if (existingPlanning) {
  return 409 CONFLICT with existingPlanningId
}
```

#### Form Data Normalization
```typescript
function normalizeFormData(formData: any) {
  // For each activity:
  // 1. Parse numeric fields (unitCost, frequency, counts)
  // 2. Calculate quarterly amounts
  // 3. Calculate total budget
  
  activity.q1_amount = frequency * unitCost * q1Count;
  activity.q2_amount = frequency * unitCost * q2Count;
  activity.q3_amount = frequency * unitCost * q3Count;
  activity.q4_amount = frequency * unitCost * q4Count;
  activity.total_budget = sum of all quarters;
}
```

#### Computed Values Calculation
```typescript
async function calculateNestedComputedValues(formData: any) {
  // For each activity in formData.activities:
  computedValues.activities[activityId] = {
    q1_amount: frequency * unitCost * q1Count,
    q2_amount: frequency * unitCost * q2Count,
    q3_amount: frequency * unitCost * q3Count,
    q4_amount: frequency * unitCost * q4Count,
    total_budget: sum of all quarters,
    activity_name: "Medical Doctor",
    activity_type: "SALARY",
    category_code: "HR"
  };
}
```

### Response Codes

| Code | Scenario |
|------|----------|
| `201 CREATED` | Planning successfully created |
| `400 BAD_REQUEST` | Missing facilityId (admin), validation failed |
| `401 UNAUTHORIZED` | No authentication token |
| `403 FORBIDDEN` | Facility not in user's district, user not associated with facility |
| `409 CONFLICT` | Planning already exists for facility/project/period |
| `500 INTERNAL_SERVER_ERROR` | Database or system error |

### Example Request
```json
POST /planning
{
  "schemaId": 1,
  "projectId": 5,
  "facilityId": 12,
  "reportingPeriodId": 8,
  "formData": {
    "activities": {
      "101": {
        "unit_cost": 5000,
        "frequency": 12,
        "q1_count": 2,
        "q2_count": 2,
        "q3_count": 2,
        "q4_count": 2
      },
      "102": {
        "unit_cost": 3000,
        "frequency": 12,
        "q1_count": 5,
        "q2_count": 5,
        "q3_count": 5,
        "q4_count": 5
      }
    }
  },
  "metadata": {
    "notes": "Initial planning for Q1 2024"
  }
}
```

### Example Response
```json
201 CREATED
{
  "id": 456,
  "schemaId": 1,
  "entityId": null,
  "entityType": "planning",
  "projectId": 5,
  "facilityId": 12,
  "reportingPeriodId": 8,
  "formData": {
    "activities": {
      "101": {
        "unit_cost": 5000,
        "frequency": 12,
        "q1_count": 2,
        "q2_count": 2,
        "q3_count": 2,
        "q4_count": 2,
        "q1_amount": 120000,
        "q2_amount": 120000,
        "q3_amount": 120000,
        "q4_amount": 120000,
        "total_budget": 480000
      }
    }
  },
  "computedValues": {
    "activities": {
      "101": {
        "q1_amount": 120000,
        "q2_amount": 120000,
        "q3_amount": 120000,
        "q4_amount": 120000,
        "total_budget": 480000,
        "activity_name": "Medical Doctor",
        "activity_type": "SALARY",
        "category_code": "HR"
      }
    }
  },
  "validationState": {
    "isValid": true,
    "lastValidated": "2024-01-15T10:30:00Z"
  },
  "schema": { /* schema details */ },
  "project": { /* project details */ },
  "facility": { /* facility details */ },
  "reportingPeriod": { /* period details */ },
  "createdAt": "2024-01-15T10:30:00Z",
  "updatedAt": "2024-01-15T10:30:00Z"
}
```

---

## 2. UPDATE Endpoint

### Route Definition
```typescript
PUT /planning/{id}
```

### Request Schema
```typescript
{
  // All fields from insertPlanningDataSchema are optional
  schemaId?: number,
  activityId?: number,
  projectId?: number,
  facilityId?: number,
  reportingPeriodId?: number,
  formData?: Record<string, any>,
  metadata?: Record<string, any>
}
```

### Authorization Logic

The UPDATE endpoint implements **role-based facility access control** matching the CREATE endpoint:

#### 1. Existing Record Access Validation
All users must have access to the facility of the existing planning record:
- System validates `canAccessFacility(existing.facilityId, userContext)`
- Returns `403 FORBIDDEN` if user cannot access the existing record's facility

#### 2. Facility Change Validation
If the update includes a `facilityId` change:

**Admin Users:**
- Can change to **any facility** (no restrictions)

**Hospital Accountants:**
- Can only change to facilities **in their district**
- System validates new facility is in `userContext.accessibleFacilityIds`
- Returns `403 FORBIDDEN` if new facility is outside their district

**Health Center Users:**
- **Cannot change facility** at all
- Returns `403 FORBIDDEN` if attempting to change facility

### Business Logic Flow

```
1. Parse Planning ID from URL
   ↓
2. Get User Context
   ↓
3. Fetch Existing Record
   ↓
4. Validate Access to Existing Facility
   ↓
5. Validate Access to New Facility (if changing)
   ↓
6. Merge Existing + New Form Data
   ↓
7. Normalize Form Data
   ↓
8. Validate Merged Data
   ↓
9. Recalculate Computed Values
   ↓
10. Update Database
   ↓
11. Return Updated Record
```

### Key Features

#### Partial Updates (Merge Strategy)
```typescript
const updatedFormData = {
  ...existing.formData,  // Keep existing data
  ...body.formData,      // Override with new data
};
```

This means:
- You can update **specific activities** without sending all activities
- Unspecified fields retain their existing values
- New activities can be added to existing planning

#### Validation on Update
```typescript
if (body.formData) {
  const validationResult = await validationService.validateFormData(
    existing.schemaId,
    updatedFormData
  );

  if (!validationResult.isValid) {
    return 400 BAD_REQUEST with errors;
  }
}
```

#### Automatic Recomputation
```typescript
// Recalculates all computed values after update
const computedValues = await computationService.calculateValues(
  existing.schemaId,
  updatedFormData
);
```

### Response Codes

| Code | Scenario |
|------|----------|
| `200 OK` | Planning successfully updated |
| `400 BAD_REQUEST` | Validation failed |
| `401 UNAUTHORIZED` | No authentication token |
| `403 FORBIDDEN` | Cannot access existing facility, new facility not in district, health center user trying to change facility, user not associated with facility |
| `404 NOT_FOUND` | Planning ID doesn't exist or not a planning entity |
| `500 INTERNAL_SERVER_ERROR` | Database or system error |

### Example Request
```json
PUT /planning/456
{
  "formData": {
    "activities": {
      "101": {
        "q1_count": 3,  // Update only Q1 count
        "q2_count": 3
      }
    }
  },
  "metadata": {
    "notes": "Updated counts based on revised staffing plan"
  }
}
```

### Example Response
```json
200 OK
{
  "id": 456,
  "schemaId": 1,
  "entityType": "planning",
  "projectId": 5,
  "facilityId": 12,
  "reportingPeriodId": 8,
  "formData": {
    "activities": {
      "101": {
        "unit_cost": 5000,      // Unchanged
        "frequency": 12,         // Unchanged
        "q1_count": 3,          // Updated
        "q2_count": 3,          // Updated
        "q3_count": 2,          // Unchanged
        "q4_count": 2,          // Unchanged
        "q1_amount": 180000,    // Recalculated
        "q2_amount": 180000,    // Recalculated
        "q3_amount": 120000,    // Unchanged
        "q4_amount": 120000,    // Unchanged
        "total_budget": 600000  // Recalculated
      }
    }
  },
  "computedValues": {
    "activities": {
      "101": {
        "q1_amount": 180000,
        "q2_amount": 180000,
        "q3_amount": 120000,
        "q4_amount": 120000,
        "total_budget": 600000,
        "activity_name": "Medical Doctor",
        "activity_type": "SALARY",
        "category_code": "HR"
      }
    }
  },
  "validationState": {
    "isValid": true,
    "lastValidated": "2024-01-15T14:45:00Z"
  },
  "updatedAt": "2024-01-15T14:45:00Z"
}
```

---

## 3. Data Structure Deep Dive

### Form Data Structure
```typescript
{
  "activities": {
    "[activityId]": {
      // Input fields (user-provided)
      "unit_cost": number,
      "frequency": number,
      "q1_count": number,
      "q2_count": number,
      "q3_count": number,
      "q4_count": number,
      
      // Computed fields (auto-calculated)
      "q1_amount": number,
      "q2_amount": number,
      "q3_amount": number,
      "q4_amount": number,
      "total_budget": number
    }
  }
}
```

### Computed Values Structure
```typescript
{
  "activities": {
    "[activityId]": {
      // Financial calculations
      "q1_amount": number,
      "q2_amount": number,
      "q3_amount": number,
      "q4_amount": number,
      "total_budget": number,
      
      // Activity metadata (for reporting)
      "activity_name": string,
      "activity_type": string,
      "category_code": string
    }
  }
}
```

### Database Record Structure
```typescript
{
  id: number,
  schemaId: number,
  entityId: number | null,        // Maps to activityId
  entityType: "planning",
  projectId: number,
  facilityId: number,
  reportingPeriodId: number | null,
  formData: object,               // Nested activities structure
  computedValues: object,         // Calculated amounts + metadata
  validationState: object,        // Validation status
  metadata: object,               // User-defined metadata
  createdBy: number,
  createdAt: timestamp,
  updatedBy: number,
  updatedAt: timestamp
}
```

---

## 4. Calculation Logic

### Quarterly Amount Formula
```
quarterly_amount = frequency × unit_cost × quarterly_count
```

### Example Calculation
```typescript
// Input
unit_cost = 5000      // Monthly salary
frequency = 12        // 12 months per year
q1_count = 2          // 2 staff members

// Calculation
q1_amount = 12 × 5000 × 2 = 120,000

// Total Budget
total_budget = q1_amount + q2_amount + q3_amount + q4_amount
```

### Activity Types & Calculations

Different activity types may have different calculation logic:

| Activity Type | Frequency Meaning | Example |
|--------------|-------------------|---------|
| `SALARY` | Months per year | 12 |
| `TRANSPORT` | Trips per quarter | 4 |
| `SUPPLIES` | Orders per quarter | 1 |
| `TRAINING` | Sessions per year | 2 |

---

## 5. Validation Rules

### Schema Validation
```typescript
// Performed by validationService.validateFormData()
// Checks:
// - Required fields present
// - Data types correct
// - Value ranges valid
// - Business rules satisfied
```

### Common Validation Errors
```json
{
  "isValid": false,
  "errors": [
    {
      "field": "activities.101.unit_cost",
      "message": "Unit cost must be greater than 0",
      "code": "MIN_VALUE"
    },
    {
      "field": "activities.102.frequency",
      "message": "Frequency is required",
      "code": "REQUIRED"
    }
  ]
}
```

---

## 6. Security Considerations

### Current Implementation

✅ **Implemented:**
- Authentication required (via `getUserContext`)
- District-based facility access for CREATE
- District-based facility access for UPDATE
- Facility change validation for UPDATE
- Duplicate prevention (CREATE only)
- Input validation
- Automatic data normalization
- Computed values recalculation

⚠️ **Missing:**
- Audit logging for changes
- Rate limiting
- Field-level permissions
- Concurrent update handling (optimistic locking)

### Recommended Enhancements

```typescript
// 1. Add audit trail
await db.insert(auditLog).values({
  userId: userContext.userId,
  action: 'UPDATE_PLANNING',
  entityId: planningId,
  changes: diff(existing, updated),
  timestamp: new Date()
});

// 2. Add field-level permissions
if (!hasPermission(userContext, 'edit_unit_cost')) {
  delete body.formData.activities[id].unit_cost;
}

// 3. Add optimistic locking for concurrent updates
await db.update(schemaFormDataEntries)
  .set({ ...updates, version: existing.version + 1 })
  .where(and(
    eq(schemaFormDataEntries.id, planningId),
    eq(schemaFormDataEntries.version, existing.version)
  ));

if (result.rowCount === 0) {
  return c.json({ message: "Conflict: record was modified by another user" }, 409);
}
```

---

## 7. Error Handling

### Error Response Format
```json
{
  "message": "Human-readable error message",
  "errors": [
    {
      "field": "fieldName",
      "message": "Specific error",
      "code": "ERROR_CODE"
    }
  ]
}
```

### Common Error Scenarios

| Scenario | Code | Message |
|----------|------|---------|
| No auth token | 401 | "Authentication required" |
| User not in facility | 403 | "User must be associated with a facility" |
| Facility not in district | 403 | "Access denied: facility not in your district" |
| Missing facilityId (admin) | 400 | "Admin users must provide an explicit facilityId" |
| Duplicate planning | 409 | "Planning already exists for this facility, program, and reporting period" |
| Validation failed | 400 | "Validation failed" + errors array |
| Planning not found | 404 | "Planning data not found" |
| System error | 500 | "Failed to create/update planning data" |

---

## 8. Performance Considerations

### Database Queries

**CREATE:**
- 1 query: Check for existing planning
- 1 query: Insert new planning
- 1 query: Fetch created record with relations
- N queries: Fetch activity metadata (cached)

**UPDATE:**
- 1 query: Fetch existing planning
- 1 query: Update planning
- 1 query: Fetch updated record with relations
- N queries: Recalculate computed values

### Optimization Opportunities

```typescript
// 1. Batch activity metadata fetches
const activityCache = new Map();
const activities = await db.query.dynamicActivities.findMany({
  where: inArray(dynamicActivities.id, activityIds)
});

// 2. Use database transactions
await db.transaction(async (tx) => {
  await tx.insert(schemaFormDataEntries).values(data);
  await tx.insert(auditLog).values(audit);
});

// 3. Cache form schemas
const schemaCache = new LRUCache({ max: 100 });
```

---

## 9. Testing Recommendations

### Unit Tests
```typescript
describe('Planning CREATE', () => {
  it('should create planning for admin user', async () => {});
  it('should restrict health center user to own facility', async () => {});
  it('should prevent duplicate planning', async () => {});
  it('should calculate quarterly amounts correctly', async () => {});
  it('should validate form data', async () => {});
});

describe('Planning UPDATE', () => {
  it('should merge form data correctly', async () => {});
  it('should recalculate computed values', async () => {});
  it('should validate updated data', async () => {});
  it('should return 404 for non-existent planning', async () => {});
});
```

### Integration Tests
```typescript
describe('Planning API Integration', () => {
  it('should create and update planning end-to-end', async () => {});
  it('should enforce district-based access', async () => {});
  it('should handle concurrent updates', async () => {});
});
```

---

## 10. Future Enhancements

### Proposed Features

1. **Bulk Operations**
   ```typescript
   POST /planning/bulk
   // Create multiple planning entries at once
   ```

2. **Planning Templates**
   ```typescript
   POST /planning/from-template
   // Create planning from predefined template
   ```

3. **Version History**
   ```typescript
   GET /planning/{id}/history
   // View all changes to a planning entry
   ```

4. **Approval Workflow**
   ```typescript
   POST /planning/{id}/submit
   POST /planning/{id}/approve
   POST /planning/{id}/reject
   ```

5. **Budget Comparison**
   ```typescript
   GET /planning/{id}/compare/{otherId}
   // Compare two planning versions
   ```

---

## Summary

The Planning API's CREATE and UPDATE endpoints provide a robust foundation for managing financial planning data with:

- ✅ Role-based access control
- ✅ Automatic calculations
- ✅ Data validation
- ✅ Duplicate prevention
- ✅ Flexible data structure

**Key Improvements Needed:**
- Add authorization checks to UPDATE endpoint
- Implement audit logging
- Add field-level permissions
- Optimize database queries
- Add comprehensive test coverage
