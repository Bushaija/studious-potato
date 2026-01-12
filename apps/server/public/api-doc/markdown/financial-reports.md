# Financial Reports API Documentation

## GET /api/financial-reports

Retrieves a paginated list of financial reports with optional filtering.

### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `projectId` | integer | No | Filter by project ID |
| `facilityId` | integer | No | Filter by facility ID |
| `reportingPeriodId` | integer | No | Filter by reporting period ID |
| `fiscalYear` | string | No | Filter by fiscal year |
| `status` | string | No | Filter by status (`draft`, `submitted`, `approved`, `rejected`) |
| `reportType` | string | No | Filter by report type (`revenue_expenditure`, `balance_sheet`, `cash_flow`, `budget_vs_actual`, `net_assets_changes`) |
| `createdBy` | integer | No | Filter by creator user ID |
| `fromDate` | string | No | Filter by creation date (from) |
| `toDate` | string | No | Filter by creation date (to) |
| `page` | integer | No | Page number (default: 1) |
| `limit` | integer | No | Items per page (default: 20) |

### Response

**Status Code:** 200 OK

```json
{
  "reports": [
    {
      "id": 123,
      "reportCode": "REP-2024-001",
      "title": "Q1 2024 Revenue Report",
      "projectId": 456,
      "facilityId": 789,
      "reportingPeriodId": 12,
      "version": "1.0",
      "fiscalYear": "2024",
      "status": "approved",
      "reportData": {},
      "metadata": {},
      "computedTotals": {},
      "validationResults": {},
      "createdBy": 101,
      "createdAt": "2024-01-15T10:00:00Z",
      "updatedBy": 102,
      "updatedAt": "2024-01-20T14:30:00Z",
      "submittedBy": 101,
      "submittedAt": "2024-01-18T09:00:00Z",
      "approvedBy": 103,
      "approvedAt": "2024-01-20T14:30:00Z",
      "project": {
        "id": 456,
        "name": "Healthcare Infrastructure",
        "code": "HI-2024",
        "projectType": "Infrastructure"
      },
      "facility": {
        "id": 789,
        "name": "Central Hospital",
        "facilityType": "Hospital",
        "district": {
          "id": 5,
          "name": "Kigali District"
        }
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8
  },
  "summary": {
    "totalReports": 150,
    "byStatus": {
      "draft": 25,
      "submitted": 30,
      "approved": 85,
      "rejected": 10
    },
    "byType": {
      "revenue_expenditure": 75,
      "balance_sheet": 40,
      "cash_flow": 35
    },
    "pendingApproval": 30
  }
}
```

---

## POST /api/financial-reports

Creates a new financial report.

### Request Body

```json
{
  "reportCode": "REP-2024-002",
  "title": "Q2 2024 Balance Sheet",
  "projectId": 456,
  "facilityId": 789,
  "reportingPeriodId": 13,
  "version": "1.0",
  "fiscalYear": "2024",
  "status": "draft",
  "reportData": {},
  "metadata": {},
  "computedTotals": {},
  "validationResults": {}
}
```

### Response

**Status Code:** 201 Created

```json
{
  "id": 124,
  "reportCode": "REP-2024-002",
  "title": "Q2 2024 Balance Sheet",
  "projectId": 456,
  "facilityId": 789,
  "reportingPeriodId": 13,
  "version": "1.0",
  "fiscalYear": "2024",
  "status": "draft",
  "reportData": {},
  "metadata": {},
  "computedTotals": {},
  "validationResults": {},
  "createdBy": 101,
  "createdAt": "2024-04-01T10:00:00Z",
  "updatedBy": 101,
  "updatedAt": "2024-04-01T10:00:00Z",
  "submittedBy": null,
  "submittedAt": null,
  "approvedBy": null,
  "approvedAt": null
}
```

**Status Code:** 400 Bad Request

```json
{
  "message": "Invalid financial report data"
}
```

---

