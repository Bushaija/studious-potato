# Reporting Periods API Documentation

## Endpoints Overview

The Reporting Periods API manages time periods for data collection and reporting, including current period tracking and statistics.

---

## GET /api/reporting-periods/current

Get the currently active reporting period.

### Response

**Status Code:** `200 OK`

```json
{
  "id": 1,
  "year": 2024,
  "periodType": "quarterly",
  "startDate": "2024-01-01",
  "endDate": "2024-03-31",
  "status": "ACTIVE",
  "createdAt": "2024-01-01T00:00:00Z",
  "updatedAt": "2024-01-01T00:00:00Z"
}
```

**Status Code:** `404 Not Found`

```json
{
  "message": "No current active reporting period found"
}
```

---

## GET /api/reporting-periods/stats

Get statistics about reporting periods.

### Response

**Status Code:** `200 OK`

```json
{
  "totalPeriods": 24,
  "activePeriods": 4,
  "yearRange": {
    "earliest": 2020,
    "latest": 2024
  },
  "periodTypeDistribution": {
    "quarterly": 16,
    "annual": 6,
    "monthly": 2
  }
}
```

---

## GET /api/reporting-periods

Retrieve a list of reporting periods with filtering and pagination.

### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `year` | string | No | Filter by specific year |
| `periodType` | string | No | Filter by period type |
| `status` | string | No | Filter by status |
| `startYear` | string | No | Filter periods from this year onwards |
| `endYear` | string | No | Filter periods up to this year |
| `limit` | string | No | Number of items to return |
| `offset` | string | No | Number of items to skip |

### Response

**Status Code:** `200 OK`

```json
{
  "data": [
    {
      "id": 1,
      "year": 2024,
      "periodType": "quarterly",
      "startDate": "2024-01-01",
      "endDate": "2024-03-31",
      "status": "ACTIVE",
      "createdAt": "2024-01-01T00:00:00Z",
      "updatedAt": "2024-01-01T00:00:00Z"
    }
  ],
  "pagination": {
    "total": 50,
    "limit": 20,
    "offset": 0,
    "hasMore": true
  }
}
```

---

## POST /api/reporting-periods

Create a new reporting period.

### Request Body

```json
{
  "year": 2024,
  "periodType": "ANNUAL",
  "startDate": "2024-01-01",
  "endDate": "2024-12-31",
  "status": "ACTIVE"
}
```

**Required fields:** `year`, `startDate`, `endDate`

**Field constraints:**
- `year`: integer between 2020-2050
- `periodType`: defaults to "ANNUAL"
- `startDate`/`endDate`: YYYY-MM-DD format
- `status`: defaults to "ACTIVE"

### Response

**Status Code:** `201 Created`

Returns the created reporting period object.

**Status Code:** `409 Conflict`

```json
{
  "message": "Reporting period already exists for the given year and period type",
  "conflictField": "year_periodType"
}
```

---

## GET /api/reporting-periods/{id}

Retrieve a specific reporting period by ID.

### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | number | Yes | Reporting period ID |

### Response

**Status Code:** `200 OK`

Returns a single reporting period object.

**Status Code:** `404 Not Found`

```json
{
  "message": "Not Found"
}
```

---

## PATCH /api/reporting-periods/{id}

Partially update a reporting period.

### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | number | Yes | Reporting period ID |

### Request Body

```json
{
  "status": "INACTIVE",
  "endDate": "2024-06-30"
}
```

**All fields are optional** - same constraints as POST request.

### Response

**Status Code:** `200 OK`

Returns the updated reporting period object.

**Status Code:** `404 Not Found`

```json
{
  "message": "Not Found"
}
```

**Status Code:** `409 Conflict`

```json
{
  "message": "Update would create a conflict",
  "conflictField": "year_periodType"
}
```

---

## DELETE /api/reporting-periods/{id}

Delete a reporting period.

### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | number | Yes | Reporting period ID |

### Response

**Status Code:** `204 No Content`

**Status Code:** `404 Not Found`

```json
{
  "message": "Not Found"
}
```

**Status Code:** `409 Conflict`

```json
{
  "message": "Cannot delete reporting period due to existing dependencies",
  "relatedEntities": ["projects", "planning_data"]
}
```

---

## GET /api/reporting-periods/year/{year}

Get all reporting periods for a specific year.

### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `year` | string | Yes | Year to filter by |

### Response

**Status Code:** `200 OK`

```json
[
  {
    "id": 1,
    "year": 2024,
    "periodType": "quarterly",
    "startDate": "2024-01-01",
    "endDate": "2024-03-31",
    "status": "ACTIVE",
    "createdAt": "2024-01-01T00:00:00Z",
    "updatedAt": "2024-01-01T00:00:00Z"
  },
  {
    "id": 2,
    "year": 2024,
    "periodType": "quarterly",
    "startDate": "2024-04-01",
    "endDate": "2024-06-30",
    "status": "ACTIVE",
    "createdAt": "2024-04-01T00:00:00Z",
    "updatedAt": "2024-04-01T00:00:00Z"
  }
]
```

---

## Data Models

### Reporting Period Object

| Field | Type | Description |
|-------|------|-------------|
| `id` | integer | Unique identifier |
| `year` | integer | Year (2020-2050) |
| `periodType` | string | Type of period (quarterly, annual, etc.) |
| `startDate` | string | Start date (YYYY-MM-DD format) |
| `endDate` | string | End date (YYYY-MM-DD format) |
| `status` | string | Current status |
| `createdAt` | string | Creation timestamp |
| `updatedAt` | string | Last update timestamp |

### Statistics Object

| Field | Type | Description |
|-------|------|-------------|
| `totalPeriods` | number | Total number of periods |
| `activePeriods` | number | Number of active periods |
| `yearRange` | object | Earliest and latest years |
| `periodTypeDistribution` | object | Count by period type |

### Pagination Object

| Field | Type | Description |
|-------|------|-------------|
| `total` | number | Total number of items |
| `limit` | number | Items per page |
| `offset` | number | Items skipped |
| `hasMore` | boolean | Whether more items exist |  