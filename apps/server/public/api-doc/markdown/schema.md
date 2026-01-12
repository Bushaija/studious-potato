# Schemas API Documentation

## Endpoints Overview

The Schemas API manages form schemas that define the structure and validation rules for different modules across project types and facility types.

---

## GET /api/schemas

Retrieve a list of form schemas with filtering and pagination.

### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `moduleType` | string | No | Filter by module (`planning`, `execution`, `reporting`) |
| `projectType` | string | No | Filter by project type (`HIV`, `Malaria`, `TB`) |
| `facilityType` | string | No | Filter by facility type (`hospital`, `health_center`) |
| `isActive` | string | No | Filter by active status (`"true"`, `"false"`) |
| `page` | string | No | Page number for pagination |
| `limit` | string | No | Number of items per page |

### Response

**Status Code:** `200 OK`

```json
{
  "data": [
    {
      "id": 1,
      "name": "HIV Planning Form v2.1",
      "version": "2.1.0",
      "projectType": "HIV",
      "facilityType": "hospital",
      "moduleType": "planning",
      "isActive": true,
      "schema": {
        "fields": [
          {
            "name": "patientCount",
            "type": "number",
            "required": true,
            "validation": {
              "min": 0
            }
          }
        ]
      },
      "metadata": {
        "description": "Form for HIV planning data collection",
        "lastModifiedBy": "system"
      },
      "createdBy": 1,
      "createdAt": "2024-01-01T00:00:00Z",
      "updatedAt": "2024-01-01T00:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "pages": 3
  }
}
```

---

## POST /api/schemas

Create a new form schema.

### Request Body

```json
{
  "name": "HIV Planning Form v2.1",
  "version": "2.1.0",
  "projectType": "HIV",
  "facilityType": "hospital",
  "moduleType": "planning",
  "schema": {
    "fields": [
      {
        "name": "patientCount",
        "type": "number",
        "required": true,
        "validation": {
          "min": 0
        }
      }
    ]
  },
  "metadata": {
    "description": "Form for HIV planning data collection"
  },
  "isActive": true
}
```

**Required fields:** `name`, `version`, `moduleType`, `schema`

**Field constraints:**
- `name`: 1-100 characters
- `version`: 1-20 characters
- `projectType`: `HIV`, `Malaria`, `TB` (optional)
- `facilityType`: `hospital`, `health_center` (optional)
- `moduleType`: `planning`, `execution`, `reporting`
- `isActive`: defaults to `true`

### Response

**Status Code:** `201 Created`

Returns the created schema object.

**Status Code:** `400 Bad Request`

```json
{
  "error": "VALIDATION_ERROR",
  "message": "Schema validation failed: missing required field 'name'"
}
```

---

## GET /api/schemas/{id}

Retrieve a specific schema by ID.

### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | number | Yes | Schema ID |

### Response

**Status Code:** `200 OK`

Returns a single schema object.

**Status Code:** `404 Not Found`

```json
{
  "message": "Not Found"
}
```

---

## PATCH /api/schemas/{id}

Partially update a schema.

### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | number | Yes | Schema ID |

### Request Body

```json
{
  "name": "Updated HIV Planning Form",
  "isActive": false,
  "metadata": {
    "description": "Updated form description",
    "changelog": "Fixed validation rules"
  }
}
```

**All fields are optional** - same constraints as POST request.

### Response

**Status Code:** `200 OK`

Returns the updated schema object.

**Status Code:** `400 Bad Request`

```json
{
  "error": "VALIDATION_ERROR",
  "message": "Invalid schema structure"
}
```

**Status Code:** `404 Not Found`

```json
{
  "message": "Not Found"
}
```

---

## DELETE /api/schemas/{id}

Delete a schema.

### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | number | Yes | Schema ID |

### Response

**Status Code:** `204 No Content`

**Status Code:** `404 Not Found`

```json
{
  "message": "Not Found"
}
```

---

## PATCH /api/schemas/{id}/activate

Activate a schema (set isActive to true).

### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | number | Yes | Schema ID |

### Response

**Status Code:** `200 OK`

Returns the activated schema object with `isActive: true`.

**Status Code:** `404 Not Found`

```json
{
  "message": "Not Found"
}
```

---

## PATCH /api/schemas/{id}/deactivate

Deactivate a schema (set isActive to false).

### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | number | Yes | Schema ID |

### Response

**Status Code:** `200 OK`

Returns the deactivated schema object with `isActive: false`.

**Status Code:** `404 Not Found`

```json
{
  "message": "Not Found"
}
```

---

## Data Models

### Schema Object

| Field | Type | Nullable | Description |
|-------|------|----------|-------------|
| `id` | integer | No | Unique identifier |
| `name` | string | No | Schema name (1-100 chars) |
| `version` | string | No | Version string (1-20 chars) |
| `projectType` | string | Yes | Project type: `HIV`, `Malaria`, `TB` |
| `facilityType` | string | Yes | Facility type: `hospital`, `health_center` |
| `moduleType` | string | No | Module: `planning`, `execution`, `reporting` |
| `isActive` | boolean | No | Whether schema is active |
| `schema` | object | No | JSON schema definition |
| `metadata` | object | Yes | Additional metadata |
| `createdBy` | integer | Yes | Creator user ID |
| `createdAt` | string | No | Creation timestamp |
| `updatedAt` | string | No | Last update timestamp |

### Schema Definition Example

```json
{
  "fields": [
    {
      "name": "patientCount",
      "type": "number",
      "label": "Number of Patients",
      "required": true,
      "validation": {
        "min": 0,
        "max": 10000
      }
    },
    {
      "name": "treatmentType",
      "type": "select",
      "label": "Treatment Type",
      "options": [
        {"value": "ART", "label": "Antiretroviral Therapy"},
        {"value": "PrEP", "label": "Pre-exposure Prophylaxis"}
      ],
      "required": true
    },
    {
      "name": "notes",
      "type": "textarea",
      "label": "Additional Notes",
      "required": false,
      "validation": {
        "maxLength": 500
      }
    }
  ],
  "calculations": [
    {
      "field": "totalCost",
      "formula": "patientCount * unitCost"
    }
  ]
}
```

### Pagination Object

| Field | Type | Description |
|-------|------|-------------|
| `page` | number | Current page number |
| `limit` | number | Items per page |
| `total` | number | Total number of items |
| `pages` | number | Total number of pages |