## GET /api/financial-reports/{id}

Retrieves a specific financial report by ID.

### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | integer | Yes | Financial report ID |

### Response

**Status Code:** 200 OK

Returns the same structure as the individual report object in the list endpoint, including related `project`, `facility`, `reportingPeriod`, `creator`, `submitter`, and `approver` objects.

**Status Code:** 404 Not Found

```json
{
  "message": "Not Found"
}
```

---

## PUT /api/financial-reports/{id}

Updates an existing financial report.

### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | integer | Yes | Financial report ID |

### Request Body

Same structure as POST request (all fields optional for updates).

### Response

**Status Code:** 200 OK

Returns the updated report object.

**Status Code:** 404 Not Found

```json
{
  "message": "Not Found"
}
```

---

## DELETE /api/financial-reports/{id}

Deletes a financial report.

### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | integer | Yes | Financial report ID |

### Response

**Status Code:** 204 No Content

**Status Code:** 404 Not Found

```json
{
  "message": "Not Found"
}
```

---

## POST /api/financial-reports/generate

Generates a new financial report from a template.

### Request Body

```json
{
  "templateType": "revenue_expenditure",
  "projectId": 456,
  "facilityId": 789,
  "reportingPeriodId": 13,
  "fiscalYear": "2024",
  "title": "Generated Q2 Revenue Report",
  "includeComparatives": false,
  "customMappings": {},
  "generateFromPlanning": false,
  "generateFromExecution": true
}
```

### Response

**Status Code:** 201 Created

```json
{
  "report": {
    "id": 125,
    "reportCode": "REP-2024-003",
    "title": "Generated Q2 Revenue Report",
    "projectId": 456,
    "facilityId": 789,
    "reportingPeriodId": 13,
    "version": "1.0",
    "fiscalYear": "2024",
    "status": "draft",
    "reportData": {},
    "metadata": {},
    "computedTotals": {},
    "validationResults": {},
    "createdBy": 101,
    "createdAt": "2024-04-01T11:00:00Z",
    "updatedBy": 101,
    "updatedAt": "2024-04-01T11:00:00Z"
  },
  "generationSummary": {
    "linesProcessed": 150,
    "valuesComputed": 89,
    "validationErrors": [],
    "warnings": [
      "Some comparative data not available"
    ]
  }
}
```

**Status Code:** 400 Bad Request

```json
{
  "message": "Invalid report generation parameters",
  "errors": [
    "Project not found",
    "Invalid template type"
  ]
}
```

---

## POST /api/financial-reports/{id}/validate

Validates a financial report against business rules and accounting principles.

### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | integer | Yes | Financial report ID |

### Request Body

```json
{
  "reportId": 123,
  "validationType": "all"
}
```

### Response

**Status Code:** 200 OK

```json
{
  "reportId": 123,
  "isValid": false,
  "validationResults": {
    "accountingEquation": {
      "isValid": true,
      "leftSide": 1000000,
      "rightSide": 1000000,
      "difference": 0
    },
    "completeness": {
      "isValid": false,
      "missingFields": [
        "totalAssets",
        "retainedEarnings"
      ],
      "completionPercentage": 85.5
    },
    "businessRules": {
      "isValid": true,
      "violations": []
    }
  },
  "errors": [
    "Missing required field: totalAssets"
  ],
  "warnings": [
    "Some line items have zero values"
  ]
}
```

---

## GET /api/financial-reports/{id}/export/{format}

Exports a financial report in the specified format.

### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | Yes | Financial report ID |
| `format` | string | Yes | Export format (`pdf`, `excel`, `csv`) |

### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `includeComparatives` | boolean | No | Include comparative data |
| `template` | string | No | Template to use for export |

### Response

**Status Code:** 200 OK

Returns binary data in the requested format:
- PDF: `application/pdf`
- Excel: `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
- CSV: `text/csv`

**Status Code:** 404 Not Found

```json
{
  "message": "Not Found"
}
```