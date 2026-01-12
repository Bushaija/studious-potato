# Event Mappings API Documentation

## GET /api/event-mappings
Retrieve a paginated list of event mappings with optional filtering.

### Query Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `eventId` | integer | No | Filter by event ID |
| `activityId` | integer | No | Filter by activity ID |
| `categoryId` | integer | No | Filter by category ID |
| `projectType` | string | No | Filter by project type (`HIV`, `Malaria`, `TB`) |
| `facilityType` | string | No | Filter by facility type (`hospital`, `health_center`) |
| `mappingType` | string | No | Filter by mapping type (`DIRECT`, `COMPUTED`, `AGGREGATED`) |
| `isActive` | boolean | No | Filter by active status |
| `page` | integer | No | Page number - Default: `1` |
| `limit` | integer | No | Items per page (1-100) - Default: `20` |

### Status Codes
- **200** - Success

### Response Object
```json
{
  "data": [
    {
      "id": 1,
      "eventId": 10,
      "activityId": 5,
      "categoryId": 3,
      "projectType": "HIV",
      "facilityType": "hospital",
      "mappingType": "DIRECT",
      "mappingFormula": null,
      "mappingRatio": 1.0,
      "isActive": true,
      "effectiveFrom": "2024-01-01",
      "effectiveTo": null,
      "metadata": {},
      "createdAt": "2024-01-01T00:00:00Z",
      "updatedAt": "2024-01-01T00:00:00Z",
      "event": {
        "id": 10,
        "noteNumber": 1,
        "code": "REV001",
        "description": "Patient fees",
        "statementCodes": ["REVENUE"],
        "eventType": "REVENUE",
        "isCurrent": true,
        "displayOrder": 1,
        "createdAt": "2024-01-01T00:00:00Z",
        "updatedAt": "2024-01-01T00:00:00Z"
      },
      "activity": {
        "id": 5,
        "name": "Primary Care",
        "code": "PC001"
      },
      "category": {
        "id": 3,
        "name": "Medical Services",
        "code": "MED001"
      }
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

## POST /api/event-mappings
Create a new event mapping.

### Request Body
```json
{
  "eventId": 10,
  "activityId": 5,
  "categoryId": 3,
  "projectType": "HIV",
  "facilityType": "hospital",
  "mappingType": "DIRECT",
  "mappingFormula": null,
  "mappingRatio": 1.0,
  "effectiveFrom": "2024-01-01",
  "effectiveTo": null,
  "metadata": {}
}
```

### Required Fields
- `eventId` (integer)
- `projectType` (string)
- `facilityType` (string)

### Mapping Types
- `DIRECT`, `COMPUTED`, `AGGREGATED`

### Status Codes
- **201** - Event mapping created successfully
- **400** - Validation error

### Response Object
Returns the created event mapping object with the same structure as GET response.

---

## GET /api/event-mappings/{id}
Retrieve a specific event mapping by ID.

### Path Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | number | Yes | Event mapping ID |

### Status Codes
- **200** - Success
- **404** - Event mapping not found

### Response Object
Returns a single event mapping object with detailed event, activity, and category information.

---

## PUT /api/event-mappings/{id}
Update an existing event mapping.

### Path Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | number | Yes | Event mapping ID |

### Request Body
Same structure as POST request, but all fields are optional.

### Status Codes
- **200** - Event mapping updated successfully
- **404** - Event mapping not found

### Response Object
Returns the updated event mapping object.

---

## DELETE /api/event-mappings/{id}
Delete an event mapping by ID.

### Path Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | number | Yes | Event mapping ID |

### Status Codes
- **204** - Event mapping deleted successfully
- **404** - Event mapping not found

### Response Object
No content on successful deletion.

---

## POST /api/event-mappings/bulk-update
Perform bulk operations on multiple event mappings.

### Request Body
```json
{
  "mappings": [
    {
      "id": 1,
      "eventId": 10,
      "activityId": 5,
      "categoryId": 3,
      "mappingType": "DIRECT",
      "mappingFormula": null,
      "mappingRatio": 1.0
    }
  ],
  "projectType": "HIV",
  "facilityType": "hospital"
}
```

### Required Fields
- `mappings` (array)
- `projectType` (string)
- `facilityType` (string)

### Status Codes
- **200** - Bulk update completed

### Response Object
```json
{
  "created": 5,
  "updated": 3,
  "errors": [
    {
      "index": 2,
      "message": "Invalid event ID"
    }
  ]
}
```

---

## POST /api/event-mappings/validate
Validate mapping formula and configuration.

### Request Body
```json
{
  "eventId": 10,
  "mappingFormula": "activity1 * 0.8 + activity2 * 0.2",
  "testData": {
    "activity1": 1000,
    "activity2": 500
  }
}
```

### Required Fields
- `eventId` (integer)
- `mappingFormula` (string)

### Status Codes
- **200** - Validation completed

### Response Object
```json
{
  "isValid": true,
  "result": 900,
  "errors": [],
  "warnings": [
    {
      "message": "Consider using integer coefficients",
      "code": "FLOAT_PRECISION"
    }
  ]
}
```

---

## GET /api/event-mappings/templates/{projectType}/{facilityType}
Get event mapping template with recommendations.

### Path Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `projectType` | string | Yes | Project type (`HIV`, `Malaria`, `TB`) |
| `facilityType` | string | Yes | Facility type (`hospital`, `health_center`) |

### Status Codes
- **200** - Success

### Response Object
```json
{
  "mappings": [
    {
      "id": 1,
      "eventId": 10,
      "activityId": 5,
      "categoryId": 3,
      "projectType": "HIV",
      "facilityType": "hospital",
      "mappingType": "DIRECT",
      "mappingFormula": null,
      "mappingRatio": 1.0,
      "isActive": true,
      "effectiveFrom": "2024-01-01",
      "effectiveTo": null,
      "metadata": {},
      "createdAt": "2024-01-01T00:00:00Z",
      "updatedAt": "2024-01-01T00:00:00Z"
    }
  ],
  "unmappedEvents": [
    {
      "id": 15,
      "noteNumber": 2,
      "code": "EXP001",
      "description": "Medical supplies",
      "statementCodes": ["EXPENSE"],
      "eventType": "EXPENSE",
      "isCurrent": true,
      "displayOrder": 2,
      "createdAt": "2024-01-01T00:00:00Z",
      "updatedAt": "2024-01-01T00:00:00Z"
    }
  ],
  "recommendedMappings": [
    {
      "eventId": 15,
      "suggestedActivityId": 7,
      "suggestedCategoryId": 4,
      "confidence": 0.85,
      "reason": "Similar events historically mapped to this activity"
    }
  ]
}
```

## Error Response Format
```json
{
  "message": "Error description"
}
```