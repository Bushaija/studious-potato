# Dashboard API Documentation

## Get Dashboard Summary

**GET** `/api/dashboard/summary`

Retrieve comprehensive dashboard statistics including facilities, projects, reports, and system alerts.

### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `facilityId` | number | No | Filter data by specific facility |
| `projectId` | number | No | Filter data by specific project |
| `reportingPeriodId` | number | No | Filter data by reporting period |

### Response

**200 OK**
```json
{
  "facilities": {
    "total": 150,
    "byType": {
      "hospital": 45,
      "clinic": 80,
      "laboratory": 25
    },
    "byDistrict": {
      "Kigali": 60,
      "Eastern": 35,
      "Western": 30,
      "Northern": 25
    }
  },
  "projects": {
    "total": 75,
    "byType": {
      "infrastructure": 25,
      "equipment": 30,
      "training": 20
    },
    "byStatus": {
      "active": 45,
      "completed": 20,
      "planned": 10
    }
  },
  "reports": {
    "total": 320,
    "byStatus": {
      "draft": 45,
      "submitted": 120,
      "approved": 140,
      "rejected": 15
    },
    "pendingApproval": 25,
    "recentlySubmitted": [
      {
        "id": 1001,
        "reportCode": "RPT-2024-001",
        "title": "Q1 Financial Report",
        "projectName": "Healthcare Infrastructure",
        "facilityName": "Kigali Central Hospital",
        "fiscalYear": "2024",
        "status": "submitted",
        "createdBy": "John Doe",
        "createdAt": "2024-01-15T09:00:00Z",
        "submittedAt": "2024-01-15T14:30:00Z"
      }
    ]
  },
  "alerts": [
    {
      "id": 501,
      "type": "warning",
      "title": "Pending Reports",
      "message": "5 reports are overdue for submission",
      "severity": "medium",
      "entityType": "report",
      "entityId": 1002,
      "createdAt": "2024-01-15T08:00:00Z"
    },
    {
      "id": 502,
      "type": "error",
      "title": "System Issue",
      "message": "Database connection timeout detected",
      "severity": "high",
      "entityType": "system",
      "entityId": null,
      "createdAt": "2024-01-15T10:15:00Z"
    }
  ]
}
```

**400 Bad Request**
```json
{
  "message": "Invalid query parameters"
}
```

---

## Response Structure

### Facilities Object

| Field | Type | Description |
|-------|------|-------------|
| `total` | number | Total number of facilities |
| `byType` | object | Facility count grouped by type |
| `byDistrict` | object | Facility count grouped by district |

### Projects Object

| Field | Type | Description |
|-------|------|-------------|
| `total` | number | Total number of projects |
| `byType` | object | Project count grouped by type |
| `byStatus` | object | Project count grouped by status |

### Reports Object

| Field | Type | Description |
|-------|------|-------------|
| `total` | number | Total number of reports |
| `byStatus` | object | Report count grouped by status |
| `pendingApproval` | number | Number of reports pending approval |
| `recentlySubmitted` | array | Array of recently submitted reports |

### Recent Report Object

| Field | Type | Description |
|-------|------|-------------|
| `id` | number | Report identifier |
| `reportCode` | string | Unique report code |
| `title` | string | Report title |
| `projectName` | string | Associated project name |
| `facilityName` | string | Associated facility name |
| `fiscalYear` | string | Fiscal year |
| `status` | string | Report status |
| `createdBy` | string | Report creator |
| `createdAt` | string | Creation timestamp (ISO 8601) |
| `submittedAt` | string | Submission timestamp (ISO 8601) |

### Report Statuses

| Status | Description |
|--------|-------------|
| `draft` | Report is being edited |
| `submitted` | Report submitted for review |
| `approved` | Report has been approved |
| `rejected` | Report was rejected |

### Alert Object

| Field | Type | Description |
|-------|------|-------------|
| `id` | number | Alert identifier |
| `type` | string | Alert type |
| `title` | string | Alert title |
| `message` | string | Alert message |
| `severity` | string | Alert severity level |
| `entityType` | string | Related entity type |
| `entityId` | number | Related entity ID |
| `createdAt` | string | Alert creation timestamp (ISO 8601) |

### Alert Types

| Type | Description |
|------|-------------|
| `warning` | Warning alert |
| `error` | Error alert |
| `info` | Informational alert |

### Alert Severity Levels

| Level | Description |
|-------|-------------|
| `low` | Low priority alert |
| `medium` | Medium priority alert |
| `high` | High priority alert |
| `critical` | Critical priority alert |

---

## Usage Examples

### Get overall dashboard summary
```
GET /api/dashboard/summary
```

### Get dashboard data for specific facility
```
GET /api/dashboard/summary?facilityId=42
```

### Get dashboard data for specific project and reporting period
```
GET /api/dashboard/summary?projectId=15&reportingPeriodId=2024
```