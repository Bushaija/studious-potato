# Events API Documentation

## GET /api/events
Retrieve a list of all events.

### Query Parameters
None

### Status Codes
- **200** - Success

### Response Object
```json
[
  {
    "id": 1,
    "noteNumber": 1,
    "code": "REV001",
    "description": "Patient consultation fees",
    "statementCodes": ["REVENUE", "PATIENT_FEES"],
    "eventType": "REVENUE",
    "isCurrent": true,
    "displayOrder": 1,
    "createdAt": "2024-01-01T00:00:00Z",
    "updatedAt": "2024-01-01T00:00:00Z"
  },
  {
    "id": 2,
    "noteNumber": 2,
    "code": "EXP001",
    "description": "Medical supplies",
    "statementCodes": ["EXPENSE", "SUPPLIES"],
    "eventType": "EXPENSE",
    "isCurrent": true,
    "displayOrder": 2,
    "createdAt": "2024-01-01T00:00:00Z",
    "updatedAt": "2024-01-01T00:00:00Z"
  }
]
```

---

## POST /api/events
Create a new event.

### Request Body
```json
{
  "noteNumber": 3,
  "code": "AST001",
  "description": "Medical equipment",
  "statementCodes": ["ASSET", "EQUIPMENT"],
  "eventType": "ASSET",
  "isCurrent": true,
  "displayOrder": 3
}
```

### Required Fields
- `noteNumber` (integer)
- `code` (string, max 50 characters)
- `description` (string)
- `statementCodes` (array of strings)
- `eventType` (string)
- `displayOrder` (integer)

### Event Types
- `REVENUE`, `EXPENSE`, `ASSET`, `LIABILITY`, `EQUITY`

### Status Codes
- **201** - Event created successfully
- **400** - Invalid event data
- **409** - Event with this code or note number already exists

### Response Object
Returns the created event object with the same structure as GET response.

---

## GET /api/events/{id}
Retrieve a specific event by ID.

### Path Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | number | Yes | Event ID |

### Status Codes
- **200** - Success
- **404** - Event not found

### Response Object
Returns a single event object with the same structure as in the GET list response.

---

## PUT /api/events/{id}
Update an entire event (replace all fields).

### Path Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | number | Yes | Event ID |

### Request Body
Same structure as POST request - all required fields must be provided.

### Status Codes
- **200** - Event updated successfully
- **400** - Invalid event data
- **404** - Event not found

### Response Object
Returns the updated event object.

---

## PATCH /api/events/{id}
Partially update an event (update specific fields only).

### Path Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | number | Yes | Event ID |

### Request Body
```json
{
  "description": "Updated medical equipment description",
  "isCurrent": false
}
```

All fields are optional - only provide the fields you want to update.

### Status Codes
- **200** - Event updated successfully
- **400** - Invalid event data
- **404** - Event not found

### Response Object
Returns the updated event object.

---

## DELETE /api/events/{id}
Delete an event by ID.

### Path Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | number | Yes | Event ID |

### Status Codes
- **204** - Event deleted successfully
- **404** - Event not found

### Response Object
No content on successful deletion.

## Error Response Format
```json
{
  "message": "Error description"
}
```