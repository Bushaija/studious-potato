# Districts API Documentation

## GET /api/districts
Retrieve a list of all districts.

### Query Parameters
None

### Status Codes
- **200** - Success

### Response Object
```json
[
  {
    "id": 1,
    "name": "Kigali",
    "provinceId": 1
  },
  {
    "id": 2,
    "name": "Gasabo",
    "provinceId": 1
  }
]
```

---

## GET /api/districts/{id}
Retrieve a specific district by ID.

### Path Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | number | Yes | District ID |

### Status Codes
- **200** - Success
- **404** - District not found

### Response Object
```json
{
  "id": 1,
  "name": "Kigali",
  "provinceId": 1
}
```

## Error Response Format
```json
{
  "message": "Not Found"
}
```