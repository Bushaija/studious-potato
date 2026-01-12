# Facilities API Documentation

## GET /api/facilities
Retrieve a list of all facilities.

### Query Parameters
None

### Status Codes
- **200** - Success

### Response Object
```json
[
  {
    "id": 1,
    "name": "Kigali University Hospital",
    "facilityType": "hospital",
    "districtId": 1
  },
  {
    "id": 2,
    "name": "Gasabo Health Center",
    "facilityType": "health_center",
    "districtId": 2
  }
]
```

---

## GET /api/facilities/by-district
Retrieve facilities within a specific district.

### Query Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `districtId` | integer | Yes | District ID (must be > 0) |

### Status Codes
- **200** - Success
- **400** - Invalid district ID
- **404** - Facilities not found

### Response Object
```json
[
  {
    "id": 1,
    "name": "Kigali University Hospital",
    "facilityType": "hospital"
  },
  {
    "id": 3,
    "name": "Central Health Center",
    "facilityType": "health_center"
  }
]
```

---

## GET /api/facilities/by-name
Search for a facility by name.

### Query Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `facilityName` | string | Yes | Facility name (minimum 1 character) |

### Status Codes
- **200** - Success
- **400** - Invalid facility data
- **404** - Facility not found

### Response Object
```json
{
  "facilityId": 1,
  "facilityName": "Kigali University Hospital"
}
```

---

## GET /api/facilities/{id}
Retrieve a specific facility by ID.

### Path Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | number | Yes | Facility ID |

### Status Codes
- **200** - Success
- **404** - Facility not found

### Response Object
```json
{
  "id": 1,
  "name": "Kigali University Hospital",
  "facilityType": "hospital",
  "districtId": 1
}
```

## Facility Types
- `hospital`
- `health_center`

## Error Response Format
```json
{
  "message": "Error description"
}
```