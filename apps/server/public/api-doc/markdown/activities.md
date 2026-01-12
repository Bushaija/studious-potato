# Activities API Documentation

## Overview

The Activities API manages budget planning activities for health programs (HIV, Malaria, TB) across different facility types (hospitals, health centers). This API replaces the hard-coded client-side form definitions with a dynamic, schema-driven approach that allows non-technical users to manage activities and categories through database configurations.

## Resource Description

An **Activity** represents a specific budgeting item within a health program, such as salaries, training, equipment purchases, or administrative costs. Activities are organized into categories (Human Resources, Travel Related Costs, etc.) and can be configured with validation rules, computation formulas, and field mappings for flexible form generation.

## Base URL
```
https://api.budget-system.com/api
```

## Authentication
All endpoints require authentication via Bearer token in the Authorization header.

---

## Endpoints

### 1. Get Activities

Retrieve a paginated list of activities with optional filtering.

**Endpoint:** `GET /api/activities`

**Purpose:** Fetch activities for dynamic form generation, filtered by program type, facility type, or category.

#### Query Parameters

| Parameter | Type | Required | Description | Example |
|-----------|------|----------|-------------|---------|
| `categoryId` | number | No | Filter by category ID | `1` |
| `projectType` | string | No | Filter by program type | `HIV`, `Malaria`, `TB` |
| `facilityType` | string | No | Filter by facility type | `hospital`, `health_center` |
| `activityType` | string | No | Filter by specific activity type | `Salary` |
| `isTotalRow` | string | No | Filter total calculation rows | `true`, `false` |
| `isAnnualOnly` | string | No | Filter annual-only activities | `true`, `false` |
| `isActive` | string | No | Filter active/inactive activities | `true`, `false` |
| `page` | string | No | Page number for pagination | `1` |
| `limit` | string | No | Number of items per page | `20` |

#### Response

**Status Code:** `200 OK`

```json
{
  "data": [
    {
      "id": 1,
      "categoryId": 1,
      "projectType": "HIV",
      "facilityType": "health_center",
      "code": "HC_NURSE_SALARY",
      "name": "HC Nurses (A1) Salary",
      "description": "Provide salaries for health facilities staff (DHs, HCs)",
      "activityType": "Salary",
      "displayOrder": 1,
      "isTotalRow": false,
      "isAnnualOnly": false,
      "fieldMappings": {
        "frequency": "monthly",
        "unitType": "person"
      },
      "computationRules": {
        "formula": "unitCost * count * frequency"
      },
      "validationRules": {
        "unitCost": {
          "required": true,
          "min": 0,
          "type": "number"
        }
      },
      "metadata": {
        "category": "Human Resources"
      },
      "isActive": true,
      "createdAt": "2025-01-15T10:00:00Z",
      "updatedAt": "2025-01-15T10:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "pages": 8
  }
}
```

---

### 2. Create Activity

Create a new activity definition.

**Endpoint:** `POST /api/activities`

**Purpose:** Add new budget activities without requiring code changes or system redeployment.

#### Request Body

```json
{
  "categoryId": 1,
  "projectType": "HIV",
  "facilityType": "hospital",
  "code": "DH_MEDICAL_DR_SALARY",
  "name": "DH Medical Dr. Salary",
  "description": "Provide salaries for health facilities staff (DHs, HCs)",
  "activityType": "Salary",
  "displayOrder": 1,
  "isTotalRow": false,
  "isAnnualOnly": false,
  "fieldMappings": {
    "frequency": "monthly",
    "unitType": "person"
  },
  "computationRules": {
    "formula": "unitCost * count * frequency"
  },
  "validationRules": {
    "unitCost": {
      "required": true,
      "min": 0,
      "type": "number"
    }
  },
  "metadata": {
    "category": "Human Resources"
  },
  "isActive": true
}
```

#### Response

**Status Code:** `201 Created`

Returns the created activity object with generated `id`, `createdAt`, and `updatedAt` fields.

**Status Code:** `400 Bad Request`

```json
{
  "error": "Validation Error",
  "message": "Activity name is required and cannot be empty"
}
```

---

### 3. Bulk Create Activities

Create multiple activities in a single request.

**Endpoint:** `POST /api/activities/bulk`

**Purpose:** Efficiently migrate existing hard-coded activities or import activity definitions from external sources.

#### Request Body

```json
{
  "activities": [
    {
      "categoryId": 1,
      "name": "HC Nurses (A1) Salary",
      "displayOrder": 1,
      "projectType": "HIV",
      "facilityType": "health_center"
    },
    {
      "categoryId": 1,
      "name": "HC Lab Technician (A1) Salary",
      "displayOrder": 2,
      "projectType": "HIV",
      "facilityType": "health_center"
    }
  ]
}
```

#### Response

**Status Code:** `201 Created`

```json
{
  "created": [
    {
      "id": 1,
      "categoryId": 1,
      "name": "HC Nurses (A1) Salary",
      "displayOrder": 1,
      "projectType": "HIV",
      "facilityType": "health_center",
      "createdAt": "2025-01-15T10:00:00Z",
      "updatedAt": "2025-01-15T10:00:00Z"
    }
  ],
  "errors": [
    {
      "index": 1,
      "error": "Activity name already exists for this category"
    }
  ]
}
```

---

### 4. Get Single Activity

Retrieve details of a specific activity.

**Endpoint:** `GET /api/activities/{id}`

**Purpose:** Fetch complete activity configuration for form rendering or editing.

#### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | number | Yes | Activity ID |

#### Response

**Status Code:** `200 OK`

Returns the complete activity object.

**Status Code:** `404 Not Found`

```json
{
  "message": "Activity not found"
}
```

---

### 5. Update Activity

Update an existing activity definition.

**Endpoint:** `PATCH /api/activities/{id}`

**Purpose:** Modify activity configurations, validation rules, or metadata without system redeployment.

#### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | number | Yes | Activity ID |

#### Request Body

Partial update object containing only the fields to be modified:

```json
{
  "name": "Updated Activity Name",
  "validationRules": {
    "unitCost": {
      "required": true,
      "min": 100,
      "max": 10000,
      "type": "number"
    }
  }
}
```

#### Response

**Status Code:** `200 OK`

Returns the updated activity object.

**Status Code:** `404 Not Found`

```json
{
  "message": "Activity not found"
}
```

---

### 6. Delete Activity

Remove an activity definition.

**Endpoint:** `DELETE /api/activities/{id}`

**Purpose:** Remove obsolete or incorrect activities from the system.

#### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | number | Yes | Activity ID |

#### Response

**Status Code:** `204 No Content`

Activity successfully deleted.

**Status Code:** `404 Not Found`

```json
{
  "message": "Activity not found"
}
```

---

### 7. Reorder Activities

Update the display order of multiple activities.

**Endpoint:** `PATCH /api/activities/reorder`

**Purpose:** Maintain proper ordering of activities within forms for better user experience.

#### Request Body

```json
{
  "activityOrders": [
    {
      "id": 1,
      "displayOrder": 2
    },
    {
      "id": 2,
      "displayOrder": 1
    }
  ]
}
```

#### Response

**Status Code:** `200 OK`

```json
{
  "updated": [
    {
      "id": 1,
      "displayOrder": 2,
      "updatedAt": "2025-01-15T10:30:00Z"
    },
    {
      "id": 2,
      "displayOrder": 1,
      "updatedAt": "2025-01-15T10:30:00Z"
    }
  ],
  "message": "Activity order updated successfully"
}
```

**Status Code:** `400 Bad Request`

```json
{
  "error": "Invalid Data",
  "message": "Activity IDs must be unique in reorder request"
}
```

---

### 8. Get Activities by Category

Retrieve all activities within a specific category.

**Endpoint:** `GET /api/activities/category/{categoryId}`

**Purpose:** Fetch category-specific activities for form section rendering.

#### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `categoryId` | string | Yes | Category ID (numeric string) |

#### Query Parameters

| Parameter | Type | Required | Description | Default |
|-----------|------|----------|-------------|---------|
| `includeInactive` | string | No | Include inactive activities | `false` |
| `projectType` | string | No | Filter by program type | - |
| `facilityType` | string | No | Filter by facility type | - |

#### Response

**Status Code:** `200 OK`

Returns an array of activities belonging to the specified category.

---

## Data Models

### Activity Object

| Field | Type | Description |
|-------|------|-------------|
| `id` | integer | Unique activity identifier |
| `categoryId` | integer | Foreign key to category |
| `projectType` | string | Program type (HIV, Malaria, TB) |
| `facilityType` | string | Facility type (hospital, health_center) |
| `code` | string | Unique activity code for API references |
| `name` | string | Display name for forms |
| `description` | string | Detailed activity description |
| `activityType` | string | Classification of activity type |
| `displayOrder` | integer | Sort order within category |
| `isTotalRow` | boolean | Indicates if this is a calculation row |
| `isAnnualOnly` | boolean | Activity appears only in annual forms |
| `fieldMappings` | object | Configuration for form field properties |
| `computationRules` | object | Formulas for automatic calculations |
| `validationRules` | object | Client and server-side validation rules |
| `metadata` | object | Additional configuration data |
| `isActive` | boolean | Activity visibility status |
| `createdAt` | string | ISO timestamp of creation |
| `updatedAt` | string | ISO timestamp of last update |

### Validation Rules Schema

```json
{
  "fieldName": {
    "required": true,
    "type": "number",
    "min": 0,
    "max": 1000000,
    "pattern": "^[0-9]+$",
    "message": "Custom validation message"
  }
}
```

### Computation Rules Schema

```json
{
  "formula": "unitCost * count * frequency",
  "dependencies": ["unitCost", "count", "frequency"],
  "resultField": "totalAmount"
}
```

---

## Error Handling

All endpoints follow consistent error response formats:

### Validation Error (400)
```json
{
  "error": "Validation Error",
  "message": "Detailed validation failure description",
  "fields": {
    "name": ["Name is required"],
    "categoryId": ["Category ID must be a positive integer"]
  }
}
```

### Not Found Error (404)
```json
{
  "message": "Activity not found"
}
```

### Server Error (500)
```json
{
  "error": "Internal Server Error",
  "message": "An unexpected error occurred"
}
```

---

## Usage Examples

### Dynamic Form Generation

1. **Fetch category activities:**
   ```http
   GET /api/activities/category/1?projectType=HIV&facilityType=health_center
   ```

2. **Render form fields based on activity configuration:**
   - Use `fieldMappings` to determine input types
   - Apply `validationRules` for client-side validation
   - Implement `computationRules` for automatic calculations

3. **Submit form data using activity codes for consistent API integration**

### Administrative Management

1. **Add new activity without code deployment:**
   ```http
   POST /api/activities
   Content-Type: application/json
   
   {
     "categoryId": 1,
     "name": "New Equipment Purchase",
     "displayOrder": 10
   }
   ```

2. **Update validation rules:**
   ```http
   PATCH /api/activities/123
   Content-Type: application/json
   
   {
     "validationRules": {
       "unitCost": {"min": 500, "max": 50000}
     }
   }
   ```

---

## Migration Benefits

By implementing this Activities API, the system transitions from:

- **Hard-coded TypeScript files** → **Database-driven configurations**
- **Developer-dependent updates** → **Admin-managed activities**
- **Rigid form structures** → **Dynamic, schema-driven forms**
- **Duplicated activity definitions** → **Centralized activity repository**

This enables rapid adaptation to changing donor requirements, program expansions, and reporting standards without system redeployment.