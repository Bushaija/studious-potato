# Planning API Documentation

## Endpoints Overview

The Planning API provides CRUD operations and utility functions for managing planning data entries.

---

## GET /api/planning

Retrieve a list of planning data entries with optional filtering and pagination.

### Query Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `projectId` | integer | No | - | Filter by project ID |
| `facilityId` | integer | No | - | Filter by facility ID |
| `reportingPeriodId` | integer | No | - | Filter by reporting period ID |
| `categoryId` | integer | No | - | Filter by category ID |
| `year` | integer | No | - | Filter by year |
| `page` | integer | No | 1 | Page number (min: 1) |
| `limit` | integer | No | 20 | Items per page (min: 1, max: 100) |

### Response

**Status Code:** `200 OK`

```json
{
  "data": [
    {
      "id": 1,
      "schemaId": 1,
      "entityId": 1,
      "entityType": "string",
      "projectId": 1,
      "facilityId": 1,
      "reportingPeriodId": 1,
      "formData": {},
      "computedValues": {},
      "validationState": {},
      "metadata": {},
      "createdBy": 1,
      "createdAt": "2024-01-01T00:00:00Z",
      "updatedBy": 1,
      "updatedAt": "2024-01-01T00:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

---

## POST /api/planning

Create a new planning data entry.

### Request Body

```json
{
  "schemaId": 1,
  "projectId": 1,
  "facilityId": 1,
  "reportingPeriodId": 1,
  "formData": {},
  "metadata": {}
}
```

**Required fields:** `schemaId`, `projectId`, `facilityId`, `formData`

### Response

**Status Code:** `201 Created`

Returns the created planning data object (same structure as GET response item).

**Status Code:** `400 Bad Request`

```json
{
  "message": "Validation error message"
}
```

---

## GET /api/planning/{id}

Retrieve a specific planning data entry by ID.

### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | number | Yes | Planning data entry ID |

### Response

**Status Code:** `200 OK`

Returns a single planning data object (same structure as POST 201 response).

**Status Code:** `404 Not Found`

```json
{
  "message": "Not Found"
}
```

---

## PUT /api/planning/{id}

Update an existing planning data entry.

### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | number | Yes | Planning data entry ID |

### Request Body

```json
{
  "schemaId": 1,
  "projectId": 1,
  "facilityId": 1,
  "reportingPeriodId": 1,
  "formData": {},
  "metadata": {}
}
```

### Response

**Status Code:** `200 OK`

Returns the updated planning data object.

**Status Code:** `404 Not Found`

```json
{
  "message": "Not Found"
}
```

---

## DELETE /api/planning/{id}

Delete a planning data entry.

### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | number | Yes | Planning data entry ID |

### Response

**Status Code:** `204 No Content`

**Status Code:** `404 Not Found`

```json
{
  "message": "Not Found"
}
```

---

## POST /api/planning/calculate-totals

Calculate quarterly and annual totals for planning data.

### Request Body

```json
{
  "planningId": 1,
  "data": {}
}
```

**Required fields:** `planningId`, `data`

### Response

**Status Code:** `200 OK`

```json
{
  "quarterlyTotals": {
    "q1": 1000.00,
    "q2": 1500.00,
    "q3": 2000.00,
    "q4": 1200.00
  },
  "annualTotal": 5700.00,
  "categoryTotals": {
    "category1": 2000.00,
    "category2": 3700.00
  },
  "computedValues": {}
}
```

---

## POST /api/planning/validate

Validate planning data against schema rules.

### Request Body

```json
{
  "schemaId": 1,
  "data": {},
  "context": {
    "projectType": "HIV",
    "facilityType": "hospital",
    "reportingPeriod": "2024-Q1"
  }
}
```

**Required fields:** `schemaId`, `data`

**Context enums:**
- `projectType`: `HIV`, `Malaria`, `TB`
- `facilityType`: `hospital`, `health_center`

### Response

**Status Code:** `200 OK`

```json
{
  "isValid": true,
  "errors": [
    {
      "field": "fieldName",
      "message": "Error description",
      "code": "ERROR_CODE"
    }
  ],
  "computedValues": {}
}
```

---

## Data Models

### Planning Data Object

| Field | Type | Nullable | Description |
|-------|------|----------|-------------|
| `id` | integer | No | Unique identifier |
| `schemaId` | integer | No | Schema reference |
| `entityId` | integer | Yes | Entity reference |
| `entityType` | string | No | Type of entity |
| `projectId` | integer | No | Project reference |
| `facilityId` | integer | No | Facility reference |
| `reportingPeriodId` | integer | Yes | Reporting period reference |
| `formData` | object | No | Form input data |
| `computedValues` | object | Yes | Calculated values |
| `validationState` | object | Yes | Validation results |
| `metadata` | object | Yes | Additional metadata |
| `createdBy` | integer | Yes | Creator user ID |
| `createdAt` | string | No | Creation timestamp |
| `updatedBy` | integer | Yes | Last modifier user ID |
| `updatedAt` | string | No | Last update timestamp |