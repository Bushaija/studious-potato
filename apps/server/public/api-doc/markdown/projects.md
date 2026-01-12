# Projects API Documentation

## Endpoints Overview

The Projects API provides full CRUD operations for managing project records with related facility, user, and reporting period data.

---

## GET /api/projects

Retrieve a list of projects with optional filtering.

### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `projectType` | string | No | Filter by project type (`HIV`, `Malaria`, `TB`) |
| `facilityId` | integer | No | Filter by facility ID |
| `status` | string | No | Filter by project status |
| `userId` | integer | No | Filter by assigned user ID |

### Response

**Status Code:** `200 OK`

```json
[
  {
    "id": 1,
    "name": "HIV Prevention Program",
    "status": "ACTIVE",
    "code": "HIV001",
    "description": "Community-based HIV prevention initiative",
    "projectType": "HIV",
    "facilityId": 1,
    "facility": {
      "id": 1,
      "name": "Kigali Hospital",
      "facilityType": "hospital",
      "districtId": 1
    },
    "reportingPeriodId": 1,
    "reportingPeriod": {
      "id": 1,
      "year": 2024,
      "periodType": "quarterly",
      "startDate": "2024-01-01",
      "endDate": "2024-03-31",
      "status": "active"
    },
    "userId": 1,
    "user": {
      "id": 1,
      "name": "John Doe",
      "email": "john.doe@example.com",
      "role": "program_manager"
    },
    "metadata": {},
    "createdAt": "2024-01-01T00:00:00Z",
    "updatedAt": "2024-01-01T00:00:00Z"
  }
]
```

---

## POST /api/projects

Create a new project.

### Request Body

```json
{
  "name": "HIV Prevention Program",
  "status": "ACTIVE",
  "code": "HIV001",
  "description": "Community-based HIV prevention initiative",
  "projectType": "HIV",
  "facilityId": 1,
  "reportingPeriodId": 1,
  "userId": 1,
  "metadata": {}
}
```

**Required fields:** `name`, `code`, `projectType`, `facilityId`, `userId`

**Field constraints:**
- `name`: max 200 characters
- `status`: max 20 characters, defaults to "ACTIVE"
- `code`: max 10 characters
- `projectType`: must be `HIV`, `Malaria`, or `TB`

### Response

**Status Code:** `201 Created`

Returns the created project object (same structure as GET response item).

**Status Code:** `400 Bad Request`

```json
{
  "message": "Invalid project data"
}
```

**Status Code:** `409 Conflict`

```json
{
  "message": "Project with this name or code already exists"
}
```

---

## GET /api/projects/{id}

Retrieve a specific project by ID.

### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | number | Yes | Project ID |

### Response

**Status Code:** `200 OK`

Returns a single project object (same structure as POST 201 response).

**Status Code:** `404 Not Found`

```json
{
  "message": "Not Found"
}
```

---

## PUT /api/projects/{id}

Update an entire project (full replacement).

### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | number | Yes | Project ID |

### Request Body

```json
{
  "name": "Updated HIV Prevention Program",
  "status": "ACTIVE",
  "code": "HIV001",
  "description": "Updated description",
  "projectType": "HIV",
  "facilityId": 1,
  "reportingPeriodId": 1,
  "userId": 1,
  "metadata": {}
}
```

**Required fields:** `name`, `code`, `projectType`, `facilityId`, `userId`

### Response

**Status Code:** `200 OK`

Returns the updated project object.

**Status Code:** `400 Bad Request`

```json
{
  "message": "Invalid project data"
}
```

**Status Code:** `404 Not Found`

```json
{
  "message": "Not Found"
}
```

---

## PATCH /api/projects/{id}

Partially update a project (only specified fields).

### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | number | Yes | Project ID |

### Request Body

```json
{
  "status": "INACTIVE",
  "description": "Updated description only"
}
```

**All fields are optional** - only include fields you want to update.

### Response

**Status Code:** `200 OK`

Returns the updated project object.

**Status Code:** `400 Bad Request`

```json
{
  "message": "Invalid project data"
}
```

**Status Code:** `404 Not Found`

```json
{
  "message": "Not Found"
}
```

---

## DELETE /api/projects/{id}

Delete a project.

### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | number | Yes | Project ID |

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
  "message": "Cannot delete project with existing data"
}
```

---

## Data Models

### Project Object

| Field | Type | Nullable | Description |
|-------|------|----------|-------------|
| `id` | integer | No | Unique identifier |
| `name` | string | No | Project name (max 200 chars) |
| `status` | string | No | Project status (max 20 chars) |
| `code` | string | No | Project code (max 10 chars) |
| `description` | string | Yes | Project description |
| `projectType` | string | No | Type: `HIV`, `Malaria`, `TB` |
| `facilityId` | integer | No | Associated facility ID |
| `facility` | object | No | Facility details |
| `reportingPeriodId` | integer | Yes | Reporting period ID |
| `reportingPeriod` | object | Yes | Reporting period details |
| `userId` | integer | No | Assigned user ID |
| `user` | object | No | User details |
| `metadata` | object | Yes | Additional metadata |
| `createdAt` | string | No | Creation timestamp |
| `updatedAt` | string | No | Last update timestamp |

### Facility Object

| Field | Type | Description |
|-------|------|-------------|
| `id` | integer | Facility ID |
| `name` | string | Facility name |
| `facilityType` | string | Type: `hospital`, `health_center` |
| `districtId` | integer | District ID |

### Reporting Period Object

| Field | Type | Description |
|-------|------|-------------|
| `id` | integer | Period ID |
| `year` | integer | Year |
| `periodType` | string | Type of period |
| `startDate` | string | Start date (ISO format) |
| `endDate` | string | End date (ISO format) |
| `status` | string | Period status |

### User Object

| Field | Type | Description |
|-------|------|-------------|
| `id` | integer | User ID |
| `name` | string | User full name |
| `email` | string | User email address |
| `role` | string | Role: `accountant`, `admin`, `program_manager` |