# Provinces API Documentation

## Get All Provinces

**GET** `/api/provinces`

Retrieve a list of all provinces.

### Response

**200 OK**
```json
[
  {
    "id": 1,
    "name": "Eastern Province"
  },
  {
    "id": 2,
    "name": "Western Province"
  },
  {
    "id": 3,
    "name": "Northern Province"
  }
]
```

| Field | Type | Description |
|-------|------|-------------|
| `id` | integer | Province identifier |
| `name` | string | Province name |

---

## Get Province by ID

**GET** `/api/provinces/{id}`

Retrieve a specific province by its ID.

### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | number | Yes | Province ID |

### Response

**200 OK**
```json
{
  "id": 42,
  "name": "Central Province"
}
```

**404 Not Found**
```json
{
  "message": "Not Found"
}
```

**422 Unprocessable Entity**
```json
{
  "success": false,
  "error": {
    "name": "ZodError",
    "issues": [
      {
        "code": "invalid_type",
        "path": ["id"],
        "message": "Invalid input: expected number, received NaN"
      }
    ]
  }
}
```

### Error Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `success` | boolean | Always `false` for error responses |
| `error.name` | string | Error type name |
| `error.issues` | array | Array of validation issues |
| `error.issues[].code` | string | Error code |
| `error.issues[].path` | array | Path to the problematic field |
| `error.issues[].message` | string | Human-readable error message |

---

## Common Error Codes

| Code | Description |
|------|-------------|
| `invalid_type` | Value type doesn't match expected type |
| `required` | Required field is missing |
| `invalid_format` | Value format is incorrect